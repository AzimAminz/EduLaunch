'use client';

import Link from 'next/link';
import { useState, type ReactNode } from 'react';
import { StudyModes, UPU_CODE_PATTERN } from '@edulaunch/contracts';
import { createProgramme, updateProgramme, type AdminFormState } from '@/lib/admin/actions';
import type { PendingDetails } from '@/lib/admin/api';
import { STUDY_LEVEL_OPTIONS } from '@/lib/catalogue/presentation';
import { format, type Dictionary, type Locale } from '@/lib/i18n/locale';
import { FormAlert, TextField } from '@/components/auth/fields';
import { Dropdown, type DropdownOption } from '@/components/ui/dropdown';
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
  /**
   * new: a new programme. draft: a programme never published (institution and level may still change).
   * change: a published programme; the saved values become a change another admin approves.
   */
  mode: 'new' | 'draft' | 'change';
  /** The values to start from: the draft, or the pending change (else the published details). */
  values?: PendingDetails & { id: string };
  /** A new programme started from an institution's page: that institution is chosen already. */
  initialInstitutionId?: string;
  cancelHref: string;
}

const URL_PATTERN = /^https?:\/\/\S+$/;

/**
 * The programme form. Its fields follow what JPT ePanduan and university prospectuses publish (code, faculty, NEC
 * field, duration, mode, campus, interview), so programmes typed by hand and imported later share one standard.
 * Required fields are marked; codes and links are checked when the admin leaves the field.
 */
export function ProgrammeForm({ locale, t, levels, noMatches, institutions, fields, necFields, mode, values, initialInstitutionId, cancelHref }: ProgrammeFormProps) {
  const f = t.programmeForm;
  const [state, onSubmit, pending] = useFormAction<AdminFormState>(mode === 'new' ? createProgramme : updateProgramme, {});
  const [institutionId, setInstitutionId] = useState(values?.institutionId ?? initialInstitutionId ?? '');
  const [level, setLevel] = useState<string>(values?.studyLevel ?? '');
  const [necCode, setNecCode] = useState(values?.necCode ?? '');
  const [studyMode, setStudyMode] = useState<string>(values?.studyMode ?? '');
  const [fieldIds, setFieldIds] = useState<string[]>(values?.fieldIds ?? []);
  const [duration, setDuration] = useState(values?.durationSemesters ? String(values.durationSemesters) : '');
  const [upu, setUpu] = useState(values?.upuCode ?? '');
  const [source, setSource] = useState(values?.sourceUrl ?? '');
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const canPlace = mode !== 'change';
  const isStream = level === 'form4_stream';
  const fieldError = (name: string) => {
    const key = state.fieldErrors?.[name] as keyof typeof f.errors | undefined;
    return key && !pending ? f.errors[key] : undefined;
  };
  // Checked on leaving the field, before the form is sent.
  const upuError = touched.upuCode && upu.trim() && !UPU_CODE_PATTERN.test(upu.trim().toUpperCase()) ? f.errors.upuInvalid : fieldError('upuCode');
  const sourceError = touched.sourceUrl && source.trim() && !URL_PATTERN.test(source.trim()) ? f.errors.sourceInvalid : fieldError('sourceUrl');
  const semesters = Number(duration);
  const durationHint = Number.isInteger(semesters) && semesters > 0 ? format(f.yearsHint, { years: semesters / 2 }) : f.durationHint;
  const placeholders: Record<string, string> = f.durationPlaceholders;

  const fieldLabel = (id: string) => fields.find((o) => o.value === id)?.label ?? id;
  const chooseNec = (code: string) => {
    setNecCode(code);
    // The NEC code suggests the broad field used for recommendations; the admin can still change it.
    const suggested = necFields.find((n) => n.value === code)?.fieldId;
    if (suggested && !fieldIds.includes(suggested) && fieldIds.length < 10) setFieldIds([...fieldIds, suggested]);
  };
  const required = (label: string) => `${label} *`;

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-6" noValidate>
      <input type="hidden" name="locale" value={locale} />
      {values && <input type="hidden" name="id" value={values.id} />}
      {canPlace && <input type="hidden" name="studyLevel" value={level} />}
      {canPlace && <input type="hidden" name="institutionId" value={isStream ? '' : institutionId} />}
      <input type="hidden" name="necCode" value={isStream ? '' : necCode} />
      <input type="hidden" name="studyMode" value={isStream ? '' : studyMode} />
      {fieldIds.map((id) => (
        <input key={id} type="hidden" name="fieldIds" value={id} />
      ))}
      <p className="text-[13px] text-muted">{f.required}</p>
      <FormAlert>{!pending && state.error ? t.errors[state.error] : undefined}</FormAlert>

      <Section title={f.sections.identity}>
        {canPlace ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Dropdown
                label={required(f.level)}
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
                  label={required(f.institution)}
                  value={institutionId}
                  onChange={setInstitutionId}
                  options={institutions}
                  placeholder={f.institutionPlaceholder}
                  noMatchesLabel={noMatches}
                  invalid={!!fieldError('institutionId')}
                />
                {fieldError('institutionId') ? (
                  <p className="text-[13px] text-red">{fieldError('institutionId')}</p>
                ) : (
                  !institutionId && <p className="text-[13px] text-muted">{f.noInstitution}</p>
                )}
              </div>
            )}
          </div>
        ) : (
          <dl className="grid gap-4 sm:grid-cols-2">
            <Fact label={f.institution} value={institutions.find((i) => i.value === values?.institutionId)?.label ?? '—'} />
            <Fact label={f.level} value={values ? levels[values.studyLevel] : '—'} />
          </dl>
        )}
        <TextField name="name" label={required(f.name)} placeholder={f.namePlaceholder} defaultValue={values?.name} maxLength={160} error={fieldError('name')} />
        {!isStream && (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField
                name="upuCode"
                label={f.upuCode}
                placeholder={f.upuPlaceholder}
                value={upu}
                onChange={(e) => setUpu(e.target.value.toUpperCase())}
                onBlur={() => setTouched({ ...touched, upuCode: true })}
                maxLength={9}
                hint={f.upuHint}
                error={upuError}
              />
              <TextField name="internalCode" label={f.internalCode} placeholder={f.internalPlaceholder} defaultValue={values?.internalCode ?? ''} maxLength={20} />
            </div>
            <TextField name="faculty" label={f.faculty} placeholder={f.facultyPlaceholder} defaultValue={values?.faculty ?? ''} maxLength={160} />
          </>
        )}
      </Section>

      <Section title={f.sections.academic}>
        {!isStream && (
          <div className="flex flex-col gap-2">
            <Dropdown label={f.nec} value={necCode} onChange={chooseNec} options={necFields} placeholder={f.necPlaceholder} noMatchesLabel={noMatches} />
            <p className="text-[13px] text-muted">{f.necHint}</p>
          </div>
        )}
        <div className="grid gap-4 sm:grid-cols-[200px_minmax(0,1fr)]">
          <TextField
            name="durationSemesters"
            label={f.duration}
            inputMode="numeric"
            value={duration}
            onChange={(e) => setDuration(e.target.value.replace(/\D/g, ''))}
            placeholder={placeholders[level]}
            hint={durationHint}
            error={fieldError('durationSemesters')}
          />
          {!isStream && (
            <Dropdown
              label={f.studyMode}
              value={studyMode}
              onChange={setStudyMode}
              options={StudyModes.map((m) => ({ value: m, label: f.studyModes[m] }))}
              placeholder={f.studyModePlaceholder}
              noMatchesLabel={noMatches}
              searchable={false}
            />
          )}
        </div>
        {!isStream && <TextField name="campus" label={f.campus} placeholder={f.campusPlaceholder} defaultValue={values?.campus ?? ''} maxLength={120} />}
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

      {!isStream && (
        <>
          <Section title={f.sections.admission}>
            <div className="grid gap-2 sm:grid-cols-2">
              <Check name="hasInterview" label={f.interview} checked={values?.hasInterview} />
              <Check name="bumiputeraOnly" label={f.bumiputera} checked={values?.bumiputeraOnly} />
              <Check name="isStem" label={f.stem} checked={values?.isStem} />
              <Check name="isTvet" label={f.tvet} checked={values?.isTvet} />
            </div>
            <p className="text-[13px] text-muted">{f.flagsHint}</p>
          </Section>

          <Section title={f.sections.source}>
            <TextField
              name="sourceUrl"
              label={f.sourceUrl}
              placeholder={f.sourcePlaceholder}
              value={source}
              onChange={(e) => setSource(e.target.value)}
              onBlur={() => setTouched({ ...touched, sourceUrl: true })}
              inputMode="url"
              hint={f.sourceHint}
              error={sourceError}
            />
          </Section>
        </>
      )}

      <div className="flex flex-wrap items-center gap-3 border-t border-line pt-5">
        <button type="submit" disabled={pending} className="rounded-[10px] bg-navy px-5 py-3 font-semibold text-white hover:bg-navy/90 disabled:cursor-wait disabled:opacity-70">
          {mode === 'new' ? f.create : mode === 'change' ? f.saveChange : f.save}
        </button>
        <Link href={cancelHref} className="rounded-[10px] border border-line px-5 py-3 font-semibold hover:bg-bg">
          {f.cancel}
        </Link>
      </div>
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
