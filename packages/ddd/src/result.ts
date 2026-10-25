/** Expected business failure, as opposed to a bug. Mapped to a 4xx response at the edge. */
export class DomainError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'DomainError';
  }
}

export class NotFoundError extends DomainError {
  constructor(what: string, id: string) {
    super('not_found', `${what} ${id} was not found`);
  }
}

export type Result<T, E extends DomainError = DomainError> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: E };

export const Result = {
  ok<T>(value: T): Result<T, never> {
    return { ok: true, value };
  },
  fail<E extends DomainError>(error: E): Result<never, E> {
    return { ok: false, error };
  },
};
