import { DynamicModule, Global, Injectable, Logger, Module, OnApplicationShutdown, OnModuleInit } from '@nestjs/common';
import type { DomainEvent, EventPublisher } from '@edulaunch/ddd';
import { connect, type Channel, type ChannelModel, type RecoveringChannelModel } from 'amqplib';

export const EVENT_BUS = Symbol('EVENT_BUS');
export const EXCHANGE = 'edulaunch.events';

export type EventHandler = (event: DomainEvent) => Promise<void>;

/** Publishes and consumes domain events. Swappable so tests and broker-less runs still work. */
export abstract class EventBus implements EventPublisher {
  abstract publish(events: DomainEvent[]): Promise<void>;
  /** Durable queue `<service>.<name>` bound to the routing patterns, for example `catalogue.requirement.*`. */
  abstract subscribe(name: string, patterns: string[], handler: EventHandler): Promise<void>;
}

/**
 * RabbitMQ topic exchange with automatic reconnect.
 * The service starts even when RabbitMQ is down; events published meanwhile wait in memory
 * (up to `maxBuffered`, oldest dropped first) and are sent as soon as the connection is up.
 */
@Injectable()
export class RabbitMqEventBus extends EventBus implements OnModuleInit, OnApplicationShutdown {
  private readonly logger = new Logger('EventBus');
  private model?: RecoveringChannelModel;
  private live?: ChannelModel;
  private publishChannel?: Channel;
  private readonly subscriptions: Array<{ name: string; patterns: string[]; handler: EventHandler }> = [];
  private readonly pending: DomainEvent[] = [];

  constructor(
    private readonly url: string,
    private readonly serviceName: string,
    private readonly maxBuffered = 1000,
  ) {
    super();
  }

  async onModuleInit(): Promise<void> {
    this.model = await connect(this.url, {
      recovery: {
        initialDelay: 500,
        maxDelay: 10_000,
        factor: 2,
        jitter: 0.2,
        maxRetries: Infinity,
        // amqplib waits for the first connection by default; the HTTP port must open even without RabbitMQ.
        waitForConnect: false,
        // Runs after every (re)connect with the live connection; `this.model` is not set yet on the first one.
        setup: async (live: ChannelModel) => {
          this.live = live;
          this.publishChannel = await live.createChannel();
          await this.publishChannel.assertExchange(EXCHANGE, 'topic', { durable: true });
          for (const sub of this.subscriptions) await this.bind(sub.name, sub.patterns, sub.handler);
          this.logger.log(`Connected to RabbitMQ as ${this.serviceName}`);
          this.flush();
        },
      },
    });
    this.model.on('disconnect', (err: Error) => {
      this.publishChannel = undefined;
      this.live = undefined;
      this.logger.warn(`RabbitMQ disconnected (${err.message}); retrying in the background`);
    });
    this.model.on('connect-failed', (err: Error) => this.logger.warn(`RabbitMQ not reachable yet (${err.message}); retrying in the background`));
  }

  async publish(events: DomainEvent[]): Promise<void> {
    this.pending.push(...events);
    const overflow = this.pending.length - this.maxBuffered;
    if (overflow > 0) {
      this.pending.splice(0, overflow);
      this.logger.error(`RabbitMQ unavailable: dropped ${overflow} oldest event(s)`);
    }
    this.flush();
  }

  private flush(): void {
    if (!this.publishChannel) return;
    while (this.pending.length) {
      const event = this.pending.shift()!;
      this.publishChannel.publish(EXCHANGE, event.name, Buffer.from(JSON.stringify(event)), {
        persistent: true,
        contentType: 'application/json',
        appId: this.serviceName,
      });
    }
  }

  async subscribe(name: string, patterns: string[], handler: EventHandler): Promise<void> {
    this.subscriptions.push({ name, patterns, handler });
    if (this.publishChannel) await this.bind(name, patterns, handler);
  }

  private async bind(name: string, patterns: string[], handler: EventHandler): Promise<void> {
    if (!this.live) throw new Error('Event bus is not connected');
    const ch = await this.live.createChannel();
    const queue = `${this.serviceName}.${name}`;
    await ch.assertExchange(EXCHANGE, 'topic', { durable: true });
    await ch.assertQueue(queue, { durable: true });
    for (const p of patterns) await ch.bindQueue(queue, EXCHANGE, p);
    await ch.prefetch(10);
    await ch.consume(queue, async (msg) => {
      if (!msg) return;
      try {
        await handler(JSON.parse(msg.content.toString()) as DomainEvent);
        ch.ack(msg);
      } catch (err) {
        this.logger.error(`Handler ${queue} failed: ${err instanceof Error ? err.message : String(err)}`);
        ch.nack(msg, false, !msg.fields.redelivered);
      }
    });
  }

  async onApplicationShutdown(): Promise<void> {
    await this.model?.close();
  }
}

/** Used when RABBITMQ_URL is not set: logs events and delivers them in-process. */
@Injectable()
export class InMemoryEventBus extends EventBus {
  private readonly logger = new Logger('EventBus');
  private readonly subs: Array<{ patterns: RegExp[]; handler: EventHandler }> = [];
  readonly published: DomainEvent[] = [];

  async publish(events: DomainEvent[]): Promise<void> {
    for (const e of events) {
      this.published.push(e);
      this.logger.debug(`event ${e.name}`);
      for (const s of this.subs) if (s.patterns.some((p) => p.test(e.name))) await s.handler(e);
    }
  }

  async subscribe(_name: string, patterns: string[], handler: EventHandler): Promise<void> {
    const toRegex = (p: string) => new RegExp(`^${p.replace(/\./g, '\\.').replace(/\*/g, '[^.]+').replace(/#/g, '.*')}$`);
    this.subs.push({ patterns: patterns.map(toRegex), handler });
  }
}

@Global()
@Module({})
export class MessagingModule {
  static forRoot(options: { serviceName: string; url?: string }): DynamicModule {
    const bus = options.url
      ? { provide: EventBus, useFactory: () => new RabbitMqEventBus(options.url!, options.serviceName) }
      : { provide: EventBus, useClass: InMemoryEventBus };
    return { module: MessagingModule, providers: [bus, { provide: EVENT_BUS, useExisting: EventBus }], exports: [EventBus, EVENT_BUS] };
  }
}
