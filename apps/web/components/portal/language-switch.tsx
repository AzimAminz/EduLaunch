'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { LOCALES, LOCALE_COOKIE, localizedPath, type Dictionary, type Locale } from '@/lib/i18n/locale';

/** BM | EN toggle. Keeps the current page and filters, and remembers the choice for a year. */
export function LanguageSwitch({ locale, labels, className = 'mt-2 bg-bg' }: { locale: Locale; labels: Dictionary['language']; className?: string }) {
  const pathname = usePathname();
  const search = useSearchParams().toString();

  return (
    <div role="group" aria-label={labels.label} className={`flex rounded-[10px] p-1 ${className}`}>
      {LOCALES.map((l) => {
        const href = `${localizedPath(pathname, l)}${search ? `?${search}` : ''}`;
        const current = l === locale;
        return (
          <Link
            key={l}
            href={href}
            lang={l}
            hrefLang={l}
            aria-current={current ? 'true' : undefined}
            title={labels[l]}
            onClick={() => {
              document.cookie = `${LOCALE_COOKIE}=${l}; path=/; max-age=31536000; samesite=lax`;
            }}
            className={`flex-1 rounded-lg py-1.5 text-center text-sm font-semibold ${current ? 'bg-white text-navy shadow-sm' : 'text-muted hover:text-navy'}`}
          >
            {l === 'ms' ? 'BM' : 'EN'}
          </Link>
        );
      })}
    </div>
  );
}
