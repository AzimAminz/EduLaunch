'use client';

import { AdminIcon } from './icons';

/**
 * The steps of writing a requirement: route, Syarat Am, Syarat Khas, check and send. The route is chosen once (step
 * 1, before the draft exists), so in the editor only the later steps can be opened.
 */
export function RequirementSteps({ labels, step, onStep }: { labels: readonly string[]; step: number; onStep?: (index: number) => void }) {
  return (
    <ol className="flex flex-wrap items-center gap-x-2 gap-y-2">
      {labels.map((label, i) => {
        const inner = (
          <>
            <span className={`flex size-7 items-center justify-center rounded-full text-xs ${i === step ? 'bg-white text-navy' : i < step ? 'bg-[#1f6b47] text-white' : 'bg-bg text-muted'}`}>
              {i < step ? <AdminIcon name="check" size={14} /> : i + 1}
            </span>
            <span className={i <= step ? '' : 'text-muted'}>{label}</span>
          </>
        );
        const look = `flex items-center gap-2 rounded-full py-1 pl-1 pr-3 text-sm font-semibold ${i === step ? 'bg-navy text-white' : ''}`;
        return (
          <li key={label} className="flex items-center gap-2">
            {onStep && i > 0 ? (
              <button
                // A key per step, so React never turns one step's button into another (see the programme form).
                key={`step-${i}`}
                type="button"
                onClick={() => onStep(i)}
                aria-current={i === step ? 'step' : undefined}
                className={`${look} transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy/40 ${i === step ? '' : 'hover:bg-bg'}`}
              >
                {inner}
              </button>
            ) : (
              <span aria-current={i === step ? 'step' : undefined} className={look}>
                {inner}
              </span>
            )}
            {i < labels.length - 1 && <span aria-hidden className="h-px w-6 bg-line" />}
          </li>
        );
      })}
    </ol>
  );
}
