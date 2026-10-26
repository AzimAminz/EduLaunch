'use client';

import { useState, type ReactNode } from 'react';
import { StudyModes } from '@edulaunch/contracts';
import { createProgramme, updateProgramme, type AdminFormState } from '@/lib/admin/actions';
import type { ProgrammeFacts } from '@/lib/admin/api';
import { STUDY_LEVEL_OPTIONS } from '@/lib/catalogue/presentation';
import type { Dictionary, Locale } from '@/lib/i18n/locale';
import { FormAlert, TextField } from '@/components/auth/fields';
import { Dropdown, type DropdownOption } from '@/components/ui/dropdown';
import { Notice } from '@/components/ui/notice';
import { useFormAction } from '@/components/ui/use-form-action';

/** An NEC field as a dropdown option, with the broad EduLaunch field it suggests. */
export type NecOption = DropdownOption & { fieldId: string | null };

interface ProgrammeFormProps {
  locale: Locale;
  t: Dictionary['admin'];
  levels: Dictionary['levels'];
  noMatches: string;
  institutions: DropdownOption[];
  fields: DropdownOption[];
  necFields: NecOption[];
  /** Editing an existing programme: institution and level are fixed once created. */
  programme?: ProgrammeFacts & {
    id: string;
    name: string;
    durationSemesters: number | null;
    fieldIds: string[];
    institutionName: string | null;
    studyLevel: keyof Dictionary['levels'];
  };
  /** False while the programme waits for review or belongs to another admin's draft. */
  editable?: boolean;
  /** A new programme started from an institution's page: that institution is chosen already. */
  initialInstitutionId?: string;
}

/**
 * Add a programme (saved as a draft) or correct its details. The fields follow what JPT ePanduan and university
 * prospectuses publish (code, faculty, NEC field, duration, mode, campus, interview), so programmes typed by hand and
 * programmes imported later share one standard.
 */
export function ProgrammeForm({ locale, t, levels, noMatches, institutions, fields, necFields, programme, editable = true, initialInstitutionId }: ProgrammeFormProps) {
  const f = t.programmeForm;
  const [state, onSubmit, pending] = useFormAction<AdminFormState>(programme ? updateProgramme : createProgramme, {});
  const [institutionId, setInstitutionId] = useState(initialInstitutionId ?? '');
  const [level, setLevel] = useState<string>(programme?.studyLevel ?? '');
  const [necCode, setNecCode] = useState(programme?.necCode ?? '');
  const [studyMode, setStudyMode] = useState<string>(programme?.studyMode ?? '');
  const [fieldIds, setFieldIds] = useState<string[]>(programme?.fieldIds ?? []);
  const fieldError = (name: string) => {
    const key = state.fieldErrors?.[name] as keyof typeof f.errors | undefined;
    return key && !pending ? f.errors[key] : undefined;
  };
  const isStream = level === 'form4_stream';
  const fieldLabel = (id: string) => fields.find((o) => o.value === id)?.label ?? id;
  const chooseNec = (code: string) => {
    setNecCode(code);
    // The NEC code suggests the broad field used for recommendations; the admin can still change it.
    const suggested = necFields.find((n) => n.value === code)?.fieldId;
    if (suggested && !fieldIds.includes(suggested) && fieldIds.length < 10) setFieldIds([...fieldIds, suggested]);
  };

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-6">
      <input type="hidden" name="locale" value={locale} />
      {programme && <input type="hidden" name="id" value={programme.id} />}
      {!programme && <input type="hidden" name="studyLevel" value={level} />}
      {!programme && <input type="hidden" name="institutionId" value={isStream ? '' : institutionId} />}
      <input type="hidden" name="necCode" value={necCode} />
      <input type="hidden" name="studyMode" value={studyMode} />
      {fieldIds.map((id) => (
        <input key={id} type="hidden" name="fieldIds" value={id} />
      ))}
      <FormAlert>{!pending && state.error ? t.errors[state.error] : undefined}</FormAlert>

      <fieldset disabled={!editable} className="flex flex-col gap-6 disabled:opacity-70">
        <Section title={f.sections.identity}>
          {programme ? (
            <dl className="grid gap-4 sm:grid-cols-2">
              <Fact label={f.institution} value={programme.institutionName ?? '—'} />
              <Fact label={f.level} value={levels[programme.studyLevel]} />
            </dl>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
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
            </div>
          )}
          <TextField name="name" label={f.name} placeholder={f.namePlaceholder} defaultValue={programme?.name} maxLength={160} error={fieldError('name')} />
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              name="upuCode"
              label={f.upuCode}
              placeholder={f.upuPlaceholder}
              defaultValue={programme?.upuCode ?? ''}
              maxLength={9}
              autoCapitalize="characters"
              hint={f.upuHint}
              error={fieldError('upuCode')}
            />
            <TextField name="internalCode" label={f.internalCode} placeholder={f.internalPlaceholder} defaultValue={programme?.internalCode ?? ''} maxLength={20} />
          </div>
          <TextField name="faculty" label={f.faculty} placeholder={f.facultyPlaceholder} defaultValue={programme?.faculty ?? ''} maxLength={160} />
        </Section>

        <Section title={f.sections.academic}>
          <div className="flex flex-col gap-2">
            <Dropdown label={f.nec} value={necCode} onChange={chooseNec} options={necFields} placeholder={f.necPlaceholder} noMatchesLabel={noMatches} />
            <p className="text-[13px] text-muted">{f.necHint}</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-[200px_minmax(0,1fr)]">
            <TextField name="durationSemesters" label={f.duration} inputMode="numeric" defaultValue={programme?.durationSemesters ?? ''} hint={f.durationHint} error={fieldError('durationSemesters')} />
            <Dropdown
              label={f.studyMode}
              value={studyMode}
              onChange={setStudyMode}
              options={StudyModes.map((m) => ({ value: m, label: f.studyModes[m] }))}
              placeholder={f.studyModePlaceholder}
              noMatchesLabel={noMatches}
              searchable={false}
            />
          </div>
          <TextField name="campus" label={f.campus} placeholder={f.campusPlaceholder} defaultValue={programme?.campus ?? ''} maxLength={120} />
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
        </Section>

        <Section title={f.sections.admission}>
          <div className="grid gap-2 sm:grid-cols-2">
            <Check name="hasInterview" label={f.interview} checked={programme?.hasInterview} />
            <Check name="bumiputeraOnly" label={f.bumiputera} checked={programme?.bumiputeraOnly} />
            <Check name="isStem" label={f.stem} checked={programme?.isStem} />
            <Check name="isTvet" label={f.tvet} checked={programme?.isTvet} />
          </div>
          <p className="text-[13px] text-muted">{f.flagsHint}</p>
        </Section>

        <Section title={f.sections.source}>
          <TextField
            name="sourceUrl"
            label={f.sourceUrl}
            placeholder={f.sourcePlaceholder}
            defaultValue={programme?.sourceUrl ?? ''}
            inputMode="url"
            hint={f.sourceHint}
            error={fieldError('sourceUrl')}
          />
        </Section>

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

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      <h3 className="border-b border-line pb-2 text-sm font-semibold uppercase tracking-wide text-muted">{title}</h3>
      {children}
    </section>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-sm font-semibold">{label}</dt>
      <dd className="text-[15px]">{value}</dd>
    </div>
  );
}

function Check({ name, label, checked }: { name: string; label: string; checked?: boolean }) {
  return (
    <label className="flex cursor-pointer items-center gap-2.5 rounded-[10px] bg-bg px-3.5 py-3 text-sm font-medium">
      <input type="checkbox" name={name} defaultChecked={checked} className="size-4 accent-navy" />
      {label}
    </label>
  );
}
