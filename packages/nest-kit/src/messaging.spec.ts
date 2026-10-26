import { EventEmitter } from 'node:events';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createEvent } from '@edulaunch/ddd';

// A fake amqplib: connect() resolves at once; the test decides when the broker "comes up".
const broker = vi.hoisted(() => ({ setup: undefined as undefined | ((model: unknown) => Promise<void>), waitForConnect: vi.fn(), options: undefined as unknown }));

vi.mock('amqplib', () => ({
  connect: vi.fn(async (_url: string, opts: { recovery: { setup: (m: unknown) => Promise<void> } }) => {
    broker.setup = opts.recovery.setup;
    broker.options = opts.recovery;
    return Object.assign(new EventEmitter(), { waitForConnect: broker.waitForConnect, close: vi.fn() });
  }),
}));

const { RabbitMqEventBus } = await import('./messaging.js');

function liveConnection() {
  const channel = { assertExchange: vi.fn(), publish: vi.fn(() => true), assertQueue: vi.fn(), bindQueue: vi.fn(), prefetch: vi.fn(), consume: vi.fn() };
  return { model: { createChannel: vi.fn(async () => channel) }, channel };
}

describe('RabbitMqEventBus', () => {
  beforeEach(() => {
    broker.setup = undefined;
    broker.waitForConnect.mockReset();
  });

  it('starts without waiting for the broker, so the service can open its port', async () => {
    const bus = new RabbitMqEventBus('amqp://localhost', 'test');
    await bus.onModuleInit();
    expect(broker.waitForConnect).not.toHaveBeenCalled();
    // amqplib's connect() itself waits unless told not to (default waitForConnect: true).
    expect(broker.options).toMatchObject({ waitForConnect: false });
  });

  it('keeps events published while the broker is down and sends them in order once it connects', async () => {
    const bus = new RabbitMqEventBus('amqp://localhost', 'test');
    await bus.onModuleInit();
    await bus.publish([createEvent('a.thing.happened', { n: 1 }), createEvent('a.thing.happened', { n: 2 })]);

    const { model, channel } = liveConnection();
    await broker.setup!(model);

    expect(channel.publish).toHaveBeenCalledTimes(2);
    const sent = channel.publish.mock.calls.map((c) => JSON.parse((c as unknown as [string, string, Buffer])[2].toString()).payload.n);
    expect(sent).toEqual([1, 2]);
  });

  it('publishes straight away when already connected', async () => {
    const bus = new RabbitMqEventBus('amqp://localhost', 'test');
    await bus.onModuleInit();
    const { model, channel } = liveConnection();
    await broker.setup!(model);

    await bus.publish([createEvent('a.thing.happened', { n: 3 })]);
    expect(channel.publish).toHaveBeenCalledTimes(1);
  });

  it('drops the oldest events beyond the buffer limit instead of using unbounded memory', async () => {
    const bus = new RabbitMqEventBus('amqp://localhost', 'test', 2);
    await bus.onModuleInit();
    await bus.publish([1, 2, 3].map((n) => createEvent('a.thing.happened', { n })));

    const { model, channel } = liveConnection();
    await broker.setup!(model);
    const sent = channel.publish.mock.calls.map((c) => JSON.parse((c as unknown as [string, string, Buffer])[2].toString()).payload.n);
    expect(sent).toEqual([2, 3]);
  });
});
