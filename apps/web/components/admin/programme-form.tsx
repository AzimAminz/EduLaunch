'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, useTransition, type FormEvent, type KeyboardEvent, type ReactNode } from 'react';
import { StudyModes } from '@edulaunch/contracts';
import { createProgramme, lookupEpanduanProgramme, updateProgramme, type AdminFormState } from '@/lib/admin/actions';
import type { PendingDetails } from '@/lib/admin/api';
import { EntryRoutes } from '@edulaunch/contracts';
import { differencesFromEpanduan, draftFromFound, entryRoutesFromFound, type EpanduanFormField } from '@/lib/admin/epanduan-import';
import { STUDY_LEVEL_OPTIONS } from '@/lib/catalogue/presentation';
import { format, type Dictionary, type Locale } from '@/lib/i18n/locale';
import { FormAlert, TextField } from '@/components/auth/fields';
import { Dropdown, type DropdownOption } from '@/components/ui/dropdown';
import { Modal } from '@/components/ui/modal';
import { useFormAction } from '@/components/ui/use-form-action';
import { AdminIcon } from './icons';
import { IconText, buttonClass } from './ui';
import { FromField } from './from-field';

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
  /** Entry routes (with the ePanduan category each came from) and the newest average merit, kept outside `values`. */
  admission?: { entryRouteRows: RouteRow[]; averageMerit: { intakeYear: number; value: number } | null };
  /** Names of the entry routes ("Lepasan STPM"). */
  routeNames: Record<string, string>;
  cancelHref: string;
}

type RouteRow = { entryRoute: string; sourceCategory: string | null };

/** What ePanduan gives for this programme, in the form's terms. */
interface FromEpanduan {
  year: number | null;
  sourceUrl: string | null;
  values: Record<EpanduanFormField, unknown>;
  routes: RouteRow[];
  merit: number | null;
}

const URL_PATTERN = /^https?:\/\/\S+$/;
const FLAGS = ['hasInterview', 'bumiputeraOnly', 'isStem', 'isTvet', 'jointDegree', 'feeder'] as const;
type Flag = (typeof FLAGS)[number];

/**
 * The programme form, in the order JPT ePanduan shows a programme: the programme (level, institution, code, name),
 * its study (NEC field, duration, mode, campuses), admission flags, and more details (careers, fees, note, source).
 * With a programme code, "fill from ePanduan" fills every step from the last ePanduan reading, for the admin to
 * check; without one (a private college, a programme not on ePanduan) everything is typed in the same fields.
 */
export function ProgrammeForm({ locale, t, levels, noMatches, institutions, fields, necFields, mode, values, initialInstitutionId, admission, routeNames, cancelHref }: ProgrammeFormProps) {
  const f = t.programmeForm;
  const [state, onSubmit, pending] = useFormAction<AdminFormState>(mode === 'new' ? createProgramme : updateProgramme, {});
  const [institutionId, setInstitutionId] = useState(values?.institutionId ?? initialInstitutionId ?? '');
  const [level, setLevel] = useState<string>(values?.studyLevel ?? '');
  const [necCode, setNecCode] = useState(values?.necCode ?? '');
  const [studyMode, setStudyMode] = useState<string>(values?.studyMode ?? '');
  const [fieldIds, setFieldIds] = useState<string[]>(values?.fieldIds ?? []);
  const [duration, setDuration] = useState(values?.durationSemesters ? String(values.durationSemesters) : '');
  const [upu, setUpu] = useState(values?.programCode ?? '');
  const [source, setSource] = useState(values?.sourceUrl ?? '');
  const [name, setName] = useState(values?.name ?? '');
  const [campuses, setCampuses] = useState<string[]>(values?.campuses ?? []);
  const [careers, setCareers] = useState<string[]>(values?.careers ?? []);
  const [fees, setFees] = useState(values?.fees ?? '');
  const [note, setNote] = useState(values?.note ?? '');
  const [flags, setFlags] = useState<Record<Flag, boolean>>(() => Object.fromEntries(FLAGS.map((k) => [k, values?.[k] ?? false])) as Record<Flag, boolean>);
  const [routeRows, setRouteRows] = useState<RouteRow[]>(admission?.entryRouteRows ?? []);
  const [merit, setMerit] = useState(admission?.averageMerit ? String(admission.averageMerit.value) : '');
  const [meritYear, setMeritYear] = useState(admission?.averageMerit ? String(admission.averageMerit.intakeYear) : '');
  const [epanduan, setEpanduan] = useState<FromEpanduan | null>(null);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [step, setStep] = useState(0);
  /** Problems found before moving to the next step, by field name, as keys of `f.errors`. */
  const [stepErrors, setStepErrors] = useState<Record<string, string>>({});
  const [leaving, setLeaving] = useState(false);
  const [filling, startFill] = useTransition();
  const [fillNote, setFillNote] = useState<{ tone: 'ok' | 'warn'; text: string } | null>(null);
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

  // In ePanduan's order: programme, study, admission, more details (a Form 4 stream has the first two only).
  const steps = isStream ? [f.sections.identity, f.sections.academic] : [f.sections.identity, f.sections.academic, f.sections.admission, f.sections.more];
  const last = step >= steps.length - 1;
  const STEP_OF: Record<string, number> = { studyLevel: 0, institutionId: 0, name: 0, programCode: 0, durationSemesters: 1, sourceUrl: 3 };

  /** The same checks as the server, for the fields of one step, so the admin fixes them before moving on. */
  const problemsIn = (n: number): Record<string, string> => {
    const found: Record<string, string> = {};
    if (n === 0) {
      if (canPlace && !level) found.studyLevel = 'levelRequired';
      if (canPlace && !isStream && !institutionId) found.institutionId = 'institutionRequired';
      if (name.trim().length < 3 || name.trim().length > 160) found.name = 'nameRequired';
      // Required, with no fixed format yet (the official guideline for these codes is still being checked).
      if (!isStream && !upu.trim()) found.programCode = 'upuRequired';
    }
    if (n === 1 && duration && (Number(duration) < 1 || Number(duration) > 16)) found.durationSemesters = 'durationInvalid';
    if (n === 3 && source.trim() && !URL_PATTERN.test(source.trim())) found.sourceUrl = 'sourceInvalid';
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
  const upuError = touched.programCode && !upu.trim() ? f.errors.upuRequired : fieldError('programCode');
  const sourceError = touched.sourceUrl && source.trim() && !URL_PATTERN.test(source.trim()) ? f.errors.sourceInvalid : fieldError('sourceUrl');
  const semesters = Number(duration);
  const durationHint = Number.isInteger(semesters) && semesters > 0 ? format(f.yearsHint, { years: semesters / 2 }) : f.durationHint;
  const placeholders: Record<string, string> = f.durationPlaceholders;

  const fieldLabel = (id: string) => fields.find((o) => o.value === id)?.label ?? id;
  const suggestField = (code: string, current: string[]) => {
    // The NEC code suggests the broad field used for recommendations; the admin can still change it.
    const suggested = necFields.find((n) => n.value === code)?.fieldId;
    return suggested && !current.includes(suggested) && current.length < 10 ? [...current, suggested] : current;
  };
  const chooseNec = (code: string) => {
    setNecCode(code);
    setFieldIds(suggestField(code, fieldIds));
  };

  const necMap = new Map(necFields.map((n) => [n.value, n.fieldId]));
  /** The last ePanduan reading of this code, in the form's terms; null when ePanduan does not have it. */
  const read = async (): Promise<{ status: 'found'; data: FromEpanduan; institutionId: string | null; level: string | null } | { status: 'not_found' | 'unavailable' }> => {
    const result = await lookupEpanduanProgramme(locale, upu);
    if (result.status !== 'found') return result;
    const found = result.programme;
    const draft = draftFromFound({ ...found, level: found.level ?? (level as never) }, necMap);
    const data: FromEpanduan = {
      year: found.year,
      sourceUrl: draft.sourceUrl,
      values: { ...Object.fromEntries(FLAGS.map((k) => [k, draft[k]])), name: draft.name, durationSemesters: draft.durationSemesters, necCode: draft.necCode, studyMode: draft.studyMode, campuses: draft.campuses, careers: draft.careers, fees: draft.fees, note: draft.note } as Record<EpanduanFormField, unknown>,
      routes: entryRoutesFromFound(found),
      merit: found.merit,
    };
    return { status: 'found', data, institutionId: result.institutionId, level: found.level };
  };
  // An existing programme with a code is compared with ePanduan when the form opens, so differences show by each field.
  useEffect(() => {
    if (mode === 'new' || !values?.programCode) return;
    let live = true;
    read().then((r) => live && r.status === 'found' && setEpanduan(r.data)).catch(() => null);
    return () => {
      live = false;
    };
    // Once, for the stored code.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Takes ePanduan's value for one field. */
  const use = (field: EpanduanFormField | 'routes' | 'merit', data = epanduan) => {
    if (!data) return;
    const v = data.values;
    switch (field) {
      case 'name':
        return setName(String(v.name));
      case 'durationSemesters':
        return v.durationSemesters && setDuration(String(v.durationSemesters));
      case 'necCode':
        if (!v.necCode) return;
        setNecCode(String(v.necCode));
        return setFieldIds((ids) => suggestField(String(v.necCode), ids));
      case 'studyMode':
        return v.studyMode && setStudyMode(String(v.studyMode));
      case 'campuses':
        return setCampuses(v.campuses as string[]);
      case 'careers':
        return setCareers(v.careers as string[]);
      case 'fees':
        return setFees(String(v.fees ?? ''));
      case 'note':
        return setNote(String(v.note ?? ''));
      case 'routes':
        return data.routes.length && setRouteRows(data.routes);
      case 'merit':
        if (data.merit === null) return;
        setMerit(String(data.merit));
        return data.year && setMeritYear(String(data.year));
      default:
        return setFlags((x) => ({ ...x, [field]: Boolean(v[field]) }));
    }
  };

  /** Fills every step from the last ePanduan reading of this code; what ePanduan does not give is left as it is. */
  const fill = () => {
    if (!upu.trim()) {
      setFillNote({ tone: 'warn', text: f.fill.needCode });
      return;
    }
    startFill(async () => {
      const result = await read();
      if (result.status !== 'found') {
        setFillNote({ tone: 'warn', text: result.status === 'unavailable' ? f.fill.unavailable : f.fill.notFound });
        return;
      }
      if (canPlace && result.level) setLevel(result.level);
      if (canPlace && result.institutionId && !institutionId) setInstitutionId(result.institutionId);
      for (const field of [...(Object.keys(result.data.values) as EpanduanFormField[]), 'routes', 'merit'] as const) use(field, result.data);
      if (result.data.sourceUrl) setSource(result.data.sourceUrl);
      setEpanduan(result.data);
      setStepErrors({});
      setFillNote({ tone: 'ok', text: result.data.year ? format(f.fill.done, { year: result.data.year }) : f.fill.doneNoYear });
    });
  };

  // Where the form differs from ePanduan (shown by each field, and counted at the top).
  const current: Record<EpanduanFormField, unknown> = {
    ...flags,
    name,
    durationSemesters: duration ? Number(duration) : null,
    necCode: necCode || null,
    studyMode: studyMode || null,
    campuses,
    careers,
    fees: fees || null,
    note: note || null,
  };
  const routeKey = (rows: RouteRow[]) => [...new Set(rows.map((r) => r.entryRoute))].sort().join(',');
  const differs = new Set<EpanduanFormField | 'routes' | 'merit'>(epanduan ? differencesFromEpanduan(current, epanduan.values) : []);
  if (epanduan?.routes.length && routeKey(epanduan.routes) !== routeKey(routeRows)) differs.add('routes');
  if (epanduan?.merit !== null && epanduan?.merit !== undefined && Number(merit) !== epanduan.merit) differs.add('merit');
  const fieldName: Record<EpanduanFormField | 'routes' | 'merit', string> = {
    name: f.name,
    durationSemesters: f.duration,
    necCode: f.nec,
    studyMode: f.studyMode,
    campuses: f.campuses,
    hasInterview: f.interview,
    bumiputeraOnly: f.bumiputera,
    isStem: f.stem,
    isTvet: f.tvet,
    jointDegree: f.jointDegree,
    feeder: f.feeder,
    careers: f.careers,
    fees: f.fees,
    note: f.note,
    routes: f.entryRoutes,
    merit: f.merit,
  };
  /** ePanduan's value for one field, as words. */
  const shown = (field: EpanduanFormField | 'routes' | 'merit'): string => {
    if (!epanduan) return '';
    if (field === 'routes') return [...new Set(epanduan.routes.map((r) => routeNames[r.entryRoute] ?? r.entryRoute))].join(', ');
    if (field === 'merit') return `${epanduan.merit}${epanduan.year ? ` (${epanduan.year})` : ''}`;
    const v = epanduan.values[field];
    if (typeof v === 'boolean') return v ? t.programme.values.yes : t.programme.values.no;
    if (Array.isArray(v)) return v.join(field === 'campuses' ? '; ' : ', ');
    if (field === 'studyMode' && v) return f.studyModes[v as keyof typeof f.studyModes];
    if (field === 'necCode' && v) return necFields.find((n) => n.value === v)?.label ?? String(v);
    return String(v ?? '');
  };
  const hint = (field: EpanduanFormField | 'routes' | 'merit') =>
    differs.has(field) ? <EpanduanHint label={f.fill.differs} value={shown(field)} use={f.fill.use} onUse={() => use(field)} /> : null;
  const required = (label: string) => `${label} *`;

  return (
    <form ref={formRef} onSubmit={submit} className="flex flex-col gap-6" noValidate>
      <input type="hidden" name="locale" value={locale} />
      <FromField />
      {values && <input type="hidden" name="id" value={values.id} />}
      {canPlace && <input type="hidden" name="studyLevel" value={level} />}
      {canPlace && <input type="hidden" name="institutionId" value={isStream ? '' : institutionId} />}
      <input type="hidden" name="necCode" value={isStream ? '' : necCode} />
      <input type="hidden" name="studyMode" value={isStream ? '' : studyMode} />
      {fieldIds.map((id) => (
        <input key={id} type="hidden" name="fieldIds" value={id} />
      ))}
      {!isStream && (
        <>
          {campuses.map((c) => (
            <input key={`campus-${c}`} type="hidden" name="campuses" value={c} />
          ))}
          {careers.map((c) => (
            <input key={`career-${c}`} type="hidden" name="careers" value={c} />
          ))}
          {FLAGS.filter((k) => flags[k]).map((k) => (
            <input key={k} type="hidden" name={k} value="on" />
          ))}
          {/* Entry routes and merit are saved with the programme (they apply at once, like an import). */}
          <input type="hidden" name="admission" value="1" />
          {routeRows.map((r) => (
            <input key={`${r.entryRoute}|${r.sourceCategory ?? ''}`} type="hidden" name="entryRouteRows" value={`${r.entryRoute}|${r.sourceCategory ?? ''}`} />
          ))}
          <input type="hidden" name="averageMerit" value={merit} />
          <input type="hidden" name="meritYear" value={meritYear} />
        </>
      )}
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
        {!isStream && (
          <div className="flex flex-col gap-2">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
              <div className="min-w-0 flex-1">
                <TextField
                  name="programCode"
                  label={required(f.programCode)}
                  placeholder={f.upuPlaceholder}
                  value={upu}
                  onChange={(e) => {
                    setUpu(e.target.value.toUpperCase());
                    setFillNote(null);
                  }}
                  onBlur={() => setTouched({ ...touched, programCode: true })}
                  maxLength={30}
                  hint={f.upuHint}
                  error={upuError}
                />
              </div>
              <button type="button" onClick={fill} disabled={filling} className={`${buttonClass('accent')} sm:mt-[30px]`}>
                <IconText icon="external" busy={filling}>
                  {f.fill.button}
                </IconText>
              </button>
            </div>
            {fillNote && (
              <p role="status" className={`flex items-start gap-2 rounded-[8px] px-4 py-3 text-sm ${fillNote.tone === 'ok' ? 'bg-mint text-[#1f6b47]' : 'bg-cream'}`}>
                <AdminIcon name={fillNote.tone === 'ok' ? 'checkCircle' : 'info'} size={18} className="mt-0.5 shrink-0" />
                {fillNote.text}
              </p>
            )}
            {!fillNote && differs.size > 0 && (
              <div role="status" className="flex flex-wrap items-center gap-3 rounded-[8px] border border-[#e0a800]/50 bg-cream px-4 py-3 text-sm">
                <AdminIcon name="info" size={18} className="shrink-0" />
                <span className="flex-1">
                  {format(f.fill.summary, { count: differs.size, year: epanduan?.year ?? '' })} <span className="font-semibold">{[...differs].map((k) => fieldName[k]).join(', ')}</span>
                </span>
                <button type="button" onClick={fill} disabled={filling} className={buttonClass('secondary', 'sm')}>
                  <IconText icon="external" busy={filling}>
                    {f.fill.useAll}
                  </IconText>
                </button>
              </div>
            )}
          </div>
        )}
        <div className="flex flex-col gap-1.5">
          <TextField name="name" label={required(f.name)} placeholder={f.namePlaceholder} value={name} onChange={(e) => setName(e.target.value)} maxLength={160} error={fieldError('name')} />
          {hint('name')}
        </div>
        {!isStream && (
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField name="internalCode" label={f.internalCode} placeholder={f.internalPlaceholder} defaultValue={values?.internalCode ?? ''} maxLength={20} />
            <TextField name="faculty" label={f.faculty} placeholder={f.facultyPlaceholder} defaultValue={values?.faculty ?? ''} maxLength={160} />
          </div>
        )}
      </Section>

      <Section hidden={step !== 1}>
        {!isStream && (
          <div className="flex flex-col gap-2">
            <Dropdown label={f.nec} value={necCode} onChange={chooseNec} options={necFields} placeholder={f.necPlaceholder} noMatchesLabel={noMatches} />
            {hint('necCode')}
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
        {hint('durationSemesters')}
        {hint('studyMode')}
        {!isStream && (
          <ListInput
            id="campuses"
            label={f.campuses}
            placeholder={f.campusesPlaceholder}
            hint={f.campusesHint}
            items={campuses}
            onChange={setCampuses}
            most={20}
            max={120}
            add={f.addItem}
            remove={f.removeItem}
          />
        )}
        {!isStream && hint('campuses')}
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
                  <button type="button" onClick={() => setFieldIds(fieldIds.filter((x) => x !== id))} aria-label={format(f.removeItem, { item: fieldLabel(id) })} className="rounded-full px-1.5 hover:bg-white">
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
        <Section hidden={step !== 2}>
          <div className="grid gap-2 sm:grid-cols-2">
            {FLAGS.map((k) => (
              <Check
                key={k}
                label={{ hasInterview: f.interview, bumiputeraOnly: f.bumiputera, isStem: f.stem, isTvet: f.tvet, jointDegree: f.jointDegree, feeder: f.feeder }[k]}
                checked={flags[k]}
                onChange={(on) => setFlags({ ...flags, [k]: on })}
              />
            ))}
          </div>
          {FLAGS.filter((k) => differs.has(k)).map((k) => (
            <EpanduanHint key={k} label={`${fieldName[k]} · ${f.fill.differs}`} value={shown(k)} use={f.fill.use} onUse={() => use(k)} />
          ))}
          <p className="text-[13px] text-muted">{f.flagsHint}</p>

          {/* Entry routes and the average merit: from ePanduan's candidate lists, kept with the programme. */}
          <div className="flex flex-col gap-2 border-t border-line pt-4">
            <p className="text-sm font-semibold">{f.entryRoutes}</p>
            <div className="flex flex-wrap gap-2">
              {EntryRoutes.map((route) => {
                const on = routeRows.some((r) => r.entryRoute === route);
                return (
                  <button
                    key={route}
                    type="button"
                    aria-pressed={on}
                    onClick={() => setRouteRows((rows) => (on ? rows.filter((r) => r.entryRoute !== route) : [...rows, { entryRoute: route, sourceCategory: null }]))}
                    className={`rounded-full border px-3 py-1.5 text-[13px] font-semibold transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy/40 ${
                      on ? 'border-navy bg-navy text-white' : 'border-line bg-white text-navy hover:bg-bg'
                    }`}
                  >
                    {routeNames[route] ?? route}
                  </button>
                );
              })}
            </div>
            {hint('routes')}
            <p className="text-[13px] text-muted">{f.entryRoutesHint}</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField name="meritInput" label={f.merit} inputMode="decimal" value={merit} onChange={(e) => setMerit(e.target.value.replace(/[^\d.]/g, ''))} placeholder="83.29" hint={f.meritHint} />
            <TextField name="meritYearInput" label={f.meritYear} inputMode="numeric" value={meritYear} onChange={(e) => setMeritYear(e.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="2026" />
          </div>
          {hint('merit')}
        </Section>
      )}

      {!isStream && (
        <Section hidden={step !== 3}>
          <ListInput
            id="careers"
            label={f.careers}
            placeholder={f.careersPlaceholder}
            hint={f.careersHint}
            items={careers}
            onChange={setCareers}
            most={40}
            max={120}
            add={f.addItem}
            remove={f.removeItem}
          />
          {hint('careers')}
          <Area name="fees" label={f.fees} placeholder={f.feesPlaceholder} value={fees} onChange={setFees} max={1000} />
          {hint('fees')}
          <Area name="note" label={f.note} placeholder={f.notePlaceholder} value={note} onChange={setNote} max={2000} />
          {hint('note')}
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
      )}

      {/* One bar on every step: going back on the left, going forward on the right, so nothing moves under the pointer. */}
      <div className="sticky bottom-0 z-10 -mx-5 -mb-5 rounded-b-[18px] border-t border-line bg-white/95 px-5 py-4 backdrop-blur lg:-mx-6 lg:-mb-6 lg:px-6">
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
      </div>
      <Modal
        open={leaving}
        onClose={() => setLeaving(false)}
        alert
        tone="danger"
        icon={<AdminIcon name="alert" size={20} />}
        title={f.leave.title}
        description={f.leave.message}
        footer={
          <>
            <button type="button" onClick={() => setLeaving(false)} className={buttonClass('secondary')} data-autofocus>
              {f.leave.stay}
            </button>
            <button type="button" onClick={() => router.push(cancelHref)} className={buttonClass('dangerSolid')}>
              <IconText icon="trash">{f.leave.discard}</IconText>
            </button>
          </>
        }
      />
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

function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: (on: boolean) => void }) {
  return (
    <label className={`flex cursor-pointer items-center gap-2.5 rounded-[8px] border px-3.5 py-3 text-sm font-medium transition-colors duration-150 ${checked ? 'border-navy/40 bg-navy/[0.05]' : 'border-transparent bg-bg'}`}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="size-4 accent-navy" />
      {label}
    </label>
  );
}

function Area({ name, label, placeholder, value, onChange, max }: { name: string; label: string; placeholder: string; value: string; onChange: (v: string) => void; max: number }) {
  return (
    <label className="flex flex-col gap-2 text-sm font-semibold">
      {label}
      <textarea
        name={name}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={3}
        maxLength={max}
        placeholder={placeholder}
        className="rounded-[8px] border border-[#9aa3b2] bg-white px-4 py-3 text-[15px] font-normal outline-none focus:border-navy focus:ring-2 focus:ring-navy/15"
      />
    </label>
  );
}

/** A list typed one item at a time (Enter or "add"), shown as removable chips: campuses, careers. */
function ListInput({ id, label, placeholder, hint, items, onChange, most, max, add, remove }: {
  id: string;
  label: string;
  placeholder: string;
  hint: string;
  items: string[];
  onChange: (items: string[]) => void;
  most: number;
  max: number;
  add: string;
  remove: string;
}) {
  const [draft, setDraft] = useState('');
  const push = () => {
    const item = draft.trim().slice(0, max);
    if (item && items.length < most && !items.some((x) => x.toLowerCase() === item.toLowerCase())) onChange([...items, item]);
    setDraft('');
  };
  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    // Enter adds the item here instead of moving the form on.
    if (e.key === 'Enter') {
      e.preventDefault();
      push();
    }
  };
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={`${id}-input`} className="text-sm font-semibold">
        {label}
      </label>
      <div className="flex gap-2">
        <input
          id={`${id}-input`}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKey}
          placeholder={placeholder}
          maxLength={max}
          disabled={items.length >= most}
          className="min-w-0 flex-1 rounded-[8px] border border-[#9aa3b2] bg-white px-4 py-3 text-[15px] outline-none focus:border-navy focus:ring-2 focus:ring-navy/15"
        />
        <button type="button" onClick={push} disabled={!draft.trim()} className={buttonClass('secondary')}>
          <IconText icon="plus">{add}</IconText>
        </button>
      </div>
      {items.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {items.map((item) => (
            <li key={item} className="flex items-center gap-1 rounded-full bg-blue py-1 pl-3 pr-1 text-sm font-medium">
              {item}
              <button type="button" onClick={() => onChange(items.filter((x) => x !== item))} aria-label={format(remove, { item })} className="rounded-full px-1.5 hover:bg-white">
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
      <p className="text-[13px] text-muted">{hint}</p>
    </div>
  );
}

/** "ePanduan: <value>  [Use]" under a field whose value differs from ePanduan's. */
function EpanduanHint({ label, value, use, onUse }: { label: string; value: string; use: string; onUse: () => void }) {
  return (
    <p className="flex flex-wrap items-start gap-2 rounded-[8px] bg-cream/70 px-3 py-2 text-[13px]">
      <span className="font-semibold">{label}</span>
      <span className="min-w-0 flex-1 break-words">{value.length > 220 ? `${value.slice(0, 220)}…` : value}</span>
      <button type="button" onClick={onUse} className="shrink-0 rounded-md px-2 py-0.5 font-semibold text-navy underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy/40">
        {use}
      </button>
    </p>
  );
}

