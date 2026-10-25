/** An object defined by its identity rather than its attributes. */
export abstract class Entity<TId, TProps extends object> {
  protected constructor(
    public readonly id: TId,
    protected props: TProps,
  ) {}

  equals(other: Entity<TId, TProps> | undefined): boolean {
    return other !== undefined && other.constructor === this.constructor && other.id === this.id;
  }

  /** Plain copy of the state, for persistence mappers and DTOs. */
  toSnapshot(): Readonly<TProps> & { id: TId } {
    return { id: this.id, ...this.props };
  }
}
