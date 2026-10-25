/** An immutable object defined only by its values. */
export abstract class ValueObject<TProps extends object> {
  protected readonly props: Readonly<TProps>;

  protected constructor(props: TProps) {
    this.props = Object.freeze({ ...props });
  }

  equals(other: ValueObject<TProps> | undefined): boolean {
    return other !== undefined && JSON.stringify(other.props) === JSON.stringify(this.props);
  }
}
