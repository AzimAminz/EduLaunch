'use client';

import { useState } from 'react';
import { decideProgramme, decideRequirement, type AdminFormState } from '@/lib/admin/actions';
import type { Dictionary, Locale } from '@/lib/i18n/locale';
import { FormAlert } from '@/components/auth/fields';
import { useFormAction } from '@/components/ui/use-form-action';
import type { AdminIconName } from './icons';
import { IconText, buttonClass } from './ui';

type Action = 'submit' | 'approve' | 'return' | 'archive' | 'reopen';

const ICON: Record<Action, AdminIconName> = { submit: 'send', approve: 'checkCircle', return: 'undo', archive: 'archive', reopen: 'rotate' };

interface ReviewActionsProps {
  locale: Locale;
  kind: 'programme' | 'requirement';
  id: string;
  /** The actions this admin may take now; the catalogue service checks the same rules. */
  allowed: Action[];
  t: Dictionary['admin'];
  /** Shown above the buttons, e.g. what approving changes for students. */
  effect?: string;
}

/**
 * Buttons for the review workflow. "Return" opens a box for the reason first; "Archive" asks to confirm.
 * After an action the page reloads its data, so the buttons change with the new status.
 */
export function ReviewActions({ locale, kind, id, allowed, t, effect }: ReviewActionsProps) {
  const [state, onSubmit, pending] = useFormAction<AdminFormState>(kind === 'programme' ? decideProgramme : decideRequirement, {});
  const [asking, setAsking] = useState<'return' | 'archive' | null>(null);
  const [pressed, setPressed] = useState<Action | null>(null);
  const a = t.programme.actions;
  const r = t.requirement.review;
  if (allowed.length === 0) return null;

  const label: Record<Action, string> = {
    submit: a.submit,
    approve: kind === 'requirement' ? r.approve : a.approve,
    return: kind === 'requirement' ? r.return : a.return,
    archive: a.archive,
    reopen: a.reopen,
  };
  const button = (action: Action, primary = false) => (
    <button
      key={action}
      type={action === 'return' || action === 'archive' ? 'button' : 'submit'}
      name="action"
      value={action}
      disabled={pending}
      onClick={() => (action === 'return' || action === 'archive' ? setAsking(action) : setPressed(action))}
      className={buttonClass(primary ? 'accent' : action === 'archive' ? 'danger' : 'secondary')}
    >
      <IconText icon={ICON[action]} busy={pending && pressed === action}>
        {label[action]}
      </IconText>
    </button>
  );

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="id" value={id} />
      {/* Approve, submit and reopen send their own value; the "Return" and "Archive" boxes send this one. */}
      {asking && <input type="hidden" name="action" value={asking} />}
      <FormAlert>{!pending && state.error ? t.errors[state.error] : undefined}</FormAlert>
      {effect && <p className="rounded-[12px] bg-cream px-4 py-3 text-sm">{effect}</p>}

      {asking === 'return' ? (
        <div className="flex flex-col gap-2">
          <label htmlFor={`reason-${id}`} className="text-sm font-semibold">
            {kind === 'requirement' ? r.reasonLabel : a.reasonLabel}
          </label>
          <textarea
            id={`reason-${id}`}
            name="reason"
            required
            minLength={5}
            maxLength={1000}
            rows={3}
            placeholder={kind === 'requirement' ? r.reasonPlaceholder : a.reasonPlaceholder}
            className="rounded-[10px] border border-[#9aa3b2] bg-white px-4 py-3 text-[15px] outline-none focus:border-navy focus:ring-2 focus:ring-navy/15"
          />
          <div className="flex gap-2">
            <button type="submit" disabled={pending} className={buttonClass('primary')}>
              <IconText icon="send" busy={pending}>
                {r.send}
              </IconText>
            </button>
            <button type="button" onClick={() => setAsking(null)} className={buttonClass('secondary')}>
              {r.cancel}
            </button>
          </div>
        </div>
      ) : asking === 'archive' ? (
        <div className="flex flex-col gap-2 rounded-[12px] border border-red/40 bg-red/10 p-4">
          <p className="text-sm">{a.archiveHint}</p>
          <div className="flex gap-2">
            <button type="submit" disabled={pending} className={buttonClass('danger')}>
              <IconText icon="archive" busy={pending}>
                {a.confirmArchive}
              </IconText>
            </button>
            <button type="button" onClick={() => setAsking(null)} className={buttonClass('secondary')}>
              {a.cancel}
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {allowed.includes('approve') && button('approve', true)}
          {allowed.includes('submit') && button('submit', true)}
          {allowed.includes('return') && button('return')}
          {allowed.includes('reopen') && button('reopen')}
          {allowed.includes('archive') && button('archive')}
        </div>
      )}
    </form>
  );
}
