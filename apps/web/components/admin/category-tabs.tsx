'use client';

import Link from 'next/link';
import { useState, type ReactNode } from 'react';
import { parseRequirementText, type CategoryGroup, type TextBlock } from '@/lib/admin/epanduan-text';
import type { Dictionary, Locale } from '@/lib/i18n/locale';
import { AdminIcon } from './icons';
import { RemoveDraftModal } from './remove-draft-modal';
import { RequirementBlocks } from './requirement-blocks';
import { IconText, buttonClass } from './ui';

type ImportDict = Dictionary['admin']['institutions']['import'];
type Item = Extract<TextBlock, { kind: 'item' }>;

/** The programme's own requirements for one tab (its route), on the programme page. */
export interface TabState {
  /** Names the tab when it has no ePanduan categories (a route written without ePanduan). */
  label?: string;
  status: 'published' | 'draft' | 'in_review' | 'returned' | null;
  /** "Draf · oleh anda", "Diterbitkan · v2"… */
  statusText: string;
  href: string | null;
  /** What edit mode removes: the route, with the admin's own draft if there is one (null when it cannot be removed). */
  removable: { draftId: string | null; programId: string; entryRoute: string; name: string } | null;
}

export interface TabManage {
  locale: Locale;
  states: Record<string, TabState>;
  addHref: string;
  texts: { edit: string; done: string; add: string; open: string; remove: string; noSource: string; legend: string; editHint: string };
  modal: { title: string; body: string; yes: string; cancel: string };
  errors: Dictionary['admin']['errors'];
}

const DOT: Record<NonNullable<TabState['status']> | 'none', string> = {
  published: 'bg-[#2f9e6a]',
  draft: 'bg-[#e0a800]',
  in_review: 'bg-[#3b6fd8]',
  returned: 'bg-[#d24b45]',
  none: 'bg-[#c3c9d4]',
};

const labelOf = (jenprog: string, category: string, m: ImportDict) => (m.categories as Record<string, string>)[`${jenprog}:${category}`] ?? `${jenprog.toUpperCase()} ${category}`;

/**
 * Requirements by candidate category as tabs; categories that share the same text share one tab. Each tab shows
 * Syarat Am and Syarat Khas as blocks. `action` lets the editor add a row as a rule.
 */
export function CategoryTabs({
  groups,
  m,
  action,
  stacked = false,
  below,
  empty,
  manage,
}: {
  groups: CategoryGroup[];
  m: ImportDict;
  action?: (item: Item, index: number, part: 'general' | 'special') => ReactNode;
  /** One column (for a narrow side panel) instead of Syarat Am and Syarat Khas side by side. */
  stacked?: boolean;
  /** Shown under the tab row, the same for every tab (the programme page's add action and written requirements). */
  below?: ReactNode;
  /** Shown when no category has requirement text (defaults to "none"). */
  empty?: string;
  /** On the programme page: each tab's own requirements, edit mode (remove a draft) and the add action. */
  manage?: TabManage;
}) {
  const [active, setActive] = useState(0);
  const [editing, setEditing] = useState(false);
  const [removing, setRemoving] = useState<TabState['removable']>(null);
  const group = groups[Math.min(active, groups.length - 1)];
  const nameOf = (g: CategoryGroup) => manage?.states[g.key]?.label ?? g.categories.map((c) => labelOf(c.jenprog, c.category, m)).join(' · ');
  const toolbar = manage && (
    <div className="flex shrink-0 items-center gap-2 sm:pt-2">
      {groups.length > 0 && (
        <button key="edit" type="button" onClick={() => setEditing(!editing)} aria-pressed={editing} className={buttonClass(editing ? 'primary' : 'secondary', 'sm')}>
          <IconText icon={editing ? 'check' : 'pencil'}>{editing ? manage.texts.done : manage.texts.edit}</IconText>
        </button>
      )}
      <Link href={manage.addHref} className={buttonClass('accent', 'sm')}>
        <IconText icon="plus">{manage.texts.add}</IconText>
      </Link>
    </div>
  );
  if (!group)
    return (
      <div className="flex flex-col gap-3">
        {toolbar && <div className="flex justify-end">{toolbar}</div>}
        {below}
        <p className="rounded-[12px] bg-bg px-4 py-3 text-[13px] text-muted">{empty ?? m.none}</p>
      </div>
    );
  const special = group.special;
  const state = manage?.states[group.key];
  return (
    <div className="flex flex-col gap-3">
      {(groups.length > 1 || manage) && (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
          {/* Room above the tabs for the remove badges in edit mode. */}
          <div role="tablist" aria-label={m.general} className="flex min-w-0 flex-1 flex-wrap gap-x-2 gap-y-2.5 pt-2">
            {groups.map((g, i) => {
              const own = manage?.states[g.key];
              return (
                <span key={g.key} className="relative shrink-0">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={i === active}
                    onClick={() => setActive(i)}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-semibold transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy/40 ${
                      i === active ? 'border-navy bg-navy text-white' : 'border-line bg-white text-navy hover:bg-bg'
                    } ${editing && own?.removable ? 'ring-2 ring-red/30' : ''}`}
                  >
                    {own && <span aria-hidden className={`size-2 rounded-full ${DOT[own.status ?? 'none']} ${i === active ? 'ring-2 ring-white/70' : ''}`} />}
                    {nameOf(g)}
                    {own && <span className="sr-only">: {own.statusText}</span>}
                  </button>
                  {editing && own?.removable && (
                    <button
                      type="button"
                      onClick={() => setRemoving(own.removable)}
                      aria-label={`${manage!.texts.remove}: ${own.removable.name}`}
                      title={manage!.texts.remove}
                      className="absolute -right-1.5 -top-2 flex size-6 items-center justify-center rounded-full bg-red text-white shadow-md transition-transform duration-150 hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy/40 motion-reduce:transition-none"
                    >
                      <AdminIcon name="trash" size={12} />
                    </button>
                  )}
                </span>
              );
            })}
          </div>
          {toolbar}
        </div>
      )}
      {editing && manage && (
        <p role="status" className="flex items-center gap-2 rounded-[12px] bg-cream px-4 py-2.5 text-[13px]">
          <AdminIcon name="info" size={16} className="shrink-0" />
          {manage.texts.editHint}
        </p>
      )}
      {groups.length === 1 && !manage && <p className="text-[12px] font-semibold text-muted">{nameOf(group)}</p>}
      {manage && (
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted">
          {manage.texts.legend.split('|').map((label, i) => (
            <span key={label} className="inline-flex items-center gap-1">
              <span aria-hidden className={`size-2 rounded-full ${DOT[(['published', 'draft', 'in_review', 'returned', 'none'] as const)[i]!]}`} />
              {label}
            </span>
          ))}
        </p>
      )}
      {state && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-[12px] bg-bg/60 px-4 py-2.5">
          <p className="inline-flex items-center gap-2 text-[13px] font-semibold">
            <span aria-hidden className={`size-2 rounded-full ${DOT[state.status ?? 'none']}`} />
            {state.statusText}
          </p>
          {state.href && (
            <Link href={state.href} className="inline-flex items-center gap-1 text-[13px] font-semibold text-navy hover:underline">
              {manage!.texts.open}
              <AdminIcon name="chevronRight" size={15} />
            </Link>
          )}
        </div>
      )}
      {below}
      {manage && removing && (
        <RemoveDraftModal locale={manage.locale} target={removing} texts={manage.modal} errors={manage.errors} onClose={() => setRemoving(null)} />
      )}
      {manage && group.categories.length === 0 ? (
        <p className="rounded-[12px] bg-bg px-4 py-3 text-[13px] text-muted">{manage.texts.noSource}</p>
      ) : (
      <div role="tabpanel" className={`grid gap-3 ${stacked ? '' : 'xl:grid-cols-2'}`}>
        <section className="flex flex-col gap-2 rounded-[12px] border border-line bg-white p-3">
          <h4 className="text-[12px] font-bold uppercase tracking-wide text-muted">{m.general}</h4>
          <RequirementBlocks blocks={parseRequirementText(group.general)} empty={m.none} action={action ? (item, i) => action(item, i, 'general') : undefined} />
        </section>
        <section className="flex flex-col gap-2 rounded-[12px] border border-line bg-white p-3">
          <h4 className="text-[12px] font-bold uppercase tracking-wide text-muted">{m.special}</h4>
          {!special ? (
            <p className="text-[13px] text-muted">{m.specialLater}</p>
          ) : special.status === 'pending' ? (
            <p className="text-[13px] text-muted">{m.specialReading}</p>
          ) : special.status === 'failed' ? (
            <p className="text-[13px] text-[#b33a35]">{m.specialFailed}</p>
          ) : (
            <RequirementBlocks blocks={parseRequirementText(special.text)} empty={m.none} action={action ? (item, i) => action(item, i, 'special') : undefined} />
          )}
        </section>
      </div>
      )}
    </div>
  );
}
