import { describe, expect, it } from 'vitest';
import { guard, homeFor, nextFor, safeNext } from './routes';

const student = { role: 'student' as const };
const admin = { role: 'admin' as const };

describe('guard', () => {
  it('keeps the account pages open to everyone', () => {
    for (const page of ['log-masuk', 'daftar', 'lupa-kata-laluan', 'semak-emel', 'auth/callback']) expect(guard(`/ms/${page}`, null)).toBeNull();
  });

  it('keeps every portal page private: visitors log in first, then return to the page they wanted', () => {
    expect(guard('/ms/teroka', null)).toEqual({ redirect: '/ms/log-masuk?next=%2Fms%2Fteroka' });
    expect(guard('/en/teroka/abc', null)).toEqual({ redirect: '/en/log-masuk?next=%2Fen%2Fteroka%2Fabc' });
    expect(guard('/ms/mula', null)).toEqual({ redirect: '/ms/log-masuk?next=%2Fms%2Fmula' });
    expect(guard('/en/admin', null)).toEqual({ redirect: '/en/log-masuk?next=%2Fen%2Fadmin' });
    expect(guard('/ms/teroka', null, '?page=2')).toEqual({ redirect: '/ms/log-masuk?next=%2Fms%2Fteroka%3Fpage%3D2' });
    expect(guard('/ms/teroka', student)).toBeNull();
  });

  it('sends "/ms" to logging in, or to the portal when signed in', () => {
    expect(guard('/ms', null)).toEqual({ redirect: '/ms/log-masuk' });
    expect(guard('/en', student)).toEqual({ redirect: '/en/utama' });
  });

  it('moves signed-in users away from log in and sign up', () => {
    expect(guard('/ms/log-masuk', student)).toEqual({ redirect: '/ms/utama' });
    expect(guard('/en/daftar', admin)).toEqual({ redirect: '/en/admin' });
  });

  it('keeps students out of the admin console', () => {
    expect(guard('/ms/admin', student)).toEqual({ redirect: '/ms/utama' });
    expect(guard('/ms/admin/programmes', student)).toEqual({ redirect: '/ms/utama' });
  });

  it('keeps admins out of every student page', () => {
    expect(guard('/ms/admin', admin)).toBeNull();
    for (const page of ['utama', 'teroka', 'teroka/abc', 'banding', 'mula', 'kemas-kini']) {
      expect(guard(`/ms/${page}`, admin)).toEqual({ redirect: '/ms/admin' });
    }
  });

  it('lets both roles set a new password from the e-mail link', () => {
    expect(guard('/ms/kata-laluan-baharu', admin)).toBeNull();
    expect(guard('/ms/kata-laluan-baharu', student)).toBeNull();
  });
});

describe('safeNext', () => {
  it('allows pages of this site only', () => {
    expect(safeNext('/ms/teroka?page=2', '/ms/utama')).toBe('/ms/teroka?page=2');
    expect(safeNext('https://evil.example', '/ms/utama')).toBe('/ms/utama');
    expect(safeNext('//evil.example', '/ms/utama')).toBe('/ms/utama');
    expect(safeNext('/\\evil.example', '/ms/utama')).toBe('/ms/utama');
    expect(safeNext('/teroka', '/ms/utama')).toBe('/ms/utama');
    expect(safeNext(null, '/ms/utama')).toBe('/ms/utama');
  });
});

describe('nextFor', () => {
  it('returns to the page asked for when the role may open it', () => {
    expect(nextFor('/ms/teroka?page=2', student, '/ms/utama')).toBe('/ms/teroka?page=2');
    expect(nextFor('/ms/admin', admin, '/ms/admin')).toBe('/ms/admin');
  });

  it('otherwise goes home', () => {
    expect(nextFor('/ms/teroka', admin, '/ms/admin')).toBe('/ms/admin');
    expect(nextFor('/ms/admin', student, '/ms/utama')).toBe('/ms/utama');
    expect(nextFor('https://evil.example', student, '/ms/utama')).toBe('/ms/utama');
  });
});

describe('homeFor', () => {
  it('sends admins to the console and students to their home', () => {
    expect(homeFor('en', 'admin')).toBe('/en/admin');
    expect(homeFor('ms', 'student')).toBe('/ms/utama');
  });
});
