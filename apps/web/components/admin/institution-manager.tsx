'use client';

import Link from 'next/link';
import { useState } from 'react';
import { InstitutionTypes } from '@edulaunch/contracts';
import { deleteInstitution, saveInstitution, type AdminFormState } from '@/lib/admin/actions';
import { format, type Dictionary, type Locale } from '@/lib/i18n/locale';
import { FormAlert, TextField } from '@/components/auth/fields';
import { Dropdown } from '@/components/ui/dropdown';
import { Notice } from '@/components/ui/notice';
import { AdminHeading } from './ui';
import { useFormAction } from '@/components/ui/use-form-action';

export interface InstitutionRow {
  id: string;
  name: string;
  shortName: string | null;
  type: string;
  websiteUrl: string | null;
  /** Programmes of any status, and how many are published or not yet published. */
  programmes: number;
  published: number;
  open: number;
}

type T = Dictionary['admin'];

/** The institution list with "Add" at the top and "Edit" on each row; one form open at a time. */
export function InstitutionManager({ locale, rows, t, noMatches }: { locale: Locale; rows: InstitutionRow[]; t: T; noMatches: string }) {
  const i = t.institutions;
  // null = no form open, '' = adding, an id = editing that row.
  const [editing, setEditing] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number>();
  const [deletedAt, setDeletedAt] = useState<number>();
  const types: Record<string, string> = i.types;
  const close = (saved?: number) => {
    setEditing(null);
    if (saved) setSavedAt(saved);
  };

  return (
    <div className="flex flex-col gap-4">
      <AdminHeading
        title={i.title}
        intro={i.intro}
        actions={
          <div className="flex items-center gap-3">
            <Notice showKey={savedAt}>{i.saved}</Notice>
            <Notice showKey={deletedAt}>{i.deleted}</Notice>
            {editing !== '' && (
              <button type="button" onClick={() => setEditing('')} className="rounded-[10px] bg-yellow px-4 py-2.5 text-sm font-semibold hover:bg-yellow/85">
                {i.add}
              </button>
            )}
          </div>
        }
      />
      {editing === '' && <InstitutionForm key="new" locale={locale} t={t} noMatches={noMatches} onDone={close} />}

      <ul className="flex flex-col divide-y divide-line overflow-hidden rounded-[14px] border border-line bg-white">
        {rows.map((row) =>
          editing === row.id ? (
            <li key={row.id} className="p-4">
              <InstitutionForm locale={locale} t={t} noMatches={noMatches} row={row} onDone={close} />
            </li>
          ) : (
            <li key={row.id} className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:gap-4">
              <div className="min-w-0 flex-1">
                <p className="font-semibold">
                  <Link href={`/${locale}/admin/institusi/${row.id}`} className="hover:underline">
                    {row.name}
                  </Link>
                  {row.shortName && <span className="font-normal text-muted"> ({row.shortName})</span>}
                </p>
                <p className="text-[13px]">
                  {row.programmes ? (
                    <>
                      <span className="font-semibold">{format(i.programmeCount, { count: row.programmes })}</span>
                      {/* Only the parts that apply, e.g. "4 programmes · 3 published · 1 archived". */}
                      {(
                        [
                          [row.published, i.countPublished],
                          [row.open, i.countOpen],
                          [row.programmes - row.published - row.open, i.countArchived],
                        ] as const
                      )
                        .filter(([n]) => n > 0)
                        .map(([n, text]) => (
                          <span key={text} className="text-muted">
                            {' · '}
                            {format(text, { count: n })}
                          </span>
                        ))}
                    </>
                  ) : (
                    <span className="text-muted">{i.noProgrammes}</span>
                  )}
                </p>
                <p className="text-[13px] text-muted">
                  {types[row.type] ?? row.type}
                  {row.websiteUrl && (
                    <>
                      {' · '}
                      <a href={row.websiteUrl} target="_blank" rel="noreferrer" className="underline hover:text-navy">
                        {row.websiteUrl.replace(/^https?:\/\//, '')}
                      </a>
                    </>
                  )}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
                <Link href={`/${locale}/admin/institusi/${row.id}`} className="rounded-[10px] bg-navy px-3.5 py-2 text-sm font-semibold text-white hover:bg-navy/90">
                  {i.open}
                </Link>
                <button type="button" onClick={() => setEditing(row.id)} className="rounded-[10px] border border-line px-3.5 py-2 text-sm font-semibold hover:bg-bg">
                  {i.edit}
                </button>
                {/* Deleting is offered only when no programme depends on the institution. */}
                {row.programmes === 0 && <DeleteInstitution locale={locale} row={row} t={t} onDeleted={setDeletedAt} />}
              </div>
            </li>
          ),
        )}
      </ul>
    </div>
  );
}

function InstitutionForm({ locale, t, noMatches, row, onDone }: { locale: Locale; t: T; noMatches: string; row?: InstitutionRow; onDone: (savedAt?: number) => void }) {
  const i = t.institutions;
  const [type, setType] = useState(row?.type ?? '');
  const [state, onSubmit, pending] = useFormAction<AdminFormState>(async (prev, data) => {
    const next = await saveInstitution(prev, data);
    if (next.savedAt) onDone(next.savedAt);
    return next;
  }, {});
  const fieldError = (name: string) => {
    const key = state.fieldErrors?.[name] as keyof typeof i.errors | undefined;
    return key && !pending ? i.errors[key] : undefined;
  };
  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4 rounded-[14px] border border-navy/20 bg-white p-4">
      <input type="hidden" name="locale" value={locale} />
      {row && <input type="hidden" name="id" value={row.id} />}
      <input type="hidden" name="type" value={type} />
      <FormAlert>{!pending && state.error ? t.errors[state.error] : undefined}</FormAlert>
      <div className="grid gap-4 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <TextField name="name" label={i.name} placeholder={i.namePlaceholder} defaultValue={row?.name} maxLength={160} error={fieldError('name')} />
        <TextField name="shortName" label={i.shortName} placeholder={i.shortNamePlaceholder} defaultValue={row?.shortName ?? ''} maxLength={20} />
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
        <TextField name="websiteUrl" label={i.website} placeholder={i.websitePlaceholder} defaultValue={row?.websiteUrl ?? ''} inputMode="url" error={fieldError('websiteUrl')} />
      </div>
      <div className="flex gap-2">
        <button type="submit" disabled={pending} className="rounded-[10px] bg-navy px-5 py-2.5 text-sm font-semibold text-white hover:bg-navy/90 disabled:cursor-wait disabled:opacity-70">
          {i.save}
        </button>
        <button type="button" onClick={() => onDone()} className="rounded-[10px] border border-line px-5 py-2.5 text-sm font-semibold hover:bg-bg">
          {i.cancel}
        </button>
      </div>
    </form>
  );
}

/** "Delete" asks to confirm first; an institution that still has programmes is refused with a reason. */
function DeleteInstitution({ locale, row, t, onDeleted }: { locale: Locale; row: InstitutionRow; t: T; onDeleted: (at: number) => void }) {
  const i = t.institutions;
  const [asking, setAsking] = useState(false);
  const [state, onSubmit, pending] = useFormAction<AdminFormState>(async (prev, data) => {
    const next = await deleteInstitution(prev, data);
    if (next.savedAt) onDeleted(next.savedAt);
    return next;
  }, {});
  if (!asking) {
    return (
      <button type="button" onClick={() => setAsking(true)} className="rounded-[10px] px-3 py-2 text-sm font-semibold text-[#b33a35] hover:bg-red/10">
        {i.delete}
      </button>
    );
  }
  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-2 rounded-[12px] border border-red/40 bg-red/10 p-3 sm:max-w-[360px]">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="id" value={row.id} />
      <p className="text-sm">{format(i.deleteConfirm, { name: row.name })}</p>
      {!pending && state.error && <p role="alert" className="text-[13px] font-medium text-[#b33a35]">{t.errors[state.error]}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={pending} className="rounded-[10px] bg-red px-3.5 py-2 text-sm font-semibold text-white disabled:opacity-70">
          {i.deleteYes}
        </button>
        <button type="button" onClick={() => setAsking(false)} className="rounded-[10px] border border-line bg-white px-3.5 py-2 text-sm font-semibold hover:bg-bg">
          {i.cancel}
        </button>
      </div>
    </form>
  );
}
