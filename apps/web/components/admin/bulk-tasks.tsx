'use client';

import { useRef, useState, type ReactNode } from 'react';
import { bulkReview, type AdminFormState } from '@/lib/admin/actions';
import { format, type Dictionary, type Locale } from '@/lib/i18n/locale';
import { Modal } from '@/components/ui/modal';
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
  const formId = `bulk-${action}`;
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
    <form id={formId} ref={formRef} onSubmit={onSubmit} onChange={recount} className="flex flex-col gap-3">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="bulkAction" value={action} />
      {total > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-[8px] border border-line bg-white px-4 py-2">
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
      <Modal
        open={confirming}
        onClose={() => setConfirming(false)}
        alert
        busy={pending}
        tone={action === 'approve' ? 'neutral' : 'warn'}
        icon={<AdminIcon name={action === 'approve' ? 'check' : 'send'} size={20} />}
        title={format(action === 'approve' ? t.approveTitle : t.submitTitle, { count })}
        description={action === 'approve' ? t.approveBody : t.submitBody}
        footer={
          <>
            <button type="button" onClick={() => setConfirming(false)} disabled={pending} className={buttonClass('secondary')} data-autofocus>
              {t.cancel}
            </button>
            {/* The dialog sits outside the form (a portal), so the button names the form it sends. */}
            <button type="submit" form={formId} disabled={pending} className={buttonClass('primary')}>
              <IconText icon={action === 'approve' ? 'check' : 'send'} busy={pending}>
                {t.yes}
              </IconText>
            </button>
          </>
        }
      />
      {!pending && state.bulk && (
        <div role="status" className={`flex flex-col gap-1 rounded-[8px] border px-4 py-3 text-sm ${state.bulk.failed.length ? 'border-[#fde68a] bg-[#fffbeb] text-[#92400e]' : 'border-[#bfe8cd] bg-[#dcfae5] text-[#0f4a26]'}`}>
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
