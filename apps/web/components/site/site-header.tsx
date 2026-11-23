'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { Icon } from '@/components/ui/icon';
import { SITE_PAGES } from '@/lib/auth/routes';
import type { Dictionary, Locale } from '@/lib/i18n/locale';

/** The public site's navy bar: logo, Home · About us · Contact, and Log in. On phones the links fold into a menu. */
export function SiteHeader({ locale, t }: { locale: Locale; t: Dictionary['site']['nav'] }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  const links = [
    { href: `/${locale}`, label: t.home },
    { href: `/${locale}/${SITE_PAGES.about}`, label: t.about },
    { href: `/${locale}/${SITE_PAGES.contact}`, label: t.contact },
  ];
  const signIn = `/${locale}/log-masuk`;

  return (
    <header className="sticky top-0 z-40 bg-navy">
      <a href="#kandungan" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:rounded-lg focus:bg-yellow focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-navy">
        {t.skip}
      </a>
      <div className="mx-auto flex h-[72px] max-w-[1200px] items-center gap-6 px-4 sm:px-6 lg:h-[86px]">
        <Link href={`/${locale}`} className="flex flex-1 items-center gap-2.5">
          <Icon src="/brand/logo.svg" size={32} />
          <span className="text-[22px] font-bold text-white">EduLaunch</span>
        </Link>
        <nav aria-label={t.label} className="hidden items-center gap-9 md:flex">
          {links.map((l) => (
            <Link key={l.href} href={l.href} aria-current={pathname === l.href ? 'page' : undefined} className={`text-[15px] font-medium hover:text-yellow ${pathname === l.href ? 'text-yellow' : 'text-white'}`}>
              {l.label}
            </Link>
          ))}
        </nav>
        <Link href={signIn} className="hidden h-12 items-center gap-2 rounded-full bg-yellow px-6 text-[15px] font-semibold text-navy hover:bg-yellow/90 md:ml-6 md:inline-flex">
          {t.signIn}
          <Icon src="/icons/arrow-right.svg" size={18} />
        </Link>
        <button
          type="button"
          aria-expanded={open}
          aria-controls="menu-awam"
          aria-label={open ? t.closeMenu : t.openMenu}
          onClick={() => setOpen((v) => !v)}
          className="grid size-11 place-items-center rounded-xl text-white hover:bg-white/10 md:hidden"
        >
          <svg aria-hidden width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            {open ? <path d="M5 5l12 12M17 5L5 17" /> : <path d="M3 6h16M3 11h16M3 16h16" />}
          </svg>
        </button>
      </div>
      {open && (
        <nav id="menu-awam" aria-label={t.label} className="border-t border-white/10 px-4 pb-5 pt-2 md:hidden">
          <ul className="flex flex-col">
            {links.map((l) => (
              <li key={l.href}>
                <Link href={l.href} onClick={close} aria-current={pathname === l.href ? 'page' : undefined} className={`flex h-12 items-center text-base font-medium ${pathname === l.href ? 'text-yellow' : 'text-white'}`}>
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
          <Link href={signIn} onClick={close} className="mt-2 flex h-12 items-center justify-center gap-2 rounded-full bg-yellow text-[15px] font-semibold text-navy">
            {t.signIn}
            <Icon src="/icons/arrow-right.svg" size={18} />
          </Link>
        </nav>
      )}
    </header>
  );
}
