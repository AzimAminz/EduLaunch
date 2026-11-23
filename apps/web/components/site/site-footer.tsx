import Link from 'next/link';
import { Suspense } from 'react';
import { LanguageSwitch } from '@/components/portal/language-switch';
import { Icon } from '@/components/ui/icon';
import { SITE_PAGES } from '@/lib/auth/routes';
import type { Dictionary, Locale } from '@/lib/i18n/locale';

/** The public footer. It links only to pages anyone can open (no portal tools), and carries the disclaimer. */
export function SiteFooter({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  const t = dict.site.footer;
  const columns = [
    { title: t.resources, links: [{ href: `/${locale}#cara-berfungsi`, label: t.howItWorks }, { href: `/${locale}/${SITE_PAGES.guide}`, label: t.guide }] },
    { title: t.company, links: [{ href: `/${locale}/${SITE_PAGES.about}`, label: t.about }, { href: `/${locale}/${SITE_PAGES.contact}`, label: t.contact }] },
    { title: t.legal, links: [{ href: `/${locale}/${SITE_PAGES.privacy}`, label: t.privacy }, { href: `/${locale}/${SITE_PAGES.terms}`, label: t.terms }] },
  ];
  return (
    <footer className="bg-navy text-white">
      <div className="mx-auto flex max-w-[1200px] flex-col gap-10 px-4 pb-8 pt-16 sm:px-6 lg:pt-20">
        <div className="grid grid-cols-[minmax(0,1fr)] gap-10 sm:grid-cols-2 lg:grid-cols-[1.3fr_1fr_1fr_1fr]">
          <div className="flex flex-col gap-4">
            <Link href={`/${locale}`} className="flex items-center gap-2.5">
              <Icon src="/brand/logo.svg" size={32} />
              <span className="text-[22px] font-bold">EduLaunch</span>
            </Link>
            <p className="max-w-[320px] text-[15px] text-white/80">{t.tagline}</p>
          </div>
          <nav aria-label={t.nav} className="contents">
            {columns.map((c) => (
              <div key={c.title} className="flex flex-col gap-3">
                <h2 className="text-sm font-semibold text-yellow">{c.title}</h2>
                <ul className="flex flex-col gap-2.5">
                  {c.links.map((l) => (
                    <li key={l.href}>
                      <Link href={l.href} className="text-[15px] text-white hover:text-yellow">
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>
        <p className="flex gap-3 rounded-[14px] bg-white/[0.06] px-5 py-4 text-[13px] text-white/80">
          <svg aria-hidden className="mt-0.5 shrink-0" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FFD84D" strokeWidth="2" strokeLinecap="round">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 16v-4M12 8h.01" />
          </svg>
          {dict.footer.disclaimer}
        </p>
        <div className="flex flex-col gap-4 border-t border-white/10 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[13px] text-white/60">{dict.footer.copyright}</p>
          <Suspense fallback={<div className="h-10 w-[112px]" />}>
            <LanguageSwitch locale={locale} labels={dict.language} className="w-[112px] bg-white/90" />
          </Suspense>
        </div>
      </div>
    </footer>
  );
}
