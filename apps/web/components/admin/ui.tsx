import Link from 'next/link';
import type { ReactNode } from 'react';
import type { ReviewStatus } from '@/lib/admin/api';
import { format, type Dictionary } from '@/lib/i18n/locale';
import { AdminIcon, type AdminIconName } from './icons';

type AdminDict = Dictionary['admin'];

export type ButtonVariant = 'primary' | 'accent' | 'secondary' | 'danger' | 'dangerSolid' | 'ghost';

const VARIANT: Record<ButtonVariant, string> = {
  primary: 'bg-navy text-white hover:bg-navy/90',
  accent: 'bg-yellow text-navy hover:bg-yellow/80',
  secondary: 'border border-line bg-white text-navy hover:border-navy/30 hover:bg-bg',
  danger: 'border border-red/50 bg-white text-[#b33a35] hover:bg-red/10',
  dangerSolid: 'bg-red text-white hover:bg-red/90',
  ghost: 'text-navy hover:bg-bg',
};

/**
 * One look for every admin button and button-like link: clear hover, a visible keyboard focus ring, a small press
 * and a calm disabled state. Motion is skipped when the reader asks for reduced motion.
 */
export function buttonClass(variant: ButtonVariant = 'secondary', size: 'md' | 'sm' = 'md'): string {
  return [
    'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[10px] font-semibold',
    'transition-[background-color,border-color,transform] duration-150 active:scale-[0.98] motion-reduce:transition-none motion-reduce:active:scale-100',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy/40 focus-visible:ring-offset-2',
    'disabled:cursor-not-allowed disabled:opacity-60 disabled:active:scale-100',
    size === 'md' ? 'px-4 py-2.5 text-sm' : 'px-3 py-1.5 text-[13px]',
    VARIANT[variant],
  ].join(' ');
}

/** Icon and text inside a button; the icon turns into a spinner while the action runs. */
export function IconText({ icon, children, busy }: { icon?: AdminIconName; children: ReactNode; busy?: boolean }) {
  return (
    <>
      {busy ? <AdminIcon name="spinner" size={16} /> : icon && <AdminIcon name={icon} size={16} />}
      <span>{children}</span>
    </>
  );
}

const STATUS_STYLE: Record<ReviewStatus, { tone: string; icon: AdminIconName }> = {
  draft: { tone: 'bg-bg text-navy', icon: 'draft' },
  in_review: { tone: 'bg-cream text-navy', icon: 'clock' },
  returned: { tone: 'bg-red/10 text-[#b33a35]', icon: 'undo' },
  published: { tone: 'bg-mint text-[#1f6b47]', icon: 'checkCircle' },
  archived: { tone: 'bg-line text-muted', icon: 'archive' },
};

/** Status in everyday words with its own icon, so it never depends on colour alone. */
export function StatusChip({ status, t }: { status: ReviewStatus; t: AdminDict }) {
  const s = STATUS_STYLE[status];
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${s.tone}`}>
      <AdminIcon name={s.icon} size={13} />
      {t.status[status]}
    </span>
  );
}

export function AdminHeading({ title, intro, actions, back }: { title: string; intro?: ReactNode; actions?: ReactNode; back?: { href: string; label: string } }) {
  return (
    <header className="flex flex-col gap-3">
      {back && (
        <Link href={back.href} className="group inline-flex items-center gap-1.5 self-start rounded-md text-sm font-semibold hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy/40">
          <AdminIcon name="arrowLeft" size={16} className="transition-transform duration-150 group-hover:-translate-x-0.5 motion-reduce:transition-none" />
          {back.label.replace(/^←\s*/, '')}
        </Link>
      )}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 flex-col gap-2">
          <h1 className="text-[28px] font-bold leading-tight lg:text-[36px]">{title}</h1>
          {intro && <div className="text-[15px] text-muted">{intro}</div>}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
      </div>
    </header>
  );
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`flex flex-col gap-4 rounded-[18px] border border-line bg-white p-5 lg:p-6 ${className}`}>{children}</section>;
}

/** A link styled as a button: `primary` is the yellow action from the Figma admin screens. */
export function ButtonLink({ href, children, primary, icon }: { href: string; children: ReactNode; primary?: boolean; icon?: AdminIconName }) {
  return (
    <Link href={href} className={buttonClass(primary ? 'accent' : 'secondary')}>
      <IconText icon={icon}>{children}</IconText>
    </Link>
  );
}

export interface TabItem {
  href: string;
  label: string;
  icon: AdminIconName;
  current: boolean;
  count?: number;
}

/** Tabs as links (each tab has its own address), with an icon and an optional count. */
export function AdminTabs({ items, label }: { items: TabItem[]; label: string }) {
  return (
    <nav aria-label={label} className="flex flex-wrap gap-1 self-start rounded-[12px] bg-white p-1">
      {items.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          aria-current={tab.current ? 'page' : undefined}
          className={`inline-flex items-center gap-2 rounded-[9px] px-3.5 py-2 text-sm font-semibold transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy/40 ${
            tab.current ? 'bg-navy text-white' : 'text-navy hover:bg-bg'
          }`}
        >
          <AdminIcon name={tab.icon} size={16} />
          {tab.label}
          {tab.count !== undefined && <span className={`rounded-full px-2 text-xs ${tab.current ? 'bg-white/20' : 'bg-bg'}`}>{tab.count}</span>}
        </Link>
      ))}
    </nav>
  );
}

/** An empty list that says so plainly, with an icon and (optionally) the next thing to do. */
export function EmptyState({ icon, text, action }: { icon: AdminIconName; text: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-[14px] border border-dashed border-line bg-white px-6 py-8 text-center">
      <span className="flex size-11 items-center justify-center rounded-full bg-bg text-muted">
        <AdminIcon name={icon} size={20} />
      </span>
      <p className="max-w-[46ch] text-sm text-muted">{text}</p>
      {action}
    </div>
  );
}

/** "How this works" box with numbered steps. */
export function HowItWorks({ title, steps }: { title: string; steps: string[] }) {
  return (
    <section className="flex flex-col gap-3 rounded-[18px] bg-blue p-5 lg:p-6">
      <h2 className="flex items-center gap-2 font-semibold">
        <AdminIcon name="info" size={18} />
        {title}
      </h2>
      <ol className="flex flex-col gap-2.5">
        {steps.map((step, i) => (
          <li key={step} className="flex gap-3 text-sm">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-white text-xs font-semibold">{i + 1}</span>
            <span className="pt-0.5">{step}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function LoadError({ text }: { text: string }) {
  return (
    <p role="alert" className="flex items-center gap-2 rounded-[18px] border border-line bg-white p-6 text-sm">
      <AdminIcon name="alert" size={18} className="text-[#b33a35]" />
      {text}
    </p>
  );
}

/**
 * Page links for a long list: previous, the pages around the current one (with gaps), next, and "x–y of z".
 * `href(page)` builds each page's address, keeping the list's filters and sort.
 */
export function Pagination({ page, pageSize, total, href, t }: { page: number; pageSize: number; total: number; href: (page: number) => string; t: AdminDict['pagination'] }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (total === 0) return null;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  const shown = [...new Set([1, page - 1, page, page + 1, pages])].filter((p) => p >= 1 && p <= pages).sort((a, b) => a - b);
  const link = (p: number, label: ReactNode, aria: string, current = false) => (
    <Link
      key={aria}
      href={href(p)}
      aria-label={aria}
      aria-current={current ? 'page' : undefined}
      className={`inline-flex min-w-9 items-center justify-center rounded-[9px] px-2.5 py-1.5 text-sm font-semibold transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy/40 ${
        current ? 'bg-navy text-white' : 'text-navy hover:bg-white'
      }`}
    >
      {label}
    </Link>
  );
  return (
    <nav aria-label={t.label} className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-[13px] text-muted">{format(t.range, { from, to, total })}</p>
      {pages > 1 && (
        <div className="flex items-center gap-1">
          {page > 1 ? link(page - 1, <AdminIcon name="arrowLeft" size={16} />, t.previous) : null}
          {shown.map((p, i) => (
            <span key={p} className="flex items-center gap-1">
              {i > 0 && p - shown[i - 1]! > 1 && <span className="px-1 text-muted">…</span>}
              {link(p, p, format(t.page, { page: p }), p === page)}
            </span>
          ))}
          {page < pages ? link(page + 1, <AdminIcon name="arrowRight" size={16} />, t.next) : null}
        </div>
      )}
    </nav>
  );
}

/** A column heading that sorts the list by that column; pressing it again flips the order. */
export function SortHeader({ label, active, direction, href, className = '' }: { label: string; active: boolean; direction: 'asc' | 'desc'; href: string; className?: string }) {
  return (
    <th aria-sort={active ? (direction === 'asc' ? 'ascending' : 'descending') : 'none'} className={`px-4 py-3 font-medium ${className}`}>
      <Link href={href} className={`inline-flex items-center gap-1 whitespace-nowrap rounded-md hover:text-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy/40 ${active ? 'text-navy' : ''}`}>
        {label}
        <span aria-hidden className={`text-[11px] ${active ? '' : 'opacity-40'}`}>
          {active ? (direction === 'asc' ? '▲' : '▼') : '▲▼'}
        </span>
      </Link>
    </th>
  );
}

/** Who did something, from the reader's side: "you", "another admin" or "seed data". */
export function who(adminId: string | null, me: string, t: AdminDict): string {
  if (!adminId) return t.seedData;
  return adminId === me ? t.you : t.anotherAdmin;
}

/** "3 days ago" style time, for how long something has waited. */
export function timeAgo(date: Date, now: number, t: AdminDict): string {
  const minutes = Math.max(0, Math.round((now - date.getTime()) / 60_000));
  if (minutes < 1) return t.time.justNow;
  if (minutes < 60) return format(t.time.minutes, { n: minutes });
  const hours = Math.round(minutes / 60);
  if (hours < 24) return format(t.time.hours, { n: hours });
  return format(t.time.days, { n: Math.round(hours / 24) });
}
