import type { ReactNode } from 'react';
import type { TextBlock } from '@/lib/admin/epanduan-text';

type Item = Extract<TextBlock, { kind: 'item' }>;

/**
 * Requirement text as blocks a person can scan: section labels (SPM, STPM, MUET), one row per requirement, subject
 * lists as chips, and DAN / ATAU as dividers. `action` adds something to the end of a row (the editor's "Add").
 */
export function RequirementBlocks({ blocks, action, empty }: { blocks: TextBlock[]; action?: (item: Item, index: number) => ReactNode; empty: string }) {
  if (blocks.length === 0) return <p className="text-[13px] text-muted">{empty}</p>;
  return (
    <div className="flex flex-col gap-1.5">
      {blocks.map((block, i) => {
        if (block.kind === 'heading') {
          return (
            <p key={i} className="mt-1 self-start rounded-md bg-navy/90 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-white">
              {block.text}
            </p>
          );
        }
        if (block.kind === 'join') {
          const or = block.text === 'ATAU';
          return (
            <div key={i} role="separator" className="flex items-center gap-2 py-0.5">
              <span className={`h-px flex-1 ${or ? 'bg-[#e0a800]/50' : 'bg-line'}`} />
              <span className={`rounded-full px-2 text-[11px] font-bold ${or ? 'bg-yellow text-navy' : 'bg-bg text-muted'}`}>{block.text}</span>
              <span className={`h-px flex-1 ${or ? 'bg-[#e0a800]/50' : 'bg-line'}`} />
            </div>
          );
        }
        return (
          <div key={i} className="flex items-start gap-2 rounded-[10px] px-2 py-1.5 transition-colors duration-150 hover:bg-bg/80">
            <span aria-hidden className="mt-[7px] size-1.5 shrink-0 rounded-full bg-navy/50" />
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <p className="text-[13px] leading-relaxed">{block.text}</p>
              {block.subjects.length > 0 && (
                <ul className="flex flex-wrap gap-1">
                  {block.subjects.map((s) => (
                    <li key={s} className="rounded-full border border-line bg-white px-2 py-0.5 text-[12px]">
                      {s}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            {action?.(block, i)}
          </div>
        );
      })}
    </div>
  );
}
