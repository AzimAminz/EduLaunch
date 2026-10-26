import type { Dictionary, Locale } from './locale';

// Loaded on the server only; the browser receives rendered text, not the dictionaries.
const dictionaries: Record<Locale, () => Promise<Dictionary>> = {
  ms: () => import('../../dictionaries/ms.json').then((m) => m.default),
  en: () => import('../../dictionaries/en.json').then((m) => m.default),
};

export const getDictionary = (locale: Locale) => dictionaries[locale]();
