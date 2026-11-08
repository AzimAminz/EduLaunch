'use client';

import { useState } from 'react';
import { decideProgramme, type AdminFormState } from '@/lib/admin/actions';
import type { Workflow, WorkflowAction } from '@/lib/admin/programme-workflow';
import { format, type Dictionary, type Locale } from '@/lib/i18n/locale';
import { FormAlert } from '@/components/auth/fields';
import { Modal } from '@/components/ui/modal';
import { useFormAction } from '@/components/ui/use-form-action';
import { AdminIcon, type AdminIconName } from './icons';
import { IconText, buttonClass } from './ui';

interface PanelProps {
  locale: Locale;
  programmeId: string;
  workflow: Workflow;
  /** The message for this state, already filled in (for example with the return reason). */
  message: string;
  /** How many requirement versions a delete would remove with the programme. */
  requirementCount: number;
  /** Requirement drafts of a published programme (students do not see them yet), and whether the reader publishes them at once. */
  draftRequirements?: { count: number; superAdmin: boolean };
  /** Where to go after a delete: the programme's institution, or the programme list. */
  backHref: string;
  t: Dictionary['admin'];
}

const ICON: Record<WorkflowAction, AdminIconName> = {
  edit: 'pencil',
  submit: 'send',
  withdraw: 'undo',
  approve: 'checkCircle',
  return: 'undo',
  discard: 'x',
  archive: 'archive',
  reopen: 'rotate',
  delete: 'trash',
};

const DANGER = new Set<WorkflowAction>(['discard', 'archive', 'delete']);

const TONE: Record<Workflow['message'], string> = {
  draftMine: 'bg-white',
  draftOther: 'bg-white',
  returned: 'bg-red/10',
  reviewMine: 'bg-cream',
  reviewOther: 'bg-cream',
  reviewSuper: 'bg-cream',
  published: 'bg-mint',
  changeDraft: 'bg-blue',
  changeReturned: 'bg-red/10',
  changeReviewMine: 'bg-cream',
  changeReviewOther: 'bg-cream',
  changeReviewSuper: 'bg-cream',
  archived: 'bg-line',
};

/**
 * Where the programme stands and what to do next: a three-step line (draft → review → published, or for a published
 * programme change → review → applied), one sentence, and the actions with the main one first. "Return" asks for a
 * reason and "Discard" asks to confirm before anything is sent.
 */
export function ProgrammeWorkflowPanel({ locale, programmeId, workflow, message, requirementCount, draftRequirements, backHref, t }: PanelProps) {
  const a = t.programme.act;
  const [state, onSubmit, pending] = useFormAction<AdminFormState>(decideProgramme, {});
  // What the dialog asks about stays set while it closes, so its text does not vanish mid-animation.
  const [asking, setAsking] = useState<'return' | 'discard' | 'archive' | 'delete' | null>(null);
  const [open, setOpen] = useState(false);
  const ask = (action: NonNullable<typeof asking>) => {
    setAsking(action);
    setOpen(true);
  };
  // After an action succeeds the programme moves on, so the dialog closes.
  const [seenSave, setSeenSave] = useState(state.savedAt);
  if (state.savedAt !== seenSave) {
    setSeenSave(state.savedAt);
    setOpen(false);
  }
  const formId = `workflow-${programmeId}`;
  const change = workflow.track === 'change';
  const steps = change ? t.programme.steps.change : t.programme.steps.new;

  const label = (action: WorkflowAction): string => {
    switch (action) {
      case 'submit':
        return workflow.message === 'returned' || workflow.message === 'changeReturned' ? a.resubmit : change ? a.submitChange : a.submit;
      case 'approve':
        return change ? a.approveChange : a.approve;
      default:
        return a[action];
    }
  };
  const style = (primary: boolean, danger = false) => buttonClass(primary ? 'primary' : danger ? 'danger' : 'secondary');
  // Which button was pressed, so only that one shows the spinner.
  const [pressed, setPressed] = useState<string | null>(null);

  return (
    <section className={`flex flex-col gap-4 rounded-[18px] border border-line p-5 lg:p-6 ${TONE[workflow.message]}`}>
      {workflow.track !== 'none' && (
        <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] font-semibold" aria-label={steps.join(' → ')}>
          {steps.map((name, i) => (
            <li key={name} aria-current={i === workflow.step ? 'step' : undefined} className="flex items-center gap-2">
              <span className={`flex size-6 items-center justify-center rounded-full text-xs ${i < workflow.step ? 'bg-[#1f6b47] text-white' : i === workflow.step ? 'bg-navy text-white' : 'bg-white text-muted'}`}>
                {i < workflow.step ? <AdminIcon name="check" size={13} /> : i + 1}
              </span>
              <span className={i === workflow.step ? '' : 'text-muted'}>{name}</span>
              {i < steps.length - 1 && <span aria-hidden className="mx-1 hidden h-px w-6 bg-navy/20 sm:block" />}
            </li>
          ))}
        </ol>
      )}
      <p className="text-[15px]">{message}</p>
      <FormAlert>{!pending && state.error ? t.errors[state.error] : undefined}</FormAlert>
      {!pending && state.alongside && (state.alongside.done > 0 || state.alongside.failed > 0) && (
        <div role="status" className="flex flex-col gap-1 rounded-[12px] bg-white/70 px-4 py-3 text-[13px]">
          {state.alongside.done > 0 && <p>{format(t.programme.alongside[state.alongside.action], { n: state.alongside.done })}</p>}
          {state.alongside.failed > 0 && <p className="text-[#8a6100]">{format(t.programme.alongside.failed, { n: state.alongside.failed })}</p>}
        </div>
      )}

      {workflow.message === 'published' && draftRequirements && draftRequirements.count > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-[12px] bg-cream px-4 py-3 text-[13px]">
          <p>{format(t.programme.alongside.pending, { n: draftRequirements.count })}</p>
          <button
            type="submit"
            form={formId}
            name="action"
            value="requirements"
            disabled={pending}
            onClick={() => setPressed('requirements')}
            className={buttonClass('primary', 'sm')}
          >
            <IconText icon={draftRequirements.superAdmin ? 'check' : 'send'} busy={pending && pressed === 'requirements'}>
              {format(draftRequirements.superAdmin ? t.programme.alongside.publish : t.programme.alongside.send, { n: draftRequirements.count })}
            </IconText>
          </button>
        </div>
      )}

      <form id={formId} onSubmit={onSubmit} className="flex flex-col gap-3">
        <input type="hidden" name="locale" value={locale} />
        <input type="hidden" name="id" value={programmeId} />
        <input type="hidden" name="back" value={backHref} />
        {/* Only while the dialog is open, so a plain button's own action is never shadowed by an old question. */}
        {open && asking && <input type="hidden" name="action" value={asking} />}
        <div className="flex flex-wrap gap-2">
          {/* Editing sits on the details tab it belongs to, so it is not read as editing every tab. */}
          {workflow.actions.filter((action) => action !== 'edit').map((action, i) => {
            const primary = i === 0;
            // These ask first, in a dialog: a reason to return, or a confirmation before discarding, hiding or deleting.
            if (action === 'return' || action === 'discard' || action === 'archive' || action === 'delete') {
              return (
                <button key={action} type="button" onClick={() => ask(action)} className={style(primary, DANGER.has(action))}>
                  <IconText icon={ICON[action]}>{label(action)}</IconText>
                </button>
              );
            }
            return (
              <button key={action} type="submit" name="action" value={action} disabled={pending} onClick={() => setPressed(action)} className={style(primary)}>
                <IconText icon={ICON[action]} busy={pending && pressed === action}>
                  {label(action)}
                </IconText>
              </button>
            );
          })}
        </div>
      </form>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        alert={asking !== 'return'}
        busy={pending}
        tone={asking === 'return' ? 'warn' : 'danger'}
        icon={asking ? <AdminIcon name={ICON[asking]} size={20} /> : null}
        title={asking ? label(asking) : ''}
        description={
          asking === 'return'
            ? undefined
            : asking === 'discard'
              ? a.discardConfirm
              : asking === 'delete'
                ? format(a.deleteConfirm, { count: requirementCount })
                : t.programme.actions.archiveHint
        }
        footer={
          <>
            <button type="button" onClick={() => setOpen(false)} disabled={pending} className={style(false)} data-autofocus={asking !== 'return' || undefined}>
              {t.programme.actions.cancel}
            </button>
            {/* The dialog sits outside the form (a portal), so the button names the form it sends. */}
            <button type="submit" form={formId} disabled={pending} className={asking === 'return' ? style(true) : buttonClass(asking === 'delete' ? 'dangerSolid' : 'danger')}>
              <IconText icon={asking === 'return' ? 'send' : asking ? ICON[asking] : 'check'} busy={pending}>
                {asking === 'return' ? t.requirement.review.send : asking === 'discard' ? a.discardYes : asking === 'delete' ? a.deleteYes : t.programme.actions.confirmArchive}
              </IconText>
            </button>
          </>
        }
      >
        <FormAlert>{!pending && state.error ? t.errors[state.error] : undefined}</FormAlert>
        {asking === 'return' && (
          <div className="flex flex-col gap-2">
            <label htmlFor="return-reason" className="text-sm font-semibold">
              {t.programme.actions.reasonLabel}
            </label>
            <textarea
              id="return-reason"
              name="reason"
              form={formId}
              required
              minLength={5}
              maxLength={1000}
              rows={4}
              placeholder={t.programme.actions.reasonPlaceholder}
              className="rounded-[10px] border border-[#9aa3b2] bg-white px-4 py-3 text-[15px] outline-none focus:border-navy focus:ring-2 focus:ring-navy/15"
            />
          </div>
        )}
      </Modal>
    </section>
  );
}
