'use client';

import { useState } from 'react';
import { InstitutionTypes, MalaysianStates } from '@edulaunch/contracts';
import { saveInstitution, type AdminFormState } from '@/lib/admin/actions';
import type { Dictionary, Locale } from '@/lib/i18n/locale';
import { FormAlert, TextField } from '@/components/auth/fields';
import { Dropdown } from '@/components/ui/dropdown';
import { Notice } from '@/components/ui/notice';
import { useFormAction } from '@/components/ui/use-form-action';

export interface InstitutionValues {
  id: string;
  name: string;
  shortName: string | null;
  type: string;
  state: string | null;
  websiteUrl: string | null;
}

/**
 * Add an institution (it then opens on its profile) or correct its details.
 * Institutions are reference data: saved directly, no second-admin review.
 */
export function InstitutionForm({ locale, t, noMatches, values, onCancel }: { locale: Locale; t: Dictionary['admin']; noMatches: string; values?: InstitutionValues; onCancel?: () => void }) {
  const i = t.institutions;
  const [type, setType] = useState(values?.type ?? '');
  const [state, setState] = useState(values?.state ?? '');
  const [result, onSubmit, pending] = useFormAction<AdminFormState>(saveInstitution, {});
  const fieldError = (name: string) => {
    const key = result.fieldErrors?.[name] as keyof typeof i.errors | undefined;
    return key && !pending ? i.errors[key] : undefined;
  };
  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <input type="hidden" name="locale" value={locale} />
      {values && <input type="hidden" name="id" value={values.id} />}
      <input type="hidden" name="type" value={type} />
      <input type="hidden" name="state" value={state} />
      <FormAlert>{!pending && result.error ? t.errors[result.error] : undefined}</FormAlert>
      <div className="grid gap-4 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <TextField name="name" label={i.name} placeholder={i.namePlaceholder} defaultValue={values?.name} maxLength={160} error={fieldError('name')} />
        <TextField name="shortName" label={i.shortName} placeholder={i.shortNamePlaceholder} defaultValue={values?.shortName ?? ''} maxLength={20} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Dropdown
            label={i.type}
            value={type}
            onChange={setType}
            options={InstitutionTypes.map((x) => ({ value: x, label: i.types[x] }))}
            placeholder={i.typePlaceholder}
            noMatchesLabel={noMatches}
            searchable={false}
            invalid={!!fieldError('type')}
          />
          {fieldError('type') && <p className="text-[13px] text-red">{fieldError('type')}</p>}
        </div>
        <Dropdown label={i.state} value={state} onChange={setState} options={MalaysianStates.map((x) => ({ value: x, label: x }))} placeholder={i.statePlaceholder} noMatchesLabel={noMatches} />
      </div>
      <TextField name="websiteUrl" label={i.website} placeholder={i.websitePlaceholder} defaultValue={values?.websiteUrl ?? ''} inputMode="url" error={fieldError('websiteUrl')} />
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending} className="rounded-[10px] bg-navy px-5 py-2.5 text-sm font-semibold text-white hover:bg-navy/90 disabled:cursor-wait disabled:opacity-70">
          {i.save}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className="rounded-[10px] border border-line px-5 py-2.5 text-sm font-semibold hover:bg-bg">
            {i.cancel}
          </button>
        )}
        <Notice showKey={result.savedAt}>{i.saved}</Notice>
      </div>
    </form>
  );
}
