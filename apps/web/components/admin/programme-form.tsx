'use client';

import { useState } from 'react';
import { createProgramme, updateProgramme, type AdminFormState } from '@/lib/admin/actions';
import { STUDY_LEVEL_OPTIONS } from '@/lib/catalogue/presentation';
import type { Dictionary, Locale } from '@/lib/i18n/locale';
import { FormAlert, TextField } from '@/components/auth/fields';
import { Dropdown, type DropdownOption } from '@/components/ui/dropdown';
import { Notice } from '@/components/ui/notice';
import { useFormAction } from '@/components/ui/use-form-action';

interface ProgrammeFormProps {
  locale: Locale;
  t: Dictionary['admin'];
  levels: Dictionary['levels'];
  noMatches: string;
  institutions: DropdownOption[];
  fields: DropdownOption[];
  /** Editing an existing programme: institution and level are fixed once created. */
  programme?: { id: string; name: string; durationSemesters: number | null; fieldIds: string[]; institutionName: string | null; studyLevel: keyof Dictionary['levels'] };
  /** False while the programme waits for review or belongs to another admin's draft. */
  editable?: boolean;
  /** A new programme started from an institution's page: that institution is chosen already. */
  initialInstitutionId?: string;
}

/** Add a programme (saved as a draft) or correct its details. */
export function ProgrammeForm({ locale, t, levels, noMatches, institutions, fields, programme, editable = true, initialInstitutionId }: ProgrammeFormProps) {
  const f = t.programmeForm;
  const [state, onSubmit, pending] = useFormAction<AdminFormState>(programme ? updateProgramme : createProgramme, {});
  const [institutionId, setInstitutionId] = useState(initialInstitutionId ?? '');
  const [level, setLevel] = useState<string>(programme?.studyLevel ?? '');
  const [fieldIds, setFieldIds] = useState<string[]>(programme?.fieldIds ?? []);
  const fieldError = (name: string) => {
    const key = state.fieldErrors?.[name] as keyof typeof f.errors | undefined;
    return key && !pending ? f.errors[key] : undefined;
  };
  const isStream = level === 'form4_stream';
  const fieldLabel = (id: string) => fields.find((o) => o.value === id)?.label ?? id;

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      <input type="hidden" name="locale" value={locale} />
      {programme && <input type="hidden" name="id" value={programme.id} />}
      {!programme && <input type="hidden" name="studyLevel" value={level} />}
      {!programme && <input type="hidden" name="institutionId" value={isStream ? '' : institutionId} />}
      {fieldIds.map((id) => (
        <input key={id} type="hidden" name="fieldIds" value={id} />
      ))}
      <FormAlert>{!pending && state.error ? t.errors[state.error] : undefined}</FormAlert>

      <fieldset disabled={!editable} className="flex flex-col gap-5 disabled:opacity-70">
        {programme ? (
          <dl className="grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-sm font-semibold">{f.institution}</dt>
              <dd className="text-[15px]">{programme.institutionName ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-sm font-semibold">{f.level}</dt>
              <dd className="text-[15px]">{levels[programme.studyLevel]}</dd>
            </div>
          </dl>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Dropdown
                label={f.level}
                value={level}
                onChange={setLevel}
                options={STUDY_LEVEL_OPTIONS.concat('stpm').map((l) => ({ value: l, label: levels[l] }))}
                placeholder={f.levelPlaceholder}
                noMatchesLabel={noMatches}
                searchable={false}
                invalid={!!fieldError('studyLevel')}
              />
              {fieldError('studyLevel') && <p className="text-[13px] text-red">{fieldError('studyLevel')}</p>}
            </div>
            {!isStream && (
              <div className="flex flex-col gap-2">
                <Dropdown
                  label={f.institution}
                  value={institutionId}
                  onChange={setInstitutionId}
                  options={institutions}
                  placeholder={f.institutionPlaceholder}
                  noMatchesLabel={noMatches}
                  invalid={!!fieldError('institutionId')}
                />
                <p className={`text-[13px] ${fieldError('institutionId') ? 'text-red' : 'text-muted'}`}>{fieldError('institutionId') ?? f.noInstitution}</p>
              </div>
            )}
          </div>
        )}

        <TextField name="name" label={f.name} placeholder={f.namePlaceholder} defaultValue={programme?.name} maxLength={160} error={fieldError('name')} />
        <div className="sm:max-w-[240px]">
          <TextField
            name="durationSemesters"
            label={f.duration}
            inputMode="numeric"
            defaultValue={programme?.durationSemesters ?? ''}
            hint={f.durationHint}
            error={fieldError('durationSemesters')}
          />
        </div>

        <div className="flex flex-col gap-2">
          <Dropdown
            label={f.fields}
            value=""
            onChange={(id) => id && !fieldIds.includes(id) && fieldIds.length < 10 && setFieldIds([...fieldIds, id])}
            options={fields.filter((o) => !fieldIds.includes(o.value))}
            placeholder={f.fieldsPlaceholder}
            noMatchesLabel={noMatches}
            resetAfterChoice
          />
          {fieldIds.length > 0 && (
            <ul className="flex flex-wrap gap-2">
              {fieldIds.map((id) => (
                <li key={id} className="flex items-center gap-1 rounded-full bg-blue py-1 pl-3 pr-1 text-sm font-medium">
                  {fieldLabel(id)}
                  <button type="button" onClick={() => setFieldIds(fieldIds.filter((x) => x !== id))} aria-label={`${fieldLabel(id)} ×`} className="rounded-full px-1.5 hover:bg-white">
                    ×
                  </button>
                </li>
              ))}
            </ul>
          )}
          <p className="text-[13px] text-muted">{f.fieldsHint}</p>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <button type="submit" disabled={pending} className="rounded-[10px] bg-navy px-5 py-3 font-semibold text-white hover:bg-navy/90 disabled:cursor-wait disabled:opacity-70">
            {programme ? f.save : f.create}
          </button>
          <Notice showKey={state.savedAt}>{f.saved}</Notice>
        </div>
      </fieldset>
    </form>
  );
}
