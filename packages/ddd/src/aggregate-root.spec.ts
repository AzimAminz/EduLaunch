import { describe, expect, it } from 'vitest';
import { AggregateRoot } from './aggregate-root.js';
import { createEvent } from './domain-event.js';
import { Result, DomainError } from './result.js';

class Counter extends AggregateRoot<string, { value: number }> {
  static start(id: string) {
    return new Counter(id, { value: 0 });
  }
  increment() {
    this.props.value += 1;
    this.record(createEvent('test.counter.incremented', { value: this.props.value }));
  }
}

describe('AggregateRoot', () => {
  it('collects events and hands them out once', () => {
    const c = Counter.start('c1');
    c.increment();
    c.increment();
    expect(c.pullEvents().map((e) => e.payload)).toEqual([{ value: 1 }, { value: 2 }]);
    expect(c.pullEvents()).toEqual([]);
  });

  it('compares entities by identity', () => {
    expect(Counter.start('a').equals(Counter.start('a'))).toBe(true);
    expect(Counter.start('a').equals(Counter.start('b'))).toBe(false);
  });
});

describe('Result', () => {
  it('wraps success and failure', () => {
    expect(Result.ok(1)).toEqual({ ok: true, value: 1 });
    const failed = Result.fail(new DomainError('x', 'nope'));
    expect(failed.ok).toBe(false);
  });
});
