'use client';

import Link from 'next/link';
import { useState } from 'react';
import type { CategoryGroup } from '@/lib/admin/epanduan-text';
import { format, type Dictionary, type Locale } from '@/lib/i18n/locale';
import { CategoryTabs } from './category-tabs';
import { AdminIcon } from './icons';
import { RemoveDraftModal } from './remove-draft-modal';
import { IconText, buttonClass } from './ui';

type Status = 'published' | 'draft' | 'in_review' | 'returned' | null;

/** One of the programme's routes: its requirements (if written) and the ePanduan text it is written from. */
export interface RouteTab {
  key: string;
  route: string;
  name: string;
  /** The candidate categories it is for ("STPM Sains"), shown when a route has more than one tab. */
  detail: string | null;
  status: Status;
  /** Short, for the tab: "Draf · anda", "Diterbitkan · v1". */
  statusText: string;
  /** The requirement to open, or null when none is written yet. */
  href: string | null;
  /** Starts writing requirements for this route (step 1 with the route chosen). */
  startHref: string;
  /** ePanduan categories for this route (empty for a route written without ePanduan). */
  groups: CategoryGroup[];
  /** What edit mode removes (null when it cannot be removed). */
  removable: { draftId: string | null; programId: string; entryRoute: string; categories: string[]; name: string } | null;
}

const TONE: Record<NonNullable<Status> | 'none', { dot: string; text: string }> = {
  published: { dot: 'bg-[#2f9e6a]', text: 'text-[#1f6b47]' },
  draft: { dot: 'bg-[#e0a800]', text: 'text-[#8a6300]' },
  in_review: { dot: 'bg-[#3b6fd8]', text: 'text-[#2b55aa]' },
  returned: { dot: 'bg-[#d24b45]', text: 'text-[#b33a35]' },
  none: { dot: 'bg-[#c3c9d4]', text: 'text-muted' },
};

type Texts = Dictionary['admin']['programme']['requirements'];

/**
 * The programme's requirements by route: a tab per route (in route order) that names it and says where its
 * requirements stand, so no legend is needed. The tab shows the ePanduan text the route is written from (by
 * category when several), with "open" or "write requirements". The row ends with edit (delete a route with its
 * draft, after a confirm) and add requirements.
 */
export function RouteTabs({ locale, tabs, addHref, t, m, errors }: {
  locale: Locale;
  tabs: RouteTab[];
  addHref: string;
  t: Texts;
  m: Dictionary['admin']['institutions']['import'];
  errors: Dictionary['admin']['errors'];
}) {
  const [active, setActive] = useState(0);
  const [editing, setEditing] = useState(false);
  const [removing, setRemoving] = useState<RouteTab['removable']>(null);
  const tab = tabs[Math.min(active, tabs.length - 1)];
  const tone = (s: Status) => TONE[s ?? 'none'];

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        {/* Room above the tabs for the delete badges in edit mode. */}
        <div role="tablist" aria-label={t.title} className="flex min-w-0 flex-wrap gap-2 pt-2">
          {tabs.map((x, i) => {
            const on = i === active;
            return (
              <span key={x.key} className="relative">
                <button
                  type="button"
                  role="tab"
                  aria-selected={on}
                  onClick={() => setActive(i)}
                  className={`flex min-w-[150px] flex-col items-start gap-0.5 rounded-[12px] border px-3.5 py-2 text-left transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy/40 ${
                    on ? 'border-navy bg-navy text-white' : 'border-line bg-white text-navy hover:border-navy/30 hover:bg-bg/60'
                  } ${editing && x.removable ? 'ring-2 ring-red/30' : ''}`}
                >
                  <span className="text-[13px] font-semibold">{x.name}</span>
                  {x.detail && <span className={`max-w-[220px] truncate text-[11px] ${on ? 'text-white/70' : 'text-muted'}`}>{x.detail}</span>}
                  <span className={`inline-flex items-center gap-1.5 text-[12px] ${on ? 'text-white/80' : tone(x.status).text}`}>
                    <span aria-hidden className={`size-1.5 rounded-full ${tone(x.status).dot}`} />
                    {x.statusText}
                  </span>
                </button>
                {editing && x.removable && (
                  <button
                    type="button"
                    onClick={() => setRemoving(x.removable)}
                    aria-label={`${t.manage.remove}: ${x.name}`}
                    title={t.manage.remove}
                    className="absolute -right-2 -top-2 flex size-6 items-center justify-center rounded-full bg-red text-white shadow-md transition-transform duration-150 hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy/40 motion-reduce:transition-none"
                  >
                    <AdminIcon name="trash" size={12} />
                  </button>
                )}
              </span>
            );
          })}
        </div>
        <div className="flex shrink-0 items-center gap-2 sm:pt-2">
          {tabs.length > 0 && (
            <button key="edit" type="button" onClick={() => setEditing(!editing)} aria-pressed={editing} className={buttonClass(editing ? 'primary' : 'secondary', 'sm')}>
              <IconText icon={editing ? 'check' : 'pencil'}>{editing ? t.manage.done : t.manage.edit}</IconText>
            </button>
          )}
          <Link href={addHref} className={buttonClass('accent', 'sm')}>
            <IconText icon="plus">{t.manage.add}</IconText>
          </Link>
        </div>
      </div>

      {editing && (
        <p role="status" className="flex items-center gap-2 rounded-[12px] bg-cream px-4 py-2.5 text-[13px]">
          <AdminIcon name="info" size={16} className="shrink-0" />
          {t.manage.editHint}
        </p>
      )}

      {!tab ? (
        <p className="rounded-[12px] bg-bg px-4 py-3 text-sm text-muted">{t.writtenNone}</p>
      ) : (
        <div role="tabpanel" className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-[12px] bg-bg/60 px-4 py-2.5">
            <p className="text-sm font-semibold">{format(t.routeHeading, { route: tab.detail ? `${tab.name} (${tab.detail})` : tab.name })}</p>
            {tab.href ? (
              <Link href={tab.href} className={buttonClass('primary', 'sm')}>
                <IconText icon={tab.status === 'published' ? 'eye' : 'pencil'}>{tab.status === 'published' ? t.view : t.openDraft}</IconText>
              </Link>
            ) : (
              <Link href={tab.startHref} className={buttonClass('accent', 'sm')}>
                <IconText icon="plus">{t.start}</IconText>
              </Link>
            )}
          </div>
          {tab.groups.length > 0 && <CategoryTabs groups={tab.groups} m={m} />}
        </div>
      )}

      {removing && <RemoveDraftModal locale={locale} target={removing} texts={t.removeModal} errors={errors} onClose={() => setRemoving(null)} />}
    </div>
  );
}
