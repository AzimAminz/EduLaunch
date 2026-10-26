import { describe, expect, it } from 'vitest';
import { filtersToQuery, parseFilters } from './search-params';

const UNI = '6f1c2a4e-1d3b-5c8e-9a2f-0b1c2d3e4f50';
const FIELD = '0a1b2c3d-4e5f-5a6b-8c7d-8e9f0a1b2c3d';

describe('parseFilters', () => {
  it('reads valid filters from the address bar', () => {
    expect(parseFilters({ institutionId: UNI, fieldId: FIELD, studyLevel: 'diploma', q: ' komputer ', page: '2' })).toEqual({
      institutionId: UNI,
      fieldId: FIELD,
      studyLevel: 'diploma',
      q: 'komputer',
      page: 2,
    });
  });

  it('ignores anything invalid instead of failing the page', () => {
    expect(parseFilters({ institutionId: 'abc', studyLevel: 'phd', page: '-3', q: '' })).toEqual({ page: 1 });
  });

  it('takes the first value when a parameter is repeated', () => {
    expect(parseFilters({ studyLevel: ['degree', 'diploma'] })).toEqual({ studyLevel: 'degree', page: 1 });
  });
});

describe('filtersToQuery', () => {
  it('builds the query string for the API and links, leaving out empty filters and page 1', () => {
    expect(filtersToQuery({ studyLevel: 'diploma', page: 1 })).toBe('studyLevel=diploma');
    expect(filtersToQuery({ institutionId: UNI, page: 3 })).toBe(`institutionId=${UNI}&page=3`);
    expect(filtersToQuery({ page: 1 })).toBe('');
  });
});
