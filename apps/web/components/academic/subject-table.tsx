'use client';

import { useActionState, useState } from 'react';
import { saveAcademicRecord } from '@/lib/profile/actions';
import type { RecordVariant, SubjectOption, SubjectRow } from '@/lib/profile/records';
import { format, type Dictionary, type Locale } from '@/lib/i18n/locale';
import { FormAlert, SubmitButton } from '@/components/auth/fields';
import { Dropdown } from '@/components/ui/dropdown';
import { SubjectRowsEditor } from './subject-rows-editor';

interface SubjectTableProps {
  locale: Locale;
  variant: RecordVariant;
  t: Dictionary['academic'];
  /** Subjects on this grade scale, already named in the reader's language. */
  subjects: SubjectOption[];
  grades: readonly string[];
  /** Years to pick from. School results get one fixed year instead (chosen with the tabs above the form). */
  years: number[];
  fixedYear?: number;
  initialYear: number | null;
  initialRows: SubjectRow[];
  /** The saved record's status, shown until the student edits again. */
  status: 'none' | 'draft' | 'confirmed';
}

/**
 * The results table from the Figma "Profil akademik" screens: one row per subject with a grade,
 * × to remove, and "Add subject" that searches the official list or keeps a subject typed by the student.
 * Everything is saved together.
 */
export function SubjectTable({ locale, variant, t, subjects, grades, years, fixedYear, initialYear, initialRows, status }: SubjectTableProps) {
  const [state, action, pending] = useActionState(saveAcademicRecord, {});
  const [rows, setRowsState] = useState(initialRows);
  const [year, setYearState] = useState(initialYear ? String(initialYear) : '');
  // Any edit after loading or saving means what is on screen is not what is saved.
  const [edited, setEdited] = useState(false);
  const setRows = (update: (all: SubjectRow[]) => SubjectRow[]) => {
    setRowsState(update);
    setEdited(true);
  };
  const setYear = (value: string) => {
    setYearState(value);
    setEdited(true);
  };

  const isTarget = variant === 'target';
  // An old error is not shown again while the next save is on its way.
  const error = state.error && !edited && !pending ? state.error : undefined;
  const showErrors = error === 'missingGrade';

  return (
    <form action={action} onSubmit={() => setEdited(false)} className="flex flex-col gap-5">
      <p role="status" className={`self-start rounded-full px-3 py-1 text-xs font-semibold ${edited ? 'bg-cream' : status === 'confirmed' ? 'bg-mint' : 'bg-bg'}`}>
        {edited ? t.status.unsaved : t.status[status]}
      </p>
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="variant" value={variant} />
      <input type="hidden" name="subjects" value={JSON.stringify(rows)} />
      <input type="hidden" name="examYear" value={fixedYear ?? year} />

      {fixedYear === undefined && (
        <Dropdown
          className="max-w-[260px]"
          label={t.examYear.spm}
          value={year}
          onChange={setYear}
          options={years.map((y) => ({ value: String(y), label: String(y) }))}
          placeholder={t.noYear}
          noMatchesLabel={t.noMatches}
          searchable={false}
          invalid={error === 'yearRequired'}
        />
      )}

      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold">{t.subjectsTitle}</h2>
        <p className="text-[13px] text-muted">
          {t.subjectsHint} {format(t.scale, { scale: grades.join(', ') })}
        </p>
      </div>

      <FormAlert>{error && t.errors[error]}</FormAlert>

      <SubjectRowsEditor
        locale={locale}
        t={t}
        subjects={subjects}
        grades={grades}
        rows={rows}
        onChange={setRows}
        gradeColumn={t.colGrade[variant]}
        highlight={isTarget}
        showMissing={showErrors}
      />

      {(variant === 'target' || variant === 'school') && <p className={`rounded-[10px] px-4 py-3 text-[13px] ${isTarget ? 'bg-cream' : 'bg-blue'}`}>{t.notes[variant]}</p>}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="sm:w-[240px]">
          <SubmitButton icon="/icons/check-white.svg">{t.submit}</SubmitButton>
        </div>
        {state.saved && !edited && !pending && (
          <p role="status" className="text-sm font-medium text-[#2e7d57]">
            ✓ {t.saved}
          </p>
        )}
      </div>
    </form>
  );
}
