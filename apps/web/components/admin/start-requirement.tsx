'use client';

import { useState } from 'react';
import { startRequirement, type AdminFormState } from '@/lib/admin/actions';
import type { Dictionary, Locale } from '@/lib/i18n/locale';
import { Dropdown } from '@/components/ui/dropdown';
import { useFormAction } from '@/components/ui/use-form-action';

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
        className={`whitespace-nowrap rounded-[10px] px-3.5 py-2 text-sm font-semibold disabled:cursor-wait disabled:opacity-70 ${primary ? 'bg-yellow hover:bg-yellow/85' : 'border border-line bg-white hover:bg-bg'}`}
      >
        {label}
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
