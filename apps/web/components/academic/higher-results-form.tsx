'use client';

import { useState } from 'react';
import { MAX_SEMESTERS, MatriculationStreams, MuetBands, hasCgpa, hasProgramme, hasSemesters, hasSubjectGrades, qualificationLevelsFor, type MatriculationStream } from '@edulaunch/contracts';
import { saveHigherResults } from '@/lib/profile/actions';
import { rowsForStream, type HigherQualification, type SubjectOption, type SubjectRow } from '@/lib/profile/records';
import { format, type Dictionary, type Locale } from '@/lib/i18n/locale';
import { FormAlert, SubmitButton, TextField } from '@/components/auth/fields';
import { Dropdown } from '@/components/ui/dropdown';
import { Notice } from '@/components/ui/notice';
import { useFormAction } from '@/components/ui/use-form-action';
import { SubjectRowsEditor } from './subject-rows-editor';

interface HigherResultsFormProps {
  locale: Locale;
  qualification: HigherQualification;
  t: Dictionary['higher'];
  academic: Dictionary['academic'];
  /** Subjects for STPM or A-Level; empty for qualifications judged on CGPA only. */
  subjects: SubjectOption[];
  grades: readonly string[];
  fields: Array<{ value: string; label: string }>;
  years: number[];
  initial: {
    examYear: number | null;
    cgpa: number | null;
    muetBand: number | null;
    fieldId: string | null;
    programmeName: string | null;
    qualificationLevel: number | null;
    stream: string | null;
    customFieldName: string | null;
    semesterGpas: Array<number | null> | null;
    rows: SubjectRow[];
  };
  status: 'none' | 'draft' | 'confirmed';
}

const muetLabel = (band: number) => (band === 5.5 ? '5+' : band.toFixed(1));

const CUSTOM = 'custom:';

/**
 * Results after SPM (Figma: Kelayakan Diploma / Matrikulasi / …), showing only what applies:
 * CGPA where the qualification has one, MUET, year; field (from the list, or typed) and programme for
 * diplomas, certificates and foundation; the stream and semester GPAs for matriculation (and semesters for
 * foundation); the level for SKM and DKM; subject grades for STPM, A-Level, matriculation and foundation.
 */
export function HigherResultsForm({ locale, qualification, t, academic, subjects, grades, fields, years, initial, status }: HigherResultsFormProps) {
  const [edited, setEdited] = useState(false);
  const [state, onSubmit, pending] = useFormAction(saveHigherResults, {}, () => setEdited(false));
  const [year, setYear] = useState(initial.examYear ? String(initial.examYear) : '');
  const [cgpa, setCgpa] = useState(initial.cgpa !== null ? initial.cgpa.toFixed(2) : '');
  const [muet, setMuet] = useState(initial.muetBand !== null ? String(initial.muetBand) : '');
  // The field is an id from the list, or `custom:<name>` for a field the student typed.
  const [field, setField] = useState(initial.fieldId ?? (initial.customFieldName ? `${CUSTOM}${initial.customFieldName}` : ''));
  const customField = field.startsWith(CUSTOM) ? field.slice(CUSTOM.length) : null;
  const fieldOptions = customField ? [...fields, { value: field, label: customField }] : fields;
  // Two semesters to start with (most programmes); students add more for 2-year or 3-semester programmes.
  const [semesters, setSemesters] = useState<string[]>(() => {
    const saved = (initial.semesterGpas ?? []).map((g) => (g === null ? '' : g.toFixed(2)));
    return saved.length ? saved : ['', ''];
  });
  const [programme, setProgramme] = useState(initial.programmeName ?? '');
  const [qualificationLevel, setQualificationLevel] = useState(initial.qualificationLevel !== null ? String(initial.qualificationLevel) : '');
  const levels = qualificationLevelsFor(qualification);
  const [stream, setStream] = useState(initial.stream ?? '');
  const [rows, setRows] = useState(initial.rows);
  const change =
    <T,>(set: (value: T) => void) =>
    (value: T) => {
      set(value);
      setEdited(true);
    };

  const withSubjects = hasSubjectGrades(qualification);
  // An old error is not shown again while the next save is on its way.
  const error = state.error && !edited && !pending ? state.error : undefined;
  const own = ['cgpaRequired', 'cgpaInvalid', 'levelRequired', 'streamRequired', 'semesterInvalid'] as const;
  const errorText = error ? ((own as readonly string[]).includes(error) ? t.errors[error as (typeof own)[number]] : academic.errors[error as keyof typeof academic.errors]) : undefined;

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      <p className={`self-start rounded-full px-3 py-1 text-xs font-semibold transition-colors duration-300 ${edited ? 'bg-cream' : status === 'confirmed' ? 'bg-mint' : 'bg-bg'}`}>
        {edited ? academic.status.unsaved : academic.status[status]}
      </p>
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="qualification" value={qualification} />
      <input type="hidden" name="examYear" value={year} />
      <input type="hidden" name="muetBand" value={muet} />
      <input type="hidden" name="fieldId" value={customField ? '' : field} />
      <input type="hidden" name="customFieldName" value={customField ?? ''} />
      <input type="hidden" name="semesterGpas" value={JSON.stringify(semesters)} />
      <input type="hidden" name="qualificationLevel" value={qualificationLevel} />
      <input type="hidden" name="stream" value={stream} />
      <input type="hidden" name="subjects" value={JSON.stringify(rows)} />

      <FormAlert>{errorText}</FormAlert>

      {qualification === 'matriculation' && (
        <div className="flex flex-col gap-1.5 sm:max-w-[420px]">
          <Dropdown
            label={t.stream}
            value={stream}
            onChange={(value) => {
              setStream(value);
              // The stream decides the subjects: fill them in, keeping grades already entered.
              setRows((current) => rowsForStream(value as MatriculationStream, subjects, current));
              setEdited(true);
            }}
            options={MatriculationStreams.map((s) => ({ value: s, label: t.streams[s] }))}
            placeholder={t.streamPlaceholder}
            noMatchesLabel={academic.noMatches}
            searchable={false}
            invalid={error === 'streamRequired'}
          />
          <p className="text-xs text-muted">{t.streamHint}</p>
        </div>
      )}

      {hasProgramme(qualification) && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Dropdown
            label={t.field}
            value={field}
            onChange={change(setField)}
            options={fieldOptions}
            placeholder={t.fieldPlaceholder}
            noMatchesLabel={academic.noMatches}
            createLabel={(name) => format(t.addField, { name })}
            onCreate={(name) => change(setField)(`${CUSTOM}${name.trim().replace(/\s+/g, ' ').slice(0, 80)}`)}
          />
          <TextField name="programmeName" label={t.programme} placeholder={t.programmePlaceholder} value={programme} onChange={(e) => change(setProgramme)(e.target.value)} maxLength={120} />
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        {levels && (
          <Dropdown
            label={t.qualificationLevel}
            value={qualificationLevel}
            onChange={change(setQualificationLevel)}
            options={levels.map((l) => ({ value: String(l), label: t.levelNames[String(l) as keyof typeof t.levelNames] }))}
            placeholder={t.levelPlaceholder}
            noMatchesLabel={academic.noMatches}
            searchable={false}
            invalid={error === 'levelRequired'}
          />
        )}
        {hasCgpa(qualification) && (
          <TextField
            name="cgpa"
            label={t.cgpa}
            inputMode="decimal"
            placeholder={t.cgpaPlaceholder}
            hint={t.cgpaHint}
            value={cgpa}
            onChange={(e) => change(setCgpa)(e.target.value)}
            error={error === 'cgpaRequired' || error === 'cgpaInvalid' ? t.errors[error] : undefined}
          />
        )}
        <Dropdown
          label={t.muet}
          value={muet}
          onChange={change(setMuet)}
          options={[{ value: '', label: t.muetNone }, ...MuetBands.map((b) => ({ value: String(b), label: `Band ${muetLabel(b)}` }))]}
          placeholder={t.muetNone}
          noMatchesLabel={academic.noMatches}
          searchable={false}
        />
        <Dropdown
          label={t.year}
          value={year}
          onChange={change(setYear)}
          options={years.map((y) => ({ value: String(y), label: String(y) }))}
          placeholder={academic.noYear}
          noMatchesLabel={academic.noMatches}
          searchable={false}
          invalid={error === 'yearRequired'}
        />
      </div>

      {hasSemesters(qualification) && (
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <h2 className="text-lg font-semibold">{t.semesters.title}</h2>
            <p className="text-[13px] text-muted">{t.semesters.hint[qualification as 'matriculation' | 'foundation']}</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {semesters.map((value, i) => (
              <div key={i} className="flex items-end gap-2">
                <div className="flex-1">
                  <TextField
                    name={`semester-${i + 1}`}
                    label={format(t.semesters.label, { n: i + 1 })}
                    inputMode="decimal"
                    placeholder={t.cgpaPlaceholder}
                    value={value}
                    onChange={(e) => change(setSemesters)(semesters.map((v, j) => (j === i ? e.target.value : v)))}
                  />
                </div>
                {i === semesters.length - 1 && semesters.length > 1 && (
                  <button
                    type="button"
                    onClick={() => change(setSemesters)(semesters.slice(0, -1))}
                    aria-label={format(t.semesters.remove, { n: i + 1 })}
                    className="mb-1.5 rounded-md px-2 py-1 text-lg leading-none text-muted hover:bg-bg hover:text-navy"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>
          {semesters.length < MAX_SEMESTERS && (
            <button type="button" onClick={() => change(setSemesters)([...semesters, ''])} className="self-start rounded-[10px] border-2 border-dashed border-[#9aa3b2] px-4 py-2 text-sm font-semibold hover:bg-bg">
              {t.semesters.add}
            </button>
          )}
          <p className="text-xs text-muted">{t.semesters.cgpaNote}</p>
        </div>
      )}

      {withSubjects && (
        <>
          <div className="flex flex-col gap-1">
            <h2 className="text-lg font-semibold">{t.subjectsTitle[qualification]}</h2>
            <p className="text-[13px] text-muted">{t.subjectsHint[qualification]}</p>
          </div>
          <SubjectRowsEditor
            locale={locale}
            t={academic}
            subjects={subjects}
            grades={grades}
            rows={rows}
            onChange={(update) => {
              setRows(update);
              setEdited(true);
            }}
            gradeColumn={academic.colGrade[qualification]}
            showMissing={error === 'missingGrade'}
          />
        </>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="sm:w-[240px]">
          <SubmitButton icon="/icons/check-white.svg" pending={pending}>
            {academic.submit}
          </SubmitButton>
        </div>
        <Notice showKey={state.savedAt}>{academic.saved}</Notice>
      </div>
    </form>
  );
}
