/**
 * Sorting and paging for admin lists, read from and written to the address (`?susun=updated&arah=desc&halaman=2&saiz=50`),
 * so a sorted page can be linked to and the back button works. Unknown values fall back to the defaults.
 */
export type Direction = 'asc' | 'desc';

export interface ListParams<S extends string> {
  sort: S;
  direction: Direction;
  page: number;
  pageSize: number;
}

/** The rows-per-page choices; the first matching the list's default is left out of the address. */
export const PAGE_SIZES = [10, 20, 50] as const;

type Raw = Record<string, string | string[] | undefined>;
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export function readListParams<S extends string>(raw: Raw, sorts: readonly S[], fallback: S, defaultSize = 20): ListParams<S> {
  const sort = sorts.find((s) => s === first(raw.susun)) ?? fallback;
  const direction: Direction = first(raw.arah) === 'desc' ? 'desc' : 'asc';
  const page = Number.parseInt(first(raw.halaman) ?? '', 10);
  const size = Number(first(raw.saiz));
  return {
    sort,
    direction,
    page: Number.isFinite(page) && page > 0 ? Math.min(page, 10_000) : 1,
    pageSize: (PAGE_SIZES as readonly number[]).includes(size) ? size : defaultSize,
  };
}

/** The address parameters for a list; the defaults are left out to keep links short. */
export function listParamEntries<S extends string>(p: ListParams<S>, fallback: S, defaultSize = 20): Array<[string, string]> {
  const out: Array<[string, string]> = [];
  if (p.sort !== fallback) out.push(['susun', p.sort]);
  if (p.direction !== 'asc') out.push(['arah', p.direction]);
  if (p.page > 1) out.push(['halaman', String(p.page)]);
  if (p.pageSize !== defaultSize) out.push(['saiz', String(p.pageSize)]);
  return out;
}

/** One page of an in-memory list (the last page when `page` runs past the end). */
export function pageOf<T>(items: T[], page: number, pageSize: number): { items: T[]; page: number } {
  const last = Math.max(1, Math.ceil(items.length / pageSize));
  const at = Math.min(page, last);
  return { items: items.slice((at - 1) * pageSize, at * pageSize), page: at };
}
