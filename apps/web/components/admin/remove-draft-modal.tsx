'use client';

import { useEffect, useRef } from 'react';
import { removeEntryRoute, type AdminFormState } from '@/lib/admin/actions';
import { format, type Dictionary, type Locale } from '@/lib/i18n/locale';
import { FormAlert } from '@/components/auth/fields';
import { useFormAction } from '@/components/ui/use-form-action';
import { AdminIcon } from './icons';
import { IconText, buttonClass } from './ui';

/**
 * Confirms removing one route from a programme with what was written for it (the admin's own draft). Escape, the
 * backdrop and "cancel" close it; focus starts on "cancel" so Enter never removes by accident.
 */
export function RemoveDraftModal({ locale, target, texts, errors, onClose }: {
  locale: Locale;
  target: { programId: string; entryRoute: string; draftId: string | null; name: string };
  texts: { title: string; body: string; yes: string; cancel: string };
  errors: Dictionary['admin']['errors'];
  onClose: () => void;
}) {
  const [state, onSubmit, pending] = useFormAction<AdminFormState>(removeEntryRoute, {});
  const cancel = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    cancel.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && !pending && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, pending]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-navy/40 p-4 sm:items-center" onClick={() => !pending && onClose()}>
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="remove-route-title"
        aria-describedby="remove-route-body"
        onClick={(e) => e.stopPropagation()}
        className="flex w-full max-w-md flex-col gap-4 rounded-[18px] bg-white p-5 shadow-xl"
      >
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-red/10 text-[#b33a35]">
            <AdminIcon name="trash" size={18} />
          </span>
          <div className="flex flex-col gap-1">
            <h2 id="remove-route-title" className="text-lg font-semibold">
              {format(texts.title, { name: target.name })}
            </h2>
            <p id="remove-route-body" className="text-sm text-muted">
              {texts.body}
            </p>
          </div>
        </div>
        <FormAlert>{!pending && state.error ? errors[state.error] : undefined}</FormAlert>
        <form onSubmit={onSubmit} className="flex justify-end gap-2">
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="programId" value={target.programId} />
          <input type="hidden" name="entryRoute" value={target.entryRoute} />
          {target.draftId && <input type="hidden" name="draftId" value={target.draftId} />}
          <button ref={cancel} type="button" onClick={onClose} disabled={pending} className={buttonClass('secondary')}>
            {texts.cancel}
          </button>
          <button type="submit" disabled={pending} className={buttonClass('dangerSolid')}>
            <IconText icon="trash" busy={pending}>
              {texts.yes}
            </IconText>
          </button>
        </form>
      </div>
    </div>
  );
}
