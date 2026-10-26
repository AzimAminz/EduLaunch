import { describe, expect, it } from 'vitest';
import en from '../../dictionaries/en.json';
import ms from '../../dictionaries/ms.json';
import { format, localizedPath, pickLocale } from './locale';

function keys(obj: unknown, prefix = ''): string[] {
  if (typeof obj !== 'object' || obj === null) return [prefix];
  return Object.entries(obj).flatMap(([k, v]) => keys(v, prefix ? `${prefix}.${k}` : k));
}

function placeholders(obj: unknown): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  const walk = (o: unknown, p: string) => {
    if (typeof o === 'string') out[p] = (o.match(/\{\w+\}/g) ?? []).sort();
    else if (o && typeof o === 'object') for (const [k, v] of Object.entries(o)) walk(v, p ? `${p}.${k}` : k);
  };
  walk(obj, '');
  return out;
}

describe('dictionaries', () => {
  it('have exactly the same keys in Bahasa Melayu and English', () => {
    expect(keys(en).sort()).toEqual(keys(ms).sort());
  });

  it('use the same {placeholders} in both languages', () => {
    expect(placeholders(en)).toEqual(placeholders(ms));
  });

  it('have no empty text', () => {
    const empty = (d: unknown): boolean => (typeof d === 'string' ? d.trim() === '' : Object.values(d as object).some(empty));
    expect(empty(ms)).toBe(false);
    expect(empty(en)).toBe(false);
  });
});

describe('pickLocale', () => {
  it('prefers the language the user chose before (cookie)', () => {
    expect(pickLocale('en', 'ms-MY,ms;q=0.9')).toBe('en');
  });

  it('otherwise follows the browser language', () => {
    expect(pickLocale(undefined, 'en-GB,en;q=0.9')).toBe('en');
    expect(pickLocale(undefined, 'ms-MY,en;q=0.5')).toBe('ms');
    expect(pickLocale(undefined, 'id-ID,en;q=0.5')).toBe('en');
  });

  it('falls back to Bahasa Melayu', () => {
    expect(pickLocale(undefined, undefined)).toBe('ms');
    expect(pickLocale('fr', 'zh-CN')).toBe('ms');
  });
});

describe('localizedPath', () => {
  it('swaps the language at the start of a path', () => {
    expect(localizedPath('/ms/teroka/abc', 'en')).toBe('/en/teroka/abc');
    expect(localizedPath('/en', 'ms')).toBe('/ms');
    expect(localizedPath('/teroka', 'en')).toBe('/en/teroka');
  });
});

describe('format', () => {
  it('fills {placeholders}', () => {
    expect(format('{count} program dijumpai', { count: 14 })).toBe('14 program dijumpai');
    expect(format('Halaman {page} daripada {pages}', { page: 1, pages: 3 })).toBe('Halaman 1 daripada 3');
  });
});
