import type { Dictionary, Locale } from '@/lib/i18n/locale';
import type { NavGroup, NavLink } from './sidebar';

type Nav = Dictionary['nav'];
type Item = { key: keyof Nav; slug: string; icon: string; badge?: keyof Nav };

// Order and grouping follow the Figma "Portal / Sidebar pelajar" component.
const GROUPS: Array<{ title?: keyof Nav; items: Item[] }> = [
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

const FOOTER: Item[] = [
  { key: 'updates', slug: 'kemas-kini', icon: 'bell' },
  { key: 'help', slug: 'bantuan', icon: 'help' },
];

/** The student portal menu with its labels in the page language. */
export function studentNav(locale: Locale, nav: Nav): { groups: NavGroup[]; footer: NavLink[] } {
  const link = (i: Item): NavLink => ({ href: `/${locale}/${i.slug}`, label: nav[i.key], icon: i.icon, badge: i.badge && nav[i.badge] });
  return {
    groups: GROUPS.map((g) => ({ title: g.title && nav[g.title], items: g.items.map(link) })),
    footer: FOOTER.map(link),
  };
}
