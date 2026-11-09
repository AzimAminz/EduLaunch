  import Link from 'next/link';
import type { ReactNode } from 'react';
import type { ReviewStatus } from '@/lib/admin/api';
import type { Crumb } from '@/lib/admin/trail';
import { format, type Dictionary } from '@/lib/i18n/locale';
import { AdminIcon, type AdminIconName } from './icons';

type AdminDict = Dictionary['admin'];

export type ButtonVariant = 'primary' | 'accent' | 'secondary' | 'danger' | 'dangerSolid' | 'ghost';

// One filled action per screen, in navy; yellow stays the brand's (logo, super admin tag). `accent` is kept as a
// name for callers and looks like the primary.
const VARIANT: Record<ButtonVariant, string> = {
  primary: 'bg-navy text-white hover:bg-navy/90',
  accent: 'bg-navy text-white hover:bg-navy/90',
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
    'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[8px] font-semibold',
    'transition-[background-color,border-color,transform] duration-150 active:scale-[0.98] motion-reduce:transition-none motion-reduce:active:scale-100',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy/40 focus-visible:ring-offset-2',
    'disabled:cursor-not-allowed disabled:opacity-60 disabled:active:scale-100',
    size === 'md' ? 'h-9 px-3.5 text-sm' : 'h-8 px-3 text-[13px]',
    VARIANT[variant],
  ].join(' ');
}

/** Icon and text inside a button; the icon turns into a spinner while the action runs. */
export function IconText({ icon, children, busy }: { icon?: AdminIconName; children: ReactNode; busy?: boolean }) {
  return (
    // Keyed: a server component's fragment passed into a client component travels as a list.
    <>
      {busy ? <AdminIcon key="icon" name="spinner" size={16} /> : icon && <AdminIcon key="icon" name={icon} size={16} />}
      <span key="text">{children}</span>
    </>
  );
}

// A pale tint with dark text of the same hue; the dot keeps the state readable without colour.
const STATUS_STYLE: Record<ReviewStatus, { tone: string; dot: string }> = {
  draft: { tone: 'bg-[#f1f2f4] text-[#3d4452]', dot: 'bg-[#8a93a3]' },
  in_review: { tone: 'bg-[#e8effc] text-[#24467f]', dot: 'bg-[#3b6fd8]' },
  returned: { tone: 'bg-[#ffedea] text-[#831c1e]', dot: 'bg-[#d24b45]' },
  published: { tone: 'bg-[#dcfae5] text-[#0f4a26]', dot: 'bg-[#2f9e6a]' },
  archived: { tone: 'bg-[#f1f2f4] text-[#5f6368]', dot: 'bg-[#b5bac4]' },
};

/** Status in everyday words, as one small pill per row. */
export function StatusChip({ status, t, note }: { status: ReviewStatus; t: AdminDict; note?: string }) {
  const s = STATUS_STYLE[status];
  return (
    <span className={`inline-flex flex-none items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-[12px] font-medium ${s.tone}`}>
      <span aria-hidden className={`size-1.5 rounded-full ${s.dot}`} />
      {t.status[status]}
      {note && <span className="opacity-75">· {note}</span>}
    </span>
  );
}

/** The way back: each level above this page, ending at the page itself (not a link). */
export function Breadcrumbs({ crumbs, current }: { crumbs: Crumb[]; current?: string }) {
  return (
    <nav aria-label="Breadcrumb" className="min-w-0">
      <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[13px] text-muted">
        {crumbs.map((c) => (
          <li key={c.href} className="flex min-w-0 items-center gap-1.5">
            <Link href={c.href} className="truncate rounded-sm hover:text-navy hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy/40">
              {c.label}
            </Link>
            <AdminIcon name="chevronRight" size={12} className="shrink-0 text-muted/70" />
          </li>
        ))}
        {current && (
          <li aria-current="page" className="min-w-0 truncate text-navy">
            {current}
          </li>
        )}
      </ol>
    </nav>
  );
}

/**
 * Every admin page's header: where it sits (breadcrumb), its name as a 24px title, one quiet line about it, and
 * its actions on the right. `back` is the older single link, shown as a one-level breadcrumb.
 */
export function AdminHeading({
  title,
  intro,
  actions,
  back,
  crumbs,
  current,
}: {
  title: string;
  intro?: ReactNode;
  actions?: ReactNode;
  back?: { href: string; label: string };
  crumbs?: Crumb[];
  /** The breadcrumb's last item, when it should be shorter than the title. */
  current?: string;
}) {
  const trail = crumbs ?? (back ? [{ href: back.href, label: back.label.replace(/^←\s*/, '') }] : []);
  return (
    <header className="flex flex-col gap-2">
      {trail.length > 0 && <Breadcrumbs crumbs={trail} current={current} />}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 flex-col gap-1">
          <h1 className="text-[22px] font-bold leading-tight tracking-[-0.01em] lg:text-[24px]">{title}</h1>
          {intro && <div className="text-sm text-muted">{intro}</div>}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </header>
  );
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <section className={`flex flex-col gap-4 rounded-[8px] border border-line bg-white p-5 ${className}`}>
      {children}
    </section>
  );
}

/** A link styled as a button: `primary` is the page's one filled action. */
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

/** Tabs as links (each tab has its own address): underlined on one rule, with an optional count in grey. */
export function AdminTabs({ items, label }: { items: TabItem[]; label: string }) {
  return (
    <nav aria-label={label} className="-mx-1 overflow-x-auto border-b border-line px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <ul className="flex gap-5">
        {items.map((tab) => (
          <li key={tab.href} className="flex-none">
            <Link
              href={tab.href}
              aria-current={tab.current ? 'page' : undefined}
              className={`-mb-px inline-flex items-center gap-1.5 border-b-2 py-2.5 text-sm font-semibold transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy/40 ${
                tab.current ? 'border-navy text-navy' : 'border-transparent text-muted hover:text-navy'
              }`}
            >
              {tab.label}
              {tab.count !== undefined && <span className="text-[13px] font-normal text-muted">{tab.count}</span>}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/** An empty list that says so in one sentence, keeping its frame, with the next thing to do when there is one. */
export function EmptyState({ text, action }: { icon?: AdminIconName; text: string; action?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-[8px] border border-dashed border-line bg-white px-4 py-3.5">
      <p className="text-sm text-muted">{text}</p>
      {action}
    </div>
  );
}

/** "How this works" box with numbered steps. */
export function HowItWorks({ title, steps }: { title: string; steps: string[] }) {
  return (
    <section className="flex flex-col gap-3 rounded-[8px] border border-line bg-white p-5">
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
    <p role="alert" className="flex items-center gap-2 rounded-[8px] border border-line bg-white p-4 text-sm">
      <AdminIcon name="alert" size={18} className="text-[#b33a35]" />
      {text}
    </p>
  );
}

/**
 * The line under a list: "1–20 of 48" on the left; rows per page, previous, nearby pages and next on the right.
 * Arrows with nowhere to go are dimmed. `href(page)` and `sizeHref(size)` keep the list's filters and sort.
 */
export function Pagination({
  page,
  pageSize,
  total,
  href,
  sizeHref,
  sizes = [10, 20, 50],
  t,
}: {
  page: number;
  pageSize: number;
  total: number;
  href: (page: number) => string;
  sizeHref?: (size: number) => string;
  sizes?: readonly number[];
  t: AdminDict['pagination'];
}) {
  if (total === 0) return null;
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  const shown = [...new Set([1, page - 1, page, page + 1, pages])].filter((p) => p >= 1 && p <= pages).sort((a, b) => a - b);
  const cell = 'inline-flex h-8 min-w-8 items-center justify-center rounded-[6px] px-2 text-[13px] tabular-nums';
  const ring = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy/40';
  const arrow = (to: number | null, icon: 'arrowLeft' | 'arrowRight', aria: string) =>
    to === null ? (
      <span aria-label={aria} aria-disabled="true" className={`${cell} cursor-not-allowed text-muted/40`}>
        <AdminIcon name={icon} size={15} />
      </span>
    ) : (
      <Link href={href(to)} aria-label={aria} className={`${cell} text-navy hover:bg-[#f1f2f4] ${ring}`}>
        <AdminIcon name={icon} size={15} />
      </Link>
    );
  return (
    <nav aria-label={t.label} className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 px-1">
      <p className="text-[13px] tabular-nums text-muted">{format(t.range, { from, to, total })}</p>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        {sizeHref && total > sizes[0]! && (
          <div className="flex items-center gap-1 text-[13px]">
            <span className="mr-1 text-muted">{t.perPage}</span>
            {sizes.map((size) => (
              <Link
                key={size}
                href={sizeHref(size)}
                aria-current={size === pageSize ? 'true' : undefined}
                className={`${cell} ${ring} ${size === pageSize ? 'bg-[#eeeff1] font-semibold text-navy' : 'text-muted hover:text-navy'}`}
              >
                {size}
              </Link>
            ))}
          </div>
        )}
        {pages > 1 && (
          <div className="flex items-center gap-0.5">
            {arrow(page > 1 ? page - 1 : null, 'arrowLeft', t.previous)}
            {shown.map((p, i) => (
              <span key={p} className="flex items-center gap-0.5">
                {i > 0 && p - shown[i - 1]! > 1 && <span className="px-1 text-muted">…</span>}
                <Link
                  href={href(p)}
                  aria-label={format(t.page, { page: p })}
                  aria-current={p === page ? 'page' : undefined}
                  className={`${cell} ${ring} ${p === page ? 'bg-navy font-semibold text-white' : 'text-navy hover:bg-[#f1f2f4]'}`}
                >
                  {p}
                </Link>
              </span>
            ))}
            {arrow(page < pages ? page + 1 : null, 'arrowRight', t.next)}
          </div>
        )}
      </div>
    </nav>
  );
}

/** Class names shared by every admin table, so lists look and behave alike. */
export const tableStyle = {
  shell: 'overflow-x-auto rounded-[8px] border border-line bg-white',
  table: 'w-full text-left text-sm',
  head: 'border-b border-line text-[12px] text-muted',
  th: 'h-10 whitespace-nowrap px-4 font-normal',
  row: 'group/row relative border-t border-[#f0f1f3] transition-[background-color,box-shadow] duration-150 first:border-t-0 hover:bg-[#f5f7fb] active:bg-[#eef2f8] hover:shadow-[inset_3px_0_0_#1b2a4a] has-[a:focus-visible]:bg-[#f5f7fb] has-[a:focus-visible]:shadow-[inset_3px_0_0_#1b2a4a] motion-reduce:transition-none',
  /** The row number column. */
  numTh: 'h-10 w-12 whitespace-nowrap pl-4 pr-0 text-right font-normal',
  numTd: 'w-12 pl-4 pr-0 text-right align-middle text-[13px] tabular-nums text-muted transition-colors duration-150 group-hover/row:text-navy',
  td: 'px-4 py-3 align-middle',
  sub: 'mt-0.5 text-[13px] text-muted',
};

/** The last cell of a clickable row: an arrow that slides in on hover, saying the row opens. */
export function RowArrow() {
  return (
    <td aria-hidden className="w-10 pr-3 align-middle">
      <AdminIcon
        name="chevronRight"
        size={16}
        className="pointer-events-none -translate-x-1 text-navy opacity-0 transition-[opacity,transform] duration-150 group-hover/row:translate-x-0 group-hover/row:opacity-100 group-has-[a:focus-visible]/row:translate-x-0 group-has-[a:focus-visible]/row:opacity-100 motion-reduce:transition-none"
      />
    </td>
  );
}

/** The row's name, as the link that opens it; the whole row is clickable through it. */
export function RowLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="font-semibold text-navy underline-offset-2 after:absolute after:inset-0 after:content-[''] group-hover/row:underline focus-visible:outline-none">
      {children}
    </Link>
  );
}

/** A column heading that sorts the list; pressing it again flips the order. Only the sorted column shows its arrow. */
export function SortHeader({ label, active, direction, href, className = '' }: { label: string; active: boolean; direction: 'asc' | 'desc'; href: string; className?: string }) {
  return (
    <th aria-sort={active ? (direction === 'asc' ? 'ascending' : 'descending') : 'none'} className={`${tableStyle.th} ${className}`}>
      <Link
        href={href}
        className={`group inline-flex items-center gap-1 rounded-sm hover:text-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy/40 ${active ? 'font-medium text-navy' : ''}`}
      >
        {label}
        <AdminIcon
          name={active && direction === 'desc' ? 'chevronDown' : 'chevronUp'}
          size={12}
          className={active ? '' : 'opacity-0 transition-opacity duration-150 group-hover:opacity-50 group-focus-visible:opacity-50'}
        />
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

/**
 * A list's search: one field that searches on Enter, keeping the list's other settings (`keep`) as hidden fields.
 * Filters and other controls go in `children`, on the same row.
 */
export function ListToolbar({ action, query, placeholder, keep = [], children }: { action: string; query: string; placeholder: string; keep?: Array<[string, string]>; children?: ReactNode }) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <form action={action} role="search" className="min-w-0 flex-1 sm:max-w-[420px]">
        {keep.map(([name, value]) => (
          <input key={name} type="hidden" name={name} value={value} />
        ))}
        <label className="flex h-9 items-center gap-2 rounded-[6px] border border-[#d1d5db] bg-white px-3 text-muted transition-colors focus-within:border-navy focus-within:ring-2 focus-within:ring-navy/15">
          <AdminIcon name="search" size={15} />
          <span className="sr-only">{placeholder}</span>
          <input type="search" name="q" defaultValue={query} placeholder={placeholder} className="min-w-0 flex-1 bg-transparent text-sm text-navy outline-none placeholder:text-[#6b6b6b]" />
        </label>
        <button type="submit" className="sr-only">
          {placeholder}
        </button>
      </form>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  );
}
