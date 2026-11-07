'use client';

import { useRef, useState, type ReactNode } from 'react';
import { bulkReview, type AdminFormState } from '@/lib/admin/actions';
import { format, type Dictionary, type Locale } from '@/lib/i18n/locale';
import { useFormAction } from '@/components/ui/use-form-action';
import { AdminIcon } from './icons';
import { IconText, buttonClass } from './ui';

type Texts = Dictionary['admin']['tasks']['bulk'];

/**
 * Wraps the task list (its rows carry the checkboxes) with "select all", a count, and one action for the chosen
 * items: send for review or approve. The action asks first, then lists anything that could not go through and why.
 */
export function BulkTasks({ locale, action, total, t, errors, children }: {
  locale: Locale;
  action: 'submit' | 'approve';
  /** How many rows on this page can be chosen. */
  total: number;
  t: Texts;
  errors: Dictionary['admin']['errors'];
  children: ReactNode;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [count, setCount] = useState(0);
  const [confirming, setConfirming] = useState(false);
  const [state, onSubmit, pending] = useFormAction<AdminFormState>(bulkReview, {});
  const boxes = () => [...(formRef.current?.querySelectorAll<HTMLInputElement>('input[name="items"]') ?? [])];
  const recount = () => setCount(boxes().filter((b) => b.checked).length);
  // After a bulk action the list reloads; the confirm box closes and nothing stays ticked.
  const [seen, setSeen] = useState(state.savedAt);
  if (state.savedAt !== seen) {
    setSeen(state.savedAt);
    setConfirming(false);
    setCount(0);
  }
  const all = count > 0 && count === total;

  return (
    <form ref={formRef} onSubmit={onSubmit} onChange={recount} className="flex flex-col gap-3">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="bulkAction" value={action} />
      {total > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-[12px] border border-line bg-white px-4 py-2.5">
          <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold">
            <input
              type="checkbox"
              checked={all}
              onChange={() => {
                boxes().forEach((b) => (b.checked = !all));
                recount();
              }}
              className="size-4 accent-[#1b2a4a]"
            />
            {t.selectAll}
          </label>
          <span className="flex-1 text-[13px] text-muted">{format(t.selected, { count, total })}</span>
          <button type="button" disabled={count === 0 || pending} onClick={() => setConfirming(true)} className={buttonClass(action === 'approve' ? 'primary' : 'accent', 'sm')}>
            <IconText icon={action === 'approve' ? 'check' : 'send'}>{format(action === 'approve' ? t.approve : t.submit, { count })}</IconText>
          </button>
        </div>
      )}
      {confirming && (
        <div role="alertdialog" aria-label={action === 'approve' ? t.approveTitle : t.submitTitle} className="flex flex-col gap-3 rounded-[12px] border border-[#e0a800]/50 bg-cream px-4 py-3">
          <p className="flex items-start gap-2 text-sm">
            <AdminIcon name="alert" size={18} className="mt-0.5 shrink-0" />
            <span>
              <span className="font-semibold">{format(action === 'approve' ? t.approveTitle : t.submitTitle, { count })}</span> {action === 'approve' ? t.approveBody : t.submitBody}
            </span>
          </p>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setConfirming(false)} disabled={pending} className={buttonClass('secondary', 'sm')}>
              {t.cancel}
            </button>
            <button type="submit" disabled={pending} className={buttonClass('primary', 'sm')}>
              <IconText icon={action === 'approve' ? 'check' : 'send'} busy={pending}>
                {t.yes}
              </IconText>
            </button>
          </div>
        </div>
      )}
      {!pending && state.bulk && (
        <div role="status" className={`flex flex-col gap-1 rounded-[12px] px-4 py-3 text-sm ${state.bulk.failed.length ? 'bg-cream' : 'bg-mint text-[#1f6b47]'}`}>
          <p className="font-semibold">{format(action === 'approve' ? t.approved : t.sent, { count: state.bulk.done })}</p>
          {state.bulk.failed.length > 0 && (
            <>
              <p>{format(t.failed, { count: state.bulk.failed.length })}</p>
              <ul className="list-disc pl-5 text-[13px]">
                {state.bulk.failed.map((f, i) => (
                  <li key={i}>
                    {f.name}: {errors[f.error]}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
      {!pending && state.error && <p className="text-[13px] text-red">{errors[state.error]}</p>}
      {/* A fresh list after each bulk action, so nothing stays ticked. */}
      <div key={state.savedAt ?? 0}>{children}</div>
    </form>
  );
}
