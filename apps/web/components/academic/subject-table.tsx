'use client';

import { useState } from 'react';
import { saveAcademicRecord } from '@/lib/profile/actions';
import { rowsForSpmStream, SpmStreams, type RecordVariant, type SpmStream, type SubjectOption, type SubjectRow } from '@/lib/profile/records';
import { format, type Dictionary, type Locale } from '@/lib/i18n/locale';
import { FormAlert, SubmitButton } from '@/components/auth/fields';
import { Dropdown } from '@/components/ui/dropdown';
import { Notice } from '@/components/ui/notice';
import { useFormAction } from '@/components/ui/use-form-action';
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
  /** The form the results are for when it is set by the page (the form tabs). */
  fixedForm?: number;
  /** Editing an older record: the record saved onto, with its form chosen here among these. */
  recordId?: string;
  formChoices?: number[];
  initialForm?: number | null;
}

/**
 * The results table from the Figma "Profil akademik" screens: one row per subject with a grade,
 * × to remove, and "Add subject" that searches the official list or keeps a subject typed by the student.
 * Everything is saved together.
 */
export function SubjectTable({ locale, variant, t, subjects, grades, years, fixedYear, initialYear, initialRows, status, fixedForm, recordId, formChoices, initialForm }: SubjectTableProps) {
  const [rows, setRowsState] = useState(initialRows);
  const [year, setYearState] = useState(initialYear ? String(initialYear) : '');
  // Any edit after loading or saving means what is on screen is not what is saved.
  const [edited, setEdited] = useState(false);
  const [state, onSubmit, pending] = useFormAction(saveAcademicRecord, {}, () => setEdited(false));
  const setRows = (update: (all: SubjectRow[]) => SubjectRow[]) => {
    setRowsState(update);
    setEdited(true);
  };
  const setYear = (value: string) => {
    setYearState(value);
    setEdited(true);
  };
  const [formLevel, setFormState] = useState(initialForm ? String(initialForm) : '');
  const setForm = (value: string) => {
    setFormState(value);
    setEdited(true);
  };

  const isTarget = variant === 'target';
  const [stream, setStream] = useState<SpmStream | null>(null);
  // An old error is not shown again while the next save is on its way.
  const error = state.error && !edited && !pending ? state.error : undefined;
  const showErrors = error === 'missingGrade';

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      <p className={`self-start rounded-full px-3 py-1 text-xs font-semibold transition-colors duration-300 ${edited ? 'bg-cream' : status === 'confirmed' ? 'bg-mint' : 'bg-bg'}`}>
        {edited ? t.status.unsaved : t.status[status]}
      </p>
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="variant" value={variant} />
      <input type="hidden" name="subjects" value={JSON.stringify(rows)} />
      <input type="hidden" name="examYear" value={fixedYear ?? year} />
      {recordId && <input type="hidden" name="recordId" value={recordId} />}
      {(fixedForm !== undefined || formChoices) && <input type="hidden" name="formLevel" value={fixedForm ?? formLevel} />}

      {(fixedYear === undefined || formChoices) && (
        <div className="grid gap-4 sm:grid-cols-2 sm:max-w-[540px]">
          {formChoices && (
            <Dropdown
              label={t.formLabel}
              value={formLevel}
              onChange={setForm}
              options={formChoices.map((f) => ({ value: String(f), label: format(t.formOption, { form: f }) }))}
              placeholder={t.formPlaceholder}
              noMatchesLabel={t.noMatches}
              searchable={false}
              invalid={error === 'formRequired'}
            />
          )}
          {fixedYear === undefined && (
            <Dropdown
              label={variant === 'school' || variant === 'target' ? t.yearLabel : t.examYear.spm}
              value={year}
              onChange={setYear}
              options={years.map((y) => ({ value: String(y), label: String(y) }))}
              placeholder={t.noYear}
              noMatchesLabel={t.noMatches}
              searchable={false}
              invalid={error === 'yearRequired' || error === 'yearTaken'}
            />
          )}
        </div>
      )}

      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold">{t.subjectsTitle}</h2>
        <p className="text-[13px] text-muted">
          {t.subjectsHint} {format(t.scale, { scale: grades.join(', ') })}
        </p>
      </div>

      <FormAlert>{error && t.errors[error]}</FormAlert>

      {variant !== 'school' && (
        // One tap fills the usual electives of a stream; the student then removes or adds what differs.
        <fieldset className="flex flex-col gap-2 rounded-[14px] bg-bg p-4">
          <legend className="float-left mb-1 text-sm font-semibold">{t.streamPresets.title}</legend>
          <div className="clear-left flex flex-wrap gap-2">
            {SpmStreams.map((s) => (
              <button
                key={s}
                type="button"
                aria-pressed={stream === s}
                onClick={() => {
                  setStream(s);
                  setRows((all) => rowsForSpmStream(s, subjects, all, locale));
                }}
                className={`min-h-11 rounded-full px-4 text-sm font-semibold transition-colors ${stream === s ? 'bg-navy text-white' : 'border border-line bg-white hover:bg-blue'}`}
              >
                {t.streamPresets.names[s]}
              </button>
            ))}
          </div>
          <p className="text-[13px] text-muted">{stream ? t.streamPresets.notes[stream] : t.streamPresets.hint}</p>
        </fieldset>
      )}

      <SubjectRowsEditor
        locale={locale}
        t={t}
        subjects={subjects}
        grades={grades}
        rows={rows}
        onChange={setRows}
        gradeColumn={t.colGrade[variant]}
        showMissing={showErrors}
      />

      {(variant === 'target' || variant === 'school') && <p className={`rounded-[10px] px-4 py-3 text-[13px] ${isTarget ? 'bg-cream' : 'bg-blue'}`}>{t.notes[variant]}</p>}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="sm:w-[240px]">
          <SubmitButton icon="/icons/check-white.svg" pending={pending}>
            {t.submit}
          </SubmitButton>
        </div>
        <Notice showKey={state.savedAt}>{t.saved}</Notice>
      </div>
    </form>
  );
}
