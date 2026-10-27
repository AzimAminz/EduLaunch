'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { StudyModes } from '@edulaunch/contracts';
import { createProgramme, updateProgramme, type AdminFormState } from '@/lib/admin/actions';
import type { PendingDetails } from '@/lib/admin/api';
import { STUDY_LEVEL_OPTIONS } from '@/lib/catalogue/presentation';
import { format, type Dictionary, type Locale } from '@/lib/i18n/locale';
import { FormAlert, TextField } from '@/components/auth/fields';
import { Dropdown, type DropdownOption } from '@/components/ui/dropdown';
import { useFormAction } from '@/components/ui/use-form-action';
import { AdminIcon } from './icons';
import { IconText, buttonClass } from './ui';

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
  const [name, setName] = useState(values?.name ?? '');
  const [step, setStep] = useState(0);
  /** Problems found before moving to the next step, by field name, as keys of `f.errors`. */
  const [stepErrors, setStepErrors] = useState<Record<string, string>>({});
  const [leaving, setLeaving] = useState(false);
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  // What the form held when it opened, to tell whether leaving would lose anything.
  const initial = useRef<string | null>(null);
  const snapshot = () => (formRef.current ? JSON.stringify([...new FormData(formRef.current).entries()]) : '');
  useEffect(() => {
    initial.current = snapshot();
  }, []);

  const canPlace = mode !== 'change';
  const isStream = level === 'form4_stream';
  const fieldError = (field: string) => {
    const key = (stepErrors[field] ?? state.fieldErrors?.[field]) as keyof typeof f.errors | undefined;
    return key && !pending ? f.errors[key] : undefined;
  };

  // The form in short steps: identity, then academic details, then admission and source (streams have two).
  const steps = isStream ? [f.sections.identity, f.sections.academic] : [f.sections.identity, f.sections.academic, f.steps.admission];
  const last = step >= steps.length - 1;
  const STEP_OF: Record<string, number> = { studyLevel: 0, institutionId: 0, name: 0, upuCode: 0, durationSemesters: 1, sourceUrl: 2 };

  /** The same checks as the server, for the fields of one step, so the admin fixes them before moving on. */
  const problemsIn = (n: number): Record<string, string> => {
    const found: Record<string, string> = {};
    if (n === 0) {
      if (canPlace && !level) found.studyLevel = 'levelRequired';
      if (canPlace && !isStream && !institutionId) found.institutionId = 'institutionRequired';
      if (name.trim().length < 3 || name.trim().length > 160) found.name = 'nameRequired';
      // Required, with no fixed format yet (the official guideline for these codes is still being checked).
      if (!isStream && !upu.trim()) found.upuCode = 'upuRequired';
    }
    if (n === 1 && duration && (Number(duration) < 1 || Number(duration) > 16)) found.durationSemesters = 'durationInvalid';
    if (n === 2 && source.trim() && !URL_PATTERN.test(source.trim())) found.sourceUrl = 'sourceInvalid';
    return found;
  };
  const goTo = (target: number) => {
    // Forward only past steps without problems; back is always allowed.
    for (let n = step; n < target; n++) {
      const found = problemsIn(n);
      if (Object.keys(found).length) {
        setStepErrors(found);
        setStep(n);
        return;
      }
    }
    setStepErrors({});
    setStep(target);
  };

  /**
   * Only the last step sends the form. On earlier steps Enter (or any other submit) moves to the next step instead,
   * so nothing is saved before the admin has seen every step.
   */
  const submit = (e: FormEvent<HTMLFormElement>) => {
    if (!last) {
      e.preventDefault();
      goTo(step + 1);
      return;
    }
    // The earlier steps are checked again before the form is sent.
    const firstProblem = steps.map((_, n) => n).find((n) => Object.keys(problemsIn(n)).length);
    if (firstProblem !== undefined) {
      e.preventDefault();
      setStepErrors(problemsIn(firstProblem));
      setStep(firstProblem);
      return;
    }
    onSubmit(e);
  };
  /** Cancel asks first only when something was typed or chosen. */
  const cancel = () => {
    if (initial.current !== null && snapshot() !== initial.current) setLeaving(true);
    else router.push(cancelHref);
  };

  // A refusal from the server opens the step that holds the first problem.
  const [seenErrors, setSeenErrors] = useState(state.fieldErrors);
  if (state.fieldErrors !== seenErrors) {
    setSeenErrors(state.fieldErrors);
    const withProblems = Object.keys(state.fieldErrors ?? {}).map((k) => STEP_OF[k] ?? 0);
    if (withProblems.length) setStep(Math.min(...withProblems));
  }
  // Checked on leaving the field, before the form is sent.
  const upuError = touched.upuCode && !upu.trim() ? f.errors.upuRequired : fieldError('upuCode');
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
    <form ref={formRef} onSubmit={submit} className="flex flex-col gap-6" noValidate>
      <input type="hidden" name="locale" value={locale} />
      {values && <input type="hidden" name="id" value={values.id} />}
      {canPlace && <input type="hidden" name="studyLevel" value={level} />}
      {canPlace && <input type="hidden" name="institutionId" value={isStream ? '' : institutionId} />}
      <input type="hidden" name="necCode" value={isStream ? '' : necCode} />
      <input type="hidden" name="studyMode" value={isStream ? '' : studyMode} />
      {fieldIds.map((id) => (
        <input key={id} type="hidden" name="fieldIds" value={id} />
      ))}
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-2">
        {steps.map((label, i) => (
          <li key={label} className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => goTo(i)}
              aria-current={i === step ? 'step' : undefined}
              className={`flex items-center gap-2 rounded-full py-1 pl-1 pr-3 text-sm font-semibold transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy/40 ${i === step ? 'bg-navy text-white' : 'hover:bg-bg'}`}
            >
              <span className={`flex size-7 items-center justify-center rounded-full text-xs ${i === step ? 'bg-white text-navy' : i < step ? 'bg-[#1f6b47] text-white' : 'bg-bg text-muted'}`}>
                {i < step ? <AdminIcon name="check" size={14} /> : i + 1}
              </span>
              <span className={i === step || i < step ? '' : 'text-muted'}>{label}</span>
            </button>
            {i < steps.length - 1 && <span aria-hidden className="h-px w-6 bg-line" />}
          </li>
        ))}
      </ol>
      <p className="text-[13px] text-muted">{f.required}</p>
      <FormAlert>{!pending && state.error ? t.errors[state.error] : undefined}</FormAlert>

      {/* Every step stays in the page (hidden), so the whole form is sent at the end. */}
      {/* The step line names steps 1 and 2 already, so their sections need no heading of their own. */}
      <Section hidden={step !== 0}>
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
        <TextField name="name" label={required(f.name)} placeholder={f.namePlaceholder} value={name} onChange={(e) => setName(e.target.value)} maxLength={160} error={fieldError('name')} />
        {!isStream && (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField
                name="upuCode"
                label={required(f.upuCode)}
                placeholder={f.upuPlaceholder}
                value={upu}
                onChange={(e) => setUpu(e.target.value.toUpperCase())}
                onBlur={() => setTouched({ ...touched, upuCode: true })}
                maxLength={30}
                hint={f.upuHint}
                error={upuError}
              />
              <TextField name="internalCode" label={f.internalCode} placeholder={f.internalPlaceholder} defaultValue={values?.internalCode ?? ''} maxLength={20} />
            </div>
            <TextField name="faculty" label={f.faculty} placeholder={f.facultyPlaceholder} defaultValue={values?.faculty ?? ''} maxLength={160} />
          </>
        )}
      </Section>

      <Section hidden={step !== 1}>
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
        <div hidden={step !== 2} className="flex flex-col gap-6">
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
        </div>
      )}

      {/* One bar on every step: going back on the left, going forward on the right, so nothing moves under the pointer. */}
      <div className="sticky bottom-0 z-10 -mx-5 -mb-5 rounded-b-[18px] border-t border-line bg-white/95 px-5 py-4 backdrop-blur lg:-mx-6 lg:-mb-6 lg:px-6">
        {leaving ? (
          <div role="alertdialog" aria-label={f.leave.message} className="flex flex-wrap items-center gap-3">
            <AdminIcon name="alert" size={18} className="text-[#b33a35]" />
            <p className="flex-1 text-sm">{f.leave.message}</p>
            <button type="button" onClick={() => setLeaving(false)} className={buttonClass('secondary')} autoFocus>
              {f.leave.stay}
            </button>
            <button type="button" onClick={() => router.push(cancelHref)} className={buttonClass('danger')}>
              <IconText icon="trash">{f.leave.discard}</IconText>
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            {/* Each button has its own key, so a click on "Next" can never land on the "Save" button that replaces it. */}
            {step === 0 ? (
              <button key="cancel" type="button" onClick={cancel} className={buttonClass('ghost')}>
                {f.cancel}
              </button>
            ) : (
              <button key="back" type="button" onClick={() => goTo(step - 1)} className={buttonClass('secondary')}>
                <IconText icon="arrowLeft">{f.steps.back}</IconText>
              </button>
            )}
            <span className="ml-auto hidden text-[13px] text-muted sm:inline">{format(f.steps.of, { n: step + 1, total: steps.length })}</span>
            {last ? (
              <button key="save" type="submit" disabled={pending} className={`${buttonClass('primary')} ml-auto sm:ml-0`}>
                <IconText icon={mode === 'new' ? 'plus' : 'save'} busy={pending}>
                  {mode === 'new' ? f.create : mode === 'change' ? f.saveChange : f.save}
                </IconText>
              </button>
            ) : (
              <button key="next" type="button" onClick={() => goTo(step + 1)} className={`${buttonClass('primary')} group ml-auto sm:ml-0`}>
                <span>{f.steps.next}</span>
                <AdminIcon name="arrowRight" size={16} className="transition-transform duration-150 group-hover:translate-x-0.5 motion-reduce:transition-none" />
              </button>
            )}
          </div>
        )}
      </div>
    </form>
  );
}

function Section({ title, children, hidden }: { title?: string; children: ReactNode; hidden?: boolean }) {
  return (
    <section hidden={hidden} className="flex flex-col gap-4">
      {title && <h3 className="border-b border-line pb-2 text-sm font-semibold uppercase tracking-wide text-muted">{title}</h3>}
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
