import { Entity } from './entity.js';
import type { DomainEvent } from './domain-event.js';

/** Consistency boundary. Collects domain events until a repository publishes them. */
export abstract class AggregateRoot<TId, TProps extends object> extends Entity<TId, TProps> {
  private readonly pendingEvents: DomainEvent[] = [];

  protected record(event: DomainEvent): void {
    this.pendingEvents.push(event);
  }

  pullEvents(): DomainEvent[] {
    return this.pendingEvents.splice(0, this.pendingEvents.length);
  }
}
