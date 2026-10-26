import { describe, expect, it } from 'vitest';
import { listParamEntries, pageOf, readListParams } from './list-params';

const sorts = ['name', 'updated'] as const;

describe('readListParams', () => {
  it('reads sort, direction and page from the address', () => {
    expect(readListParams({ susun: 'updated', arah: 'desc', halaman: '3' }, sorts, 'name')).toEqual({ sort: 'updated', direction: 'desc', page: 3 });
  });

  it('falls back to the defaults for unknown or broken values', () => {
    expect(readListParams({ susun: 'drop table', arah: 'up', halaman: '-2' }, sorts, 'name')).toEqual({ sort: 'name', direction: 'asc', page: 1 });
    expect(readListParams({ halaman: 'abc' }, sorts, 'name').page).toBe(1);
  });
});

describe('listParamEntries', () => {
  it('leaves the defaults out of the address', () => {
    expect(listParamEntries({ sort: 'name', direction: 'asc', page: 1 }, 'name')).toEqual([]);
    expect(listParamEntries({ sort: 'updated', direction: 'desc', page: 2 }, 'name')).toEqual([
      ['susun', 'updated'],
      ['arah', 'desc'],
      ['halaman', '2'],
    ]);
  });
});

describe('pageOf', () => {
  it('cuts one page and keeps a page past the end on the last page', () => {
    const items = Array.from({ length: 25 }, (_, i) => i);
    expect(pageOf(items, 2, 10)).toEqual({ items: [10, 11, 12, 13, 14, 15, 16, 17, 18, 19], page: 2 });
    expect(pageOf(items, 9, 10)).toEqual({ items: [20, 21, 22, 23, 24], page: 3 });
    expect(pageOf([], 4, 10)).toEqual({ items: [], page: 1 });
  });
});
