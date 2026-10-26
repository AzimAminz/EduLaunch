'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { signOut } from '@/lib/auth/actions';
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

export interface SidebarAccount {
  name: string | null;
  email: string;
}

interface SidebarProps {
  locale: Locale;
  nav: Dictionary['nav'];
  language: Dictionary['language'];
  auth: Pick<Dictionary['auth'], 'signOut' | 'signedInAs'>;
  account: SidebarAccount | null;
}

// The desktop "icons only" choice, kept in this browser (and shared between open tabs).
const COLLAPSED_KEY = 'edulaunch.sidebar.collapsed';
const COLLAPSED_EVENT = 'edulaunch:sidebar';

function readCollapsed(): boolean {
  try {
    return localStorage.getItem(COLLAPSED_KEY) === '1';
  } catch {
    return false; // Storage blocked (private mode): start expanded.
  }
}

function writeCollapsed(value: boolean) {
  try {
    localStorage.setItem(COLLAPSED_KEY, value ? '1' : '0');
  } catch {}
  window.dispatchEvent(new Event(COLLAPSED_EVENT));
}

function subscribeCollapsed(onChange: () => void) {
  window.addEventListener('storage', onChange);
  window.addEventListener(COLLAPSED_EVENT, onChange);
  return () => {
    window.removeEventListener('storage', onChange);
    window.removeEventListener(COLLAPSED_EVENT, onChange);
  };
}

/**
 * Desktop (1024px and wider): a fixed column that can be narrowed to icons only; the choice is remembered.
 * Phones and tablets: a top bar with a menu button that slides the same sidebar in over the page.
 */
export function Sidebar({ locale, nav, language, auth, account }: SidebarProps) {
  const pathname = usePathname();
  const collapsed = useSyncExternalStore(subscribeCollapsed, readCollapsed, () => false);
  // The phone menu belongs to the page it was opened on, so it closes by itself after navigating.
  const [openOn, setOpenOn] = useState<string | null>(null);
  const open = openOn === pathname;
  const setOpen = (value: boolean) => setOpenOn(value ? pathname : null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpenOn(null);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const toggleCollapsed = () => writeCollapsed(!collapsed);

  // Icons only on desktop when collapsed; the phone menu always shows labels.
  const narrow = collapsed && !open;

  const link = (item: NavItem) => {
    const href = `/${locale}/${item.slug}`;
    const active = pathname === href || pathname.startsWith(`${href}/`);
    return (
      <Link
        key={item.key}
        href={href}
        aria-current={active ? 'page' : undefined}
        title={narrow ? nav[item.key] : undefined}
        className={`flex w-full items-center gap-3 rounded-[10px] py-[7px] text-[15px] font-medium leading-[1.4] text-navy ${narrow ? 'lg:justify-center lg:px-0' : ''} pl-3 pr-2.5 ${active ? 'bg-blue' : 'hover:bg-bg'}`}
      >
        <Icon src={`/icons/${item.icon}.svg`} size={20} className="shrink-0" />
        <span className={`min-w-0 flex-1 ${narrow ? 'lg:sr-only' : ''}`}>{nav[item.key]}</span>
        {item.badge && <span className={`rounded-full bg-yellow px-2 py-px text-xs font-semibold ${narrow ? 'lg:hidden' : ''}`}>{nav[item.badge]}</span>}
      </Link>
    );
  };

  return (
    <>
      {/* Phone and tablet top bar */}
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-line bg-white px-4 py-3 lg:hidden">
        <button type="button" onClick={() => setOpen(true)} aria-expanded={open} aria-controls="portal-sidebar" aria-label={nav.toggleSidebar} className="rounded-[10px] p-2 hover:bg-bg">
          <Icon src="/icons/panel.svg" size={20} />
        </button>
        <Link href={`/${locale}/teroka`} className="flex items-center gap-2">
          <Icon src="/brand/logo.svg" size={28} />
          <span className="text-lg font-bold">EduLaunch</span>
        </Link>
      </header>

      {open && <div aria-hidden onClick={() => setOpen(false)} className="fixed inset-0 z-40 bg-navy/40 lg:hidden" />}

      <nav
        id="portal-sidebar"
        aria-label="EduLaunch"
        className={`fixed inset-y-0 left-0 z-50 flex h-dvh w-[272px] shrink-0 flex-col gap-1 overflow-y-auto border-r border-line bg-white px-4 py-5 transition-transform lg:sticky lg:top-0 lg:z-auto lg:translate-x-0 lg:transition-[width] ${open ? 'translate-x-0' : '-translate-x-full'} ${collapsed ? 'lg:w-[76px] lg:px-3' : ''}`}
      >
        <div className={`flex items-center gap-2 pb-3 ${narrow ? 'lg:flex-col' : ''}`}>
          <Link href={`/${locale}/teroka`} className="flex min-w-0 flex-1 items-center gap-2.5">
            <Icon src="/brand/logo.svg" size={36} className="shrink-0" />
            <span className={`text-xl font-bold leading-[1.4] ${narrow ? 'lg:sr-only' : ''}`}>EduLaunch</span>
          </Link>
          <button
            type="button"
            onClick={() => (open ? setOpen(false) : toggleCollapsed())}
            aria-label={nav.toggleSidebar}
            aria-expanded={open || !collapsed}
            title={nav.toggleSidebar}
            className="rounded-[10px] p-2 hover:bg-bg"
          >
            <Icon src="/icons/panel.svg" size={18} />
          </button>
        </div>
        {GROUPS.map((group, i) => (
          <div key={group.title ?? i} className="flex flex-col gap-1">
            {group.title && <p className={`pl-3 pb-0.5 pt-2.5 text-xs font-medium leading-[1.4] text-muted ${narrow ? 'lg:sr-only' : ''}`}>{nav[group.title]}</p>}
            {group.items.map(link)}
          </div>
        ))}
        <div className="min-h-4 flex-1" />
        {FOOTER.map(link)}
        {account && (
          <form action={signOut} className={`mt-2 flex flex-col gap-2 border-t border-line pt-3 ${narrow ? 'lg:items-center' : ''}`}>
            <input type="hidden" name="locale" value={locale} />
            <Link href={`/${locale}/profil`} aria-current={pathname === `/${locale}/profil` ? 'page' : undefined} className={`min-w-0 rounded-[10px] px-3 py-1.5 hover:bg-bg ${narrow ? 'lg:hidden' : ''} ${pathname === `/${locale}/profil` ? 'bg-blue' : ''}`}>
              <p className="text-xs text-muted">{auth.signedInAs}</p>
              <p className="truncate text-sm font-semibold" title={account.email}>
                {account.name ?? account.email} ›
              </p>
            </Link>
            <button type="submit" title={narrow ? auth.signOut : undefined} className={`flex w-full items-center gap-3 rounded-[10px] py-[7px] pl-3 pr-2.5 text-[15px] font-medium hover:bg-bg ${narrow ? 'lg:justify-center lg:px-0' : ''}`}>
              <Icon src="/icons/log-out.svg" size={20} className="shrink-0" />
              <span className={narrow ? 'lg:sr-only' : ''}>{auth.signOut}</span>
            </button>
          </form>
        )}
        <div className={narrow ? 'lg:hidden' : ''}>
          <LanguageSwitch locale={locale} labels={language} />
        </div>
      </nav>
    </>
  );
}
