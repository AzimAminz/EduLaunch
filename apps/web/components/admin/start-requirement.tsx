'use client';

import { useState } from 'react';
import { discardRequirement, removeEntryRoute, startRequirement, type AdminFormState } from '@/lib/admin/actions';
import type { Dictionary, Locale } from '@/lib/i18n/locale';
import { Dropdown } from '@/components/ui/dropdown';
import { useFormAction } from '@/components/ui/use-form-action';
import { AdminIcon } from './icons';
import { IconText, buttonClass } from './ui';

/** "Add / update requirements" for one route: starts a draft (from the published rules) and opens the editor. */
export function StartRequirement({ locale, programId, entryRoute, label, primary, errors }: { locale: Locale; programId: string; entryRoute: string; label: string; primary?: boolean; errors: Dictionary['admin']['errors'] }) {
  const [state, onSubmit, pending] = useFormAction<AdminFormState>(startRequirement, {});
  return (
    <form onSubmit={onSubmit} className="flex flex-col items-end gap-1">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="programId" value={programId} />
      <input type="hidden" name="entryRoute" value={entryRoute} />
      <button
        type="submit"
        disabled={pending}
        className={buttonClass(primary ? 'accent' : 'secondary', 'sm')}
      >
        <IconText icon={primary ? 'plus' : 'pencil'} busy={pending}>
          {label}
        </IconText>
      </button>
      {!pending && state.error && (
        <p role="alert" className="text-[13px] text-red">
          {errors[state.error]}
        </p>
      )}
    </form>
  );
}

/**
 * One control to start requirements for any route not used yet: routes usual for the programme's level come first
 * and are marked, so the page has a single "add" action instead of one button per route.
 */
export function RouteStarter({ locale, programId, routes, label, placeholder, button, noMatches, errors }: {
  locale: Locale;
  programId: string;
  routes: Array<{ value: string; label: string }>;
  label: string;
  placeholder: string;
  button: string;
  noMatches: string;
  errors: Dictionary['admin']['errors'];
}) {
  const [route, setRoute] = useState('');
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
      <div className="min-w-0 flex-1">
        <Dropdown label={label} value={route} onChange={setRoute} options={routes} placeholder={placeholder} noMatchesLabel={noMatches} searchable={false} />
      </div>
      {route && <StartRequirement locale={locale} programId={programId} entryRoute={route} label={button} primary errors={errors} />}
    </div>
  );
}

/**
 * Removes something from one route, after a confirm in place: the admin's own requirement draft (`draftId`), or the
 * route itself when it has no requirements yet.
 */
export function RemoveFromRoute({ locale, programId, entryRoute, draftId, texts, errors }: {
  locale: Locale;
  programId: string;
  entryRoute: string;
  draftId?: string;
  texts: { label: string; confirm: string; yes: string; cancel: string };
  errors: Dictionary['admin']['errors'];
}) {
  const [confirming, setConfirming] = useState(false);
  const [state, onSubmit, pending] = useFormAction<AdminFormState>(draftId ? discardRequirement : removeEntryRoute, {});
  return (
    <form onSubmit={onSubmit} className="flex flex-col items-end gap-2">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="programId" value={programId} />
      <input type="hidden" name="entryRoute" value={entryRoute} />
      {draftId && <input type="hidden" name="id" value={draftId} />}
      {confirming ? (
        <div role="alertdialog" aria-label={texts.label} className="flex max-w-sm flex-col gap-2 rounded-[12px] border border-red/30 bg-white p-3">
          <p className="flex items-start gap-2 text-[13px]">
            <AdminIcon name="alert" size={16} className="mt-0.5 shrink-0 text-[#b33a35]" />
            {texts.confirm}
          </p>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setConfirming(false)} className={buttonClass('secondary', 'sm')}>
              {texts.cancel}
            </button>
            <button type="submit" disabled={pending} className={buttonClass('dangerSolid', 'sm')}>
              <IconText icon="trash" busy={pending}>
                {texts.yes}
              </IconText>
            </button>
          </div>
        </div>
      ) : (
        <button type="button" onClick={() => setConfirming(true)} className={`${buttonClass('ghost', 'sm')} text-[#b33a35] hover:bg-red/10`}>
          <IconText icon="trash">{texts.label}</IconText>
        </button>
      )}
      {!pending && state.error && (
        <p role="alert" className="text-[13px] text-red">
          {errors[state.error]}
        </p>
      )}
    </form>
  );
}
