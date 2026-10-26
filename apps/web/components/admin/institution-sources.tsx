'use client';

import { useState } from 'react';
import { InstitutionSourceKinds } from '@edulaunch/contracts';
import { addInstitutionSource, removeInstitutionSource, type AdminFormState } from '@/lib/admin/actions';
import type { InstitutionDetail } from '@/lib/admin/api';
import type { Dictionary, Locale } from '@/lib/i18n/locale';
import { FormAlert, TextField } from '@/components/auth/fields';
import { Dropdown } from '@/components/ui/dropdown';
import { useFormAction } from '@/components/ui/use-form-action';

type T = Dictionary['admin'];

/** An institution's official sources: its website, then programme pages, prospectus PDFs, ePanduan and others. */
export function InstitutionSources({ locale, institution, t, noMatches }: { locale: Locale; institution: Pick<InstitutionDetail, 'id' | 'websiteUrl' | 'sources'>; t: T; noMatches: string }) {
  const i = t.institutions;
  const [kind, setKind] = useState('');
  const [added, onAdd, adding] = useFormAction<AdminFormState>(addInstitutionSource, {});
  const fieldError = (name: string) => {
    const key = added.fieldErrors?.[name] as keyof typeof i.sourceErrors | undefined;
    return key && !adding ? i.sourceErrors[key] : undefined;
  };

  return (
    <div className="flex flex-col gap-4">
      <ul className="flex flex-col divide-y divide-line overflow-hidden rounded-[14px] border border-line">
        {institution.websiteUrl && <SourceRow kind={i.website} url={institution.websiteUrl} />}
        {institution.sources.map((s) => (
          <SourceRow key={s.id} kind={i.kinds[s.kind]} url={s.url} label={s.label}>
            <RemoveSource locale={locale} institutionId={institution.id} sourceId={s.id} t={t} />
          </SourceRow>
        ))}
        {!institution.websiteUrl && institution.sources.length === 0 && <li className="px-4 py-3 text-sm text-muted">{i.noSources}</li>}
      </ul>

      {/* The key starts a fresh form after each source is added. */}
      <form key={added.savedAt ?? 0} onSubmit={onAdd} className="flex flex-col gap-3 rounded-[14px] bg-bg p-4">
        <input type="hidden" name="locale" value={locale} />
        <input type="hidden" name="id" value={institution.id} />
        <input type="hidden" name="kind" value={kind} />
        <FormAlert>{!adding && added.error ? t.errors[added.error] : undefined}</FormAlert>
        <div className="grid gap-3 sm:grid-cols-[220px_minmax(0,1fr)]">
          <div className="flex flex-col gap-2">
            <Dropdown
              label={i.kind}
              value={kind}
              onChange={setKind}
              options={InstitutionSourceKinds.map((k) => ({ value: k, label: i.kinds[k] }))}
              placeholder={i.kindPlaceholder}
              noMatchesLabel={noMatches}
              searchable={false}
              invalid={!!fieldError('kind')}
            />
            {fieldError('kind') && <p className="text-[13px] text-red">{fieldError('kind')}</p>}
          </div>
          <TextField name="url" label={i.url} placeholder={i.urlPlaceholder} inputMode="url" error={fieldError('url')} />
        </div>
        <TextField name="label" label={i.label} placeholder={i.labelPlaceholder} maxLength={120} />
        <button type="submit" disabled={adding} className="self-start rounded-[10px] bg-navy px-4 py-2.5 text-sm font-semibold text-white hover:bg-navy/90 disabled:cursor-wait disabled:opacity-70">
          {i.addSource}
        </button>
      </form>
    </div>
  );
}

function SourceRow({ kind, url, label, children }: { kind: string; url: string; label?: string | null; children?: React.ReactNode }) {
  return (
    <li className="flex flex-col gap-1 bg-white px-4 py-3 sm:flex-row sm:items-center sm:gap-4">
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-semibold text-muted">{kind}</p>
        <a href={url} target="_blank" rel="noreferrer" className="break-all text-sm font-semibold underline">
          {url.replace(/^https?:\/\//, '')}
        </a>
        {label && <p className="text-[13px] text-muted">{label}</p>}
      </div>
      {children}
    </li>
  );
}

function RemoveSource({ locale, institutionId, sourceId, t }: { locale: Locale; institutionId: string; sourceId: string; t: T }) {
  const [result, onSubmit, pending] = useFormAction<AdminFormState>(removeInstitutionSource, {});
  return (
    <form onSubmit={onSubmit} className="flex items-center gap-2">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="id" value={institutionId} />
      <input type="hidden" name="sourceId" value={sourceId} />
      {!pending && result.error && <span className="text-[13px] text-red">{t.errors[result.error]}</span>}
      <button type="submit" disabled={pending} className="rounded-[10px] px-3 py-2 text-sm font-semibold text-[#b33a35] hover:bg-red/10 disabled:opacity-70">
        {t.institutions.removeSource}
      </button>
    </form>
  );
}
