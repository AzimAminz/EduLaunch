import type ms from '../../dictionaries/ms.json';

/** Bahasa Melayu first: it is the default for students in Malaysia. */
export const LOCALES = ['ms', 'en'] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'ms';
export const LOCALE_COOKIE = 'lang';

/** Both dictionaries have this shape (checked by a unit test). */
export type Dictionary = typeof ms;

export const isLocale = (value: string | undefined): value is Locale => LOCALES.includes(value as Locale);

/** Cookie (the user's earlier choice) wins, then the browser's languages in order, then Bahasa Melayu. */
export function pickLocale(cookie: string | undefined, acceptLanguage: string | undefined | null): Locale {
  if (isLocale(cookie)) return cookie;
  const preferred = (acceptLanguage ?? '')
    .split(',')
    .map((part) => part.trim().split(';')[0]!.toLowerCase().split('-')[0]!)
    .filter(Boolean);
  return preferred.find(isLocale) ?? DEFAULT_LOCALE;
}

/** The same page in another language: "/ms/teroka" → "/en/teroka". */
export function localizedPath(pathname: string, locale: Locale): string {
  const parts = pathname.split('/');
  if (isLocale(parts[1])) parts[1] = locale;
  else parts.splice(1, 0, locale);
  return parts.join('/').replace(/\/$/, '') || `/${locale}`;
}

/** Fills "{name}" placeholders. */
export function format(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => (key in values ? String(values[key]) : match));
}
