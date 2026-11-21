import { describe, expect, it } from 'vitest';
import { differs, pickCompared } from './selection';

const a = '11111111-1111-4111-8111-111111111111';
const b = '22222222-2222-4222-8222-222222222222';
const c = '33333333-3333-4333-8333-333333333333';
const d = '44444444-4444-4444-8444-444444444444';

describe('pickCompared', () => {
  it('takes the newest three saved programmes when none are asked for', () => {
    expect(pickCompared(undefined, [a, b, c, d])).toEqual({ ids: [a, b, c], tooMany: false });
  });

  it('reads both ?p=a,b and ?p=a&p=b, without repeats', () => {
    expect(pickCompared(`${a},${b}`, [a, b, c])).toEqual({ ids: [a, b], tooMany: false });
    expect(pickCompared([a, b, a], [a, b, c])).toEqual({ ids: [a, b], tooMany: false });
  });

  it('keeps only saved programmes and well-formed ids', () => {
    expect(pickCompared([a, d, 'not-an-id'], [a, b, c])).toEqual({ ids: [a], tooMany: false });
  });

  it('stops at three and says so', () => {
    expect(pickCompared([a, b, c, d], [a, b, c, d])).toEqual({ ids: [a, b, c], tooMany: true });
  });
});

describe('differs', () => {
  it('is true when known values are not all the same', () => {
    expect(differs(['3 tahun', '4 tahun'])).toBe(true);
    expect(differs(['UTM', 'utm'])).toBe(false);
    expect(differs(['3 tahun', null])).toBe(false);
  });
});
