import { isLocale, type Locale } from '../i18n/locale';

/** Address slugs, the same in both languages (like /ms/teroka and /en/teroka). */
export const AUTH_PAGES = {
  signIn: 'log-masuk',
  signUp: 'daftar',
  forgotPassword: 'lupa-kata-laluan',
  checkInbox: 'semak-emel',
  newPassword: 'kata-laluan-baharu',
  onboarding: 'mula',
  callback: 'auth/callback',
} as const;

export type Role = 'student' | 'admin';
export interface SignedInUser {
  role: Role;
}

/**
 * Pages anyone may open. Everything else is the private portal (every sidebar page) and needs a session.
 * The public website from Figma (landing, about, contact…) will be added to this list when it is built.
 */
const PUBLIC = new Set(['log-masuk', 'daftar', 'lupa-kata-laluan', 'semak-emel', 'auth']);
/** Pages that make no sense once signed in. */
const GUEST_ONLY = new Set(['log-masuk', 'daftar']);

export const homeFor = (locale: Locale, role: Role) => (role === 'admin' ? `/${locale}/admin` : `/${locale}/utama`);

/**
 * Where a path inside this app may send the user after sign-in. Anything else
 * (another site, "//evil.example", a path without a language) falls back to `fallback`.
 */
export function safeNext(next: string | null | undefined, fallback: string): string {
  if (!next || !next.startsWith('/') || next.startsWith('//') || next.includes('\\')) return fallback;
  return isLocale(next.split('/')[1]) ? next : fallback;
}

/** What the proxy does with a page request: let it through, or redirect. */
export function guard(pathname: string, user: SignedInUser | null, search = ''): { redirect: string } | null {
  const [, locale, section = ''] = pathname.split('/');
  if (!isLocale(locale)) return null;

  // "/ms" on its own: no public landing page yet, so it leads to logging in or to the portal.
  if (!section) return { redirect: user ? homeFor(locale, user.role) : `/${locale}/${AUTH_PAGES.signIn}` };
  if (!user) {
    return PUBLIC.has(section) ? null : { redirect: `/${locale}/${AUTH_PAGES.signIn}?next=${encodeURIComponent(pathname + search)}` };
  }
  if (GUEST_ONLY.has(section)) return { redirect: homeFor(locale, user.role) };
  if (section === 'admin' && user.role !== 'admin') return { redirect: homeFor(locale, user.role) };
  if (section === AUTH_PAGES.onboarding && user.role === 'admin') return { redirect: homeFor(locale, 'admin') };
  return null;
}
