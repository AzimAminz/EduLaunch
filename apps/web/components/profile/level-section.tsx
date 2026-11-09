'use client';

import { useState, type ReactNode } from 'react';

/**
 * The education level panel: the current level in words, and a "Change" button that opens the level picker in
 * place (it closes again with "Cancel").
 */
export function LevelSection({ level, hint, changeLabel, cancelLabel, startOpen = false, children }: { level: string; hint: string; changeLabel: string; cancelLabel: string; startOpen?: boolean; children: ReactNode }) {
  const [open, setOpen] = useState(startOpen);
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[17px] font-semibold">{level}</p>
        <button
          type="button"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          className="h-10 shrink-0 rounded-[10px] border border-line bg-white px-4 text-sm font-semibold transition-colors hover:border-navy/40 hover:bg-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy/40"
        >
          {open ? cancelLabel : changeLabel}
        </button>
      </div>
      {open && (
        <div className="flex flex-col gap-4 border-t border-line pt-4">
          <p className="text-sm text-muted">{hint}</p>
          {children}
        </div>
      )}
    </div>
  );
}
