export interface DomainEvent<TPayload extends object = object> {
  /** Routing key, for example `catalogue.requirement.published`. */
  readonly name: string;
  readonly occurredAt: string;
  readonly payload: TPayload;
}

export function createEvent<TPayload extends object>(name: string, payload: TPayload): DomainEvent<TPayload> {
  return { name, occurredAt: new Date().toISOString(), payload };
}

/** Port implemented by the messaging adapter (RabbitMQ in this project). */
export interface EventPublisher {
  publish(events: DomainEvent[]): Promise<void>;
}
