'use client';

import Link from 'next/link';
import { useState } from 'react';
import { decideProgramme, type AdminFormState } from '@/lib/admin/actions';
import type { Workflow, WorkflowAction } from '@/lib/admin/programme-workflow';
import { format, type Dictionary, type Locale } from '@/lib/i18n/locale';
import { FormAlert } from '@/components/auth/fields';
import { useFormAction } from '@/components/ui/use-form-action';

interface PanelProps {
  locale: Locale;
  programmeId: string;
  workflow: Workflow;
  /** The message for this state, already filled in (for example with the return reason). */
  message: string;
  /** How many requirement versions a delete would remove with the programme. */
  requirementCount: number;
  /** Where to go after a delete: the programme's institution, or the programme list. */
  backHref: string;
  t: Dictionary['admin'];
}

const TONE: Record<Workflow['message'], string> = {
  draftMine: 'bg-white',
  draftOther: 'bg-white',
  returned: 'bg-red/10',
  reviewMine: 'bg-cream',
  reviewOther: 'bg-cream',
  published: 'bg-mint',
  changeDraft: 'bg-blue',
  changeReturned: 'bg-red/10',
  changeReviewMine: 'bg-cream',
  changeReviewOther: 'bg-cream',
  archived: 'bg-line',
};

/**
 * Where the programme stands and what to do next: a three-step line (draft → review → published, or for a published
 * programme change → review → applied), one sentence, and the actions with the main one first. "Return" asks for a
 * reason and "Discard" asks to confirm before anything is sent.
 */
export function ProgrammeWorkflowPanel({ locale, programmeId, workflow, message, requirementCount, backHref, t }: PanelProps) {
  const a = t.programme.act;
  const [state, onSubmit, pending] = useFormAction<AdminFormState>(decideProgramme, {});
  const [asking, setAsking] = useState<'return' | 'discard' | 'archive' | 'delete' | null>(null);
  // After an action succeeds the programme moves on, so any open question box closes.
  const [seenSave, setSeenSave] = useState(state.savedAt);
  if (state.savedAt !== seenSave) {
    setSeenSave(state.savedAt);
    setAsking(null);
  }
  const change = workflow.track === 'change';
  const steps = change ? t.programme.steps.change : t.programme.steps.new;

  const label = (action: WorkflowAction): string => {
    switch (action) {
      case 'edit':
        return change ? a.editChange : a.edit;
      case 'submit':
        return workflow.message === 'returned' || workflow.message === 'changeReturned' ? a.resubmit : change ? a.submitChange : a.submit;
      case 'approve':
        return change ? a.approveChange : a.approve;
      default:
        return a[action];
    }
  };
  const style = (primary: boolean, danger = false) =>
    `rounded-[10px] px-4 py-2.5 text-sm font-semibold disabled:cursor-wait disabled:opacity-70 ${
      primary ? 'bg-navy text-white hover:bg-navy/90' : danger ? 'border border-red/50 bg-white text-[#b33a35] hover:bg-red/10' : 'border border-line bg-white hover:bg-bg'
    }`;

  return (
    <section className={`flex flex-col gap-4 rounded-[18px] border border-line p-5 lg:p-6 ${TONE[workflow.message]}`}>
      {workflow.track !== 'none' && (
        <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] font-semibold" aria-label={steps.join(' → ')}>
          {steps.map((name, i) => (
            <li key={name} aria-current={i === workflow.step ? 'step' : undefined} className="flex items-center gap-2">
              <span className={`flex size-6 items-center justify-center rounded-full text-xs ${i < workflow.step ? 'bg-[#1f6b47] text-white' : i === workflow.step ? 'bg-navy text-white' : 'bg-white text-muted'}`}>
                {i < workflow.step ? '✓' : i + 1}
              </span>
              <span className={i === workflow.step ? '' : 'text-muted'}>{name}</span>
              {i < steps.length - 1 && <span aria-hidden className="mx-1 hidden h-px w-6 bg-navy/20 sm:block" />}
            </li>
          ))}
        </ol>
      )}
      <p className="text-[15px]">{message}</p>
      <FormAlert>{!pending && state.error ? t.errors[state.error] : undefined}</FormAlert>

      <form onSubmit={onSubmit} className="flex flex-col gap-3">
        <input type="hidden" name="locale" value={locale} />
        <input type="hidden" name="id" value={programmeId} />
        <input type="hidden" name="back" value={backHref} />
        {asking && <input type="hidden" name="action" value={asking} />}

        {asking === 'return' ? (
          <div className="flex flex-col gap-2">
            <label htmlFor="return-reason" className="text-sm font-semibold">
              {t.programme.actions.reasonLabel}
            </label>
            <textarea
              id="return-reason"
              name="reason"
              required
              minLength={5}
              maxLength={1000}
              rows={3}
              autoFocus
              placeholder={t.programme.actions.reasonPlaceholder}
              className="rounded-[10px] border border-[#9aa3b2] bg-white px-4 py-3 text-[15px] outline-none focus:border-navy focus:ring-2 focus:ring-navy/15"
            />
            <div className="flex gap-2">
              <button type="submit" disabled={pending} className={style(true)}>
                {t.requirement.review.send}
              </button>
              <button type="button" onClick={() => setAsking(null)} className={style(false)}>
                {t.programme.actions.cancel}
              </button>
            </div>
          </div>
        ) : asking ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm">
              {asking === 'discard' ? a.discardConfirm : asking === 'delete' ? format(a.deleteConfirm, { count: requirementCount }) : t.programme.actions.archiveHint}
            </span>
            <button type="submit" disabled={pending} className={style(false, true)}>
              {asking === 'discard' ? a.discardYes : asking === 'delete' ? a.deleteYes : t.programme.actions.confirmArchive}
            </button>
            <button type="button" onClick={() => setAsking(null)} className={style(false)}>
              {t.programme.actions.cancel}
            </button>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {workflow.actions.map((action, i) => {
              const primary = i === 0;
              if (action === 'edit') {
                return (
                  <Link key={action} href={`/${locale}/admin/program/${programmeId}/sunting`} className={style(primary)}>
                    {label(action)}
                  </Link>
                );
              }
              // These ask first: a reason to return, or a confirmation before discarding, hiding or deleting.
              if (action === 'return' || action === 'discard' || action === 'archive' || action === 'delete') {
                return (
                  <button key={action} type="button" onClick={() => setAsking(action)} className={style(primary, action !== 'return')}>
                    {label(action)}
                  </button>
                );
              }
              return (
                <button key={action} type="submit" name="action" value={action} disabled={pending} className={style(primary)}>
                  {label(action)}
                </button>
              );
            })}
          </div>
        )}
      </form>
    </section>
  );
}
