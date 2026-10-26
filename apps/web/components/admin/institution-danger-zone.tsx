'use client';

import { useEffect, useRef, useState } from 'react';
import { institutionDeletion, type AdminFormState } from '@/lib/admin/actions';
import type { InstitutionDetail } from '@/lib/admin/api';
import { format, type Dictionary, type Locale } from '@/lib/i18n/locale';
import { FormAlert } from '@/components/auth/fields';
import { Notice } from '@/components/ui/notice';
import { useFormAction } from '@/components/ui/use-form-action';
import { AdminIcon } from './icons';
import { IconText, buttonClass } from './ui';

interface DangerZoneProps {
  locale: Locale;
  institution: Pick<InstitutionDetail, 'id' | 'name' | 'impact' | 'deletionRequestedBy'>;
  /** What the admin types to confirm: the short name, or the name when there is none. */
  confirmationText: string;
  me: string;
  t: Dictionary['admin'];
}

/**
 * Deleting an institution removes everything under it. The admin sees what will go, types the institution's short
 * name, and (when students can see some of its programmes) another admin approves before anything is deleted.
 */
export function InstitutionDangerZone({ locale, institution, confirmationText, me, t }: DangerZoneProps) {
  const d = t.institutions.danger;
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState('');
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [state, onSubmit, pending] = useFormAction<AdminFormState>(async (prev, data) => {
    const next = await institutionDeletion(prev, data);
    if (next.status) setOpen(false);
    return next;
  }, {});

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  const impact = institution.impact;
  const needsApproval = impact.published > 0;
  const requester = institution.deletionRequestedBy;
  const error = !pending && state.error ? t.errors[state.error] : undefined;
  const hidden = (action: string) => (
    <>
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="id" value={institution.id} />
      <input type="hidden" name="action" value={action} />
    </>
  );
  const impactList = (
    <ul className="list-disc pl-5 text-sm">
      <li>{format(d.programmes, { count: impact.programmes, published: impact.published })}</li>
      {impact.requirements > 0 && <li>{format(d.requirements, { count: impact.requirements })}</li>}
      {impact.admissionStats > 0 && <li>{format(d.admissionStats, { count: impact.admissionStats })}</li>}
      {impact.pathways > 0 && <li>{format(d.pathways, { count: impact.pathways })}</li>}
      {impact.sources > 0 && <li>{format(d.sources, { count: impact.sources })}</li>}
    </ul>
  );

  return (
    <section className="flex flex-col gap-3 rounded-[18px] border border-red/40 bg-white p-5 lg:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-[#b33a35]">
          <AdminIcon name="alert" size={20} />
          {d.title}
        </h2>
        <Notice showKey={state.savedAt}>{state.status === 'requested' ? d.requested : d.cancelled}</Notice>
      </div>

      {requester ? (
        // A delete is waiting: the requester may cancel; another admin may approve or cancel.
        <div className="flex flex-col gap-3 rounded-[12px] bg-red/10 p-4">
          <p className="text-sm">{requester === me ? d.requestedByYou : d.requestedByOther}</p>
          {requester !== me && impactList}
          <FormAlert>{error}</FormAlert>
          <div className="flex flex-wrap gap-2">
            {requester !== me && (
              <form onSubmit={onSubmit}>
                {hidden('approve')}
                <button type="submit" disabled={pending} className={buttonClass('dangerSolid')}>
                  <IconText icon="trash" busy={pending}>
                    {d.approve}
                  </IconText>
                </button>
              </form>
            )}
            <form onSubmit={onSubmit}>
              {hidden('cancel')}
              <button type="submit" disabled={pending} className={buttonClass('secondary')}>
                <IconText icon="x">{d.cancelRequest}</IconText>
              </button>
            </form>
          </div>
        </div>
      ) : (
        <>
          <p className="text-sm text-muted">{d.body}</p>
          <button
            type="button"
            onClick={() => {
              setTyped('');
              setOpen(true);
            }}
            className={`${buttonClass('danger')} self-start`}
          >
            <IconText icon="trash">{d.button}</IconText>
          </button>
        </>
      )}

      <dialog
        ref={dialogRef}
        aria-labelledby="delete-institution-title"
        onCancel={(e) => {
          e.preventDefault();
          setOpen(false);
        }}
        className="m-auto w-[min(520px,calc(100%-32px))] rounded-[18px] bg-white p-0 text-navy shadow-xl backdrop:bg-navy/40 open:animate-alert-in"
      >
        {open && (
          <form onSubmit={onSubmit} className="flex flex-col gap-4 p-6">
            {hidden('request')}
            <div className="flex items-start gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-red/10 text-[#b33a35]">
                <AdminIcon name="trash" size={20} />
              </span>
              <h2 id="delete-institution-title" className="pt-1.5 text-xl font-semibold">
                {format(d.modalTitle, { name: institution.name })}
              </h2>
            </div>
            <div className="flex flex-col gap-2 rounded-[12px] border border-red/40 bg-red/10 p-4">
              <p className="text-sm font-semibold">{d.willRemove}</p>
              {impactList}
              <p className="text-[13px]">{needsApproval ? format(d.needsApproval, { count: impact.published }) : d.irreversible}</p>
            </div>
            <label className="flex flex-col gap-2">
              <span className="text-sm font-semibold">{format(d.typePrompt, { text: confirmationText })}</span>
              <input
                name="confirm"
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                autoComplete="off"
                autoFocus
                className="rounded-[10px] border border-[#9aa3b2] px-4 py-3 text-[15px] outline-none focus:border-navy focus:ring-2 focus:ring-navy/15"
              />
            </label>
            <FormAlert>{error}</FormAlert>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button type="button" onClick={() => setOpen(false)} className={buttonClass('secondary')}>
                {d.cancel}
              </button>
              <button
                type="submit"
                // The button wakes up only when the name is typed exactly (letter case aside), as the server checks too.
                disabled={pending || typed.trim().toLocaleLowerCase() !== confirmationText.toLocaleLowerCase()}
                className={buttonClass('dangerSolid')}
              >
                <IconText icon={needsApproval ? 'send' : 'trash'} busy={pending}>
                  {needsApproval ? d.sendForApproval : d.deleteNow}
                </IconText>
              </button>
            </div>
          </form>
        )}
      </dialog>
    </section>
  );
}
