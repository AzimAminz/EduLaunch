'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { Dictionary, Locale } from '@/lib/i18n/locale';
import { LanguageSwitch } from './language-switch';
import { Icon } from '@/components/ui/icon';

type NavKey = keyof Dictionary['nav'];

interface NavItem {
  key: NavKey;
  slug: string;
  icon: string;
  badge?: NavKey;
}

// Order and grouping follow the Figma "Portal / Sidebar pelajar" component.
const GROUPS: Array<{ title?: NavKey; items: NavItem[] }> = [
  { items: [{ key: 'home', slug: 'utama', icon: 'home' }] },
  {
    title: 'groupExplore',
    items: [
      { key: 'recommendations', slug: 'cadangan', icon: 'sparkle', badge: 'newBadge' },
      { key: 'explore', slug: 'teroka', icon: 'compass' },
      { key: 'compare', slug: 'banding', icon: 'columns' },
      { key: 'saved', slug: 'simpanan', icon: 'bookmark' },
    ],
  },
  {
    title: 'groupPlan',
    items: [
      { key: 'eligibility', slug: 'kelayakan', icon: 'check' },
      { key: 'meritLab', slug: 'merit-lab', icon: 'calc' },
      { key: 'roadmap', slug: 'roadmap', icon: 'route' },
    ],
  },
  {
    title: 'groupSelf',
    items: [
      { key: 'interest', slug: 'penilaian-minat', icon: 'spark' },
      { key: 'activities', slug: 'aktiviti', icon: 'puzzle' },
    ],
  },
  {
    title: 'groupHelp',
    items: [
      { key: 'documents', slug: 'dokumen', icon: 'file' },
      { key: 'askAi', slug: 'tanya-ai', icon: 'message' },
    ],
  },
];

const FOOTER: NavItem[] = [
  { key: 'updates', slug: 'kemas-kini', icon: 'bell' },
  { key: 'help', slug: 'bantuan', icon: 'help' },
];

export function Sidebar({ locale, nav, language }: { locale: Locale; nav: Dictionary['nav']; language: Dictionary['language'] }) {
  const pathname = usePathname();

  const link = (item: NavItem) => {
    const href = `/${locale}/${item.slug}`;
    const active = pathname === href || pathname.startsWith(`${href}/`);
    return (
      <Link
        key={item.key}
        href={href}
        aria-current={active ? 'page' : undefined}
        className={`flex w-full items-center gap-3 rounded-[10px] py-[7px] pl-3 pr-2.5 text-[15px] font-medium leading-[1.4] text-navy ${active ? 'bg-blue' : 'hover:bg-bg'}`}
      >
        <Icon src={`/icons/${item.icon}.svg`} size={20} className="shrink-0" />
        <span className="min-w-0 flex-1">{nav[item.key]}</span>
        {item.badge && <span className="rounded-full bg-yellow px-2 py-px text-xs font-semibold">{nav[item.badge]}</span>}
      </Link>
    );
  };

  return (
    <nav aria-label="EduLaunch" className="sticky top-0 flex h-dvh w-[272px] shrink-0 flex-col gap-1 overflow-y-auto border-r border-line bg-white px-4 py-5">
      <Link href={`/${locale}/teroka`} className="flex items-center gap-2.5 pb-3">
        <Icon src="/brand/logo.svg" size={36} />
        <span className="text-xl font-bold leading-[1.4]">EduLaunch</span>
      </Link>
      {GROUPS.map((group, i) => (
        <div key={group.title ?? i} className="flex flex-col gap-1">
          {group.title && <p className="pl-3 pb-0.5 pt-2.5 text-xs font-medium leading-[1.4] text-muted">{nav[group.title]}</p>}
          {group.items.map(link)}
        </div>
      ))}
      <div className="min-h-4 flex-1" />
      {FOOTER.map(link)}
      <LanguageSwitch locale={locale} labels={language} />
    </nav>
  );
}
