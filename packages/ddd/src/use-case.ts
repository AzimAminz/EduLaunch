/** One application operation. Controllers call use cases; use cases call domain objects and ports. */
export interface UseCase<TInput, TOutput> {
  execute(input: TInput): Promise<TOutput>;
}

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}
