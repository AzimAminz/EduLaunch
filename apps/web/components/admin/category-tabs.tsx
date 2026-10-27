'use client';

import { useState, type ReactNode } from 'react';
import { parseRequirementText, type CategoryGroup, type TextBlock } from '@/lib/admin/epanduan-text';
import type { Dictionary } from '@/lib/i18n/locale';
import { RequirementBlocks } from './requirement-blocks';

type ImportDict = Dictionary['admin']['institutions']['import'];
type Item = Extract<TextBlock, { kind: 'item' }>;

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
}: {
  groups: CategoryGroup[];
  m: ImportDict;
  action?: (item: Item, index: number, part: 'general' | 'special') => ReactNode;
  /** One column (for a narrow side panel) instead of Syarat Am and Syarat Khas side by side. */
  stacked?: boolean;
}) {
  const [active, setActive] = useState(0);
  const group = groups[Math.min(active, groups.length - 1)];
  if (!group) return <p className="text-[13px] text-muted">{m.none}</p>;
  const special = group.special;
  return (
    <div className="flex flex-col gap-3">
      {groups.length > 1 && (
        <div role="tablist" aria-label={m.general} className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1">
          {groups.map((g, i) => (
            <button
              key={g.key}
              type="button"
              role="tab"
              aria-selected={i === active}
              onClick={() => setActive(i)}
              className={`shrink-0 rounded-full border px-3 py-1.5 text-[12px] font-semibold transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy/40 ${
                i === active ? 'border-navy bg-navy text-white' : 'border-line bg-white text-navy hover:bg-bg'
              }`}
            >
              {g.categories.map((c) => labelOf(c.jenprog, c.category, m)).join(' · ')}
            </button>
          ))}
        </div>
      )}
      {groups.length === 1 && (
        <p className="text-[12px] font-semibold text-muted">{group.categories.map((c) => labelOf(c.jenprog, c.category, m)).join(' · ')}</p>
      )}
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
    </div>
  );
}
