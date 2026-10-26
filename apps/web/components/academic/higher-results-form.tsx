'use client';

import { useState } from 'react';
import { MuetBands, hasCgpa, hasSubjectGrades } from '@edulaunch/contracts';
import { saveHigherResults } from '@/lib/profile/actions';
import type { HigherQualification, SubjectOption, SubjectRow } from '@/lib/profile/records';
import type { Dictionary, Locale } from '@/lib/i18n/locale';
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
  initial: { examYear: number | null; cgpa: number | null; muetBand: number | null; fieldId: string | null; programmeName: string | null; rows: SubjectRow[] };
  status: 'none' | 'draft' | 'confirmed';
}

const muetLabel = (band: number) => (band === 5.5 ? '5+' : band.toFixed(1));

/**
 * Pre-university or diploma results (Figma: Kelayakan pra-universiti / Kelayakan Diploma).
 * What degree programmes check: CGPA, MUET, year, the diploma field, and subject grades only for STPM and A-Level.
 */
export function HigherResultsForm({ locale, qualification, t, academic, subjects, grades, fields, years, initial, status }: HigherResultsFormProps) {
  const [edited, setEdited] = useState(false);
  const [state, onSubmit, pending] = useFormAction(saveHigherResults, {}, () => setEdited(false));
  const [year, setYear] = useState(initial.examYear ? String(initial.examYear) : '');
  const [cgpa, setCgpa] = useState(initial.cgpa !== null ? initial.cgpa.toFixed(2) : '');
  const [muet, setMuet] = useState(initial.muetBand !== null ? String(initial.muetBand) : '');
  const [fieldId, setFieldId] = useState(initial.fieldId ?? '');
  const [programme, setProgramme] = useState(initial.programmeName ?? '');
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
  const errorText = error ? (error === 'cgpaRequired' || error === 'cgpaInvalid' ? t.errors[error] : academic.errors[error]) : undefined;

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      <p className={`self-start rounded-full px-3 py-1 text-xs font-semibold transition-colors duration-300 ${edited ? 'bg-cream' : status === 'confirmed' ? 'bg-mint' : 'bg-bg'}`}>
        {edited ? academic.status.unsaved : academic.status[status]}
      </p>
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="qualification" value={qualification} />
      <input type="hidden" name="examYear" value={year} />
      <input type="hidden" name="muetBand" value={muet} />
      <input type="hidden" name="fieldId" value={fieldId} />
      <input type="hidden" name="subjects" value={JSON.stringify(rows)} />

      <FormAlert>{errorText}</FormAlert>

      {qualification === 'diploma' && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Dropdown label={t.field} value={fieldId} onChange={change(setFieldId)} options={fields} placeholder={t.fieldPlaceholder} noMatchesLabel={academic.noMatches} />
          <TextField name="programmeName" label={t.programme} placeholder={t.programmePlaceholder} value={programme} onChange={(e) => change(setProgramme)(e.target.value)} maxLength={120} />
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
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
