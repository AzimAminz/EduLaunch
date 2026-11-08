import { describe, expect, it } from 'vitest';
import { readFrom, trail, withFrom } from './trail';

const labels = { home: 'Laman utama', tasks: 'Peti tugasan', institutions: 'Institusi', programmes: 'Program' };
const utem = { id: 'i1', name: 'UTeM' };

describe('trail', () => {
  it('accepts only addresses inside the admin console', () => {
    expect(readFrom('/ms/admin/program?halaman=2', 'ms')).toBe('/ms/admin/program?halaman=2');
    expect(readFrom('/ms/admin', 'ms')).toBe('/ms/admin');
    expect(readFrom('https://evil.example/ms/admin', 'ms')).toBeNull();
    expect(readFrom('//evil.example', 'ms')).toBeNull();
    expect(readFrom('/ms/teroka', 'ms')).toBeNull();
    expect(readFrom(undefined, 'ms')).toBeNull();
  });

  it('adds the return address to a link, keeping its own query', () => {
    expect(withFrom('/ms/admin/program/p1', '/ms/admin/program?halaman=2')).toBe('/ms/admin/program/p1?dari=%2Fms%2Fadmin%2Fprogram%3Fhalaman%3D2');
    expect(withFrom('/ms/admin/program/p1?tab=syarat', '/ms/admin')).toBe('/ms/admin/program/p1?tab=syarat&dari=%2Fms%2Fadmin');
    expect(withFrom('/ms/admin/program/p1', null)).toBe('/ms/admin/program/p1');
  });

  it('goes back to the programme list, page and filters included, when that is where the admin came from', () => {
    expect(trail({ locale: 'ms', from: '/ms/admin/program?status=draft&halaman=3', labels, institution: utem })).toEqual([{ label: 'Program', href: '/ms/admin/program?status=draft&halaman=3' }]);
  });

  it('goes back through the institution, to the exact tab and page the admin left', () => {
    expect(trail({ locale: 'ms', from: '/ms/admin/institusi/i1?tab=program&halaman=2', labels, institution: utem })).toEqual([
      { label: 'Institusi', href: '/ms/admin/institusi' },
      { label: 'UTeM', href: '/ms/admin/institusi/i1?tab=program&halaman=2' },
    ]);
  });

  it('falls back to the catalogue order when nothing says where the admin came from', () => {
    expect(trail({ locale: 'ms', from: null, labels, institution: utem })).toEqual([
      { label: 'Institusi', href: '/ms/admin/institusi' },
      { label: 'UTeM', href: '/ms/admin/institusi/i1?tab=program' },
    ]);
    expect(trail({ locale: 'ms', from: null, labels, institution: null })).toEqual([{ label: 'Program', href: '/ms/admin/program' }]);
  });

  it('goes back to the inbox or home', () => {
    expect(trail({ locale: 'ms', from: '/ms/admin/tugasan?tab=draf', labels, institution: utem })[0]).toEqual({ label: 'Peti tugasan', href: '/ms/admin/tugasan?tab=draf' });
    expect(trail({ locale: 'ms', from: '/ms/admin', labels, institution: utem })[0]).toEqual({ label: 'Laman utama', href: '/ms/admin' });
  });
});
