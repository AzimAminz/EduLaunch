'use client';

import { useTransition } from 'react';
import { Notice } from '@/components/ui/notice';
import { useFormAction } from '@/components/ui/use-form-action';
import type { Dictionary } from '@/lib/i18n/locale';
import { clearPlan, savePlan, type PlanState } from '@/lib/roadmap/actions';

type T = Dictionary['roadmap']['plan'];

/** Pick a career the target programme leads to (from ePanduan) and save the plan. */
export function PlanForm({ target, careers, chosen, t }: { target: string; careers: string[]; chosen: string | null; t: T }) {
  const [state, onSubmit, pending] = useFormAction<PlanState>(savePlan, {});
  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3">
      <input type="hidden" name="target" value={target} />
      {careers.length > 0 ? (
        <fieldset className="flex min-w-0 flex-col gap-2">
          <legend className="pb-1 text-sm font-semibold">{t.chooseCareer}</legend>
          <div className="flex flex-wrap gap-2">
            {careers.map((c) => (
              <label key={c} className="cursor-pointer">
                <input type="radio" name="career" value={c} defaultChecked={c === chosen} className="peer sr-only" />
                <span className="inline-flex min-h-10 items-center rounded-full border border-line bg-white px-4 text-sm font-semibold transition-colors peer-checked:border-navy peer-checked:bg-navy peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-navy/40 hover:bg-bg">
                  {c}
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      ) : (
        <p className="rounded-[12px] bg-bg px-4 py-3 text-sm text-muted">{t.noCareers}</p>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending} className="inline-flex h-11 items-center rounded-[12px] bg-navy px-5 text-sm font-semibold text-white hover:bg-navy/90 disabled:opacity-60">
          {pending ? t.saving : t.save}
        </button>
        <Notice showKey={state.savedAt}>{t.saved}</Notice>
        {state.error && !pending && <span className="text-[13px] text-[#b33a35]">{t.error}</span>}
      </div>
    </form>
  );
}

export function ClearPlan({ label }: { label: string }) {
  const [pending, start] = useTransition();
  return (
    <button type="button" disabled={pending} onClick={() => start(async () => void (await clearPlan()))} className="text-sm font-semibold text-muted underline underline-offset-2 hover:text-navy disabled:opacity-60">
      {label}
    </button>
  );
}
