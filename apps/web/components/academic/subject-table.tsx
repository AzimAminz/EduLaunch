'use client';

import { useActionState, useMemo, useState } from 'react';
import { saveAcademicRecord } from '@/lib/profile/actions';
import { cleanSubjectName, matchOfficialSubject, sortRows, type RecordVariant, type SubjectOption, type SubjectRow } from '@/lib/profile/records';
import { format, type Dictionary, type Locale } from '@/lib/i18n/locale';
import { FormAlert, SubmitButton } from '@/components/auth/fields';
import { Dropdown } from '@/components/ui/dropdown';

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
  const [state, action] = useActionState(saveAcademicRecord, {});
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

  const byId = useMemo(() => new Map(subjects.map((s) => [s.id, s])), [subjects]);
  const available = subjects.filter((s) => !rows.some((r) => r.subjectId === s.id));
  const missing = rows.filter((r) => !r.grade).length;
  const hasCustom = rows.some((r) => r.customName);
  const isTarget = variant === 'target';
  const showErrors = state.error === 'missingGrade' && !edited;

  const nameOf = (row: SubjectRow) => row.customName ?? byId.get(row.subjectId)?.name ?? '';
  const categoryOf = (row: SubjectRow) =>
    row.customName ? t.categories.custom : (t.categories[(byId.get(row.subjectId)?.category ?? 'other') as keyof typeof t.categories] ?? t.categories.other);

  const setGrade = (subjectId: string, grade: string) => setRows((all) => all.map((r) => (r.subjectId === subjectId ? { ...r, grade } : r)));
  const remove = (subjectId: string) => setRows((all) => all.filter((r) => r.subjectId !== subjectId));
  const add = (row: SubjectRow) => setRows((all) => sortRows([...all, row], subjects, locale));
  const addOfficial = (subjectId: string) => {
    if (subjectId && !rows.some((r) => r.subjectId === subjectId)) add({ subjectId, grade: '' });
  };
  const addTyped = (typed: string) => {
    const name = cleanSubjectName(typed);
    if (!name) return;
    // "add maths" is the official Matematik Tambahan, not a new subject.
    const official = matchOfficialSubject(name, subjects);
    if (official) return addOfficial(official.id);
    if (rows.some((r) => r.customName?.toLocaleLowerCase() === name.toLocaleLowerCase())) return;
    add({ subjectId: crypto.randomUUID(), grade: '', customName: name });
  };

  const gradeOptions = grades.map((g) => ({ value: g, label: g }));

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
          invalid={state.error === 'yearRequired' && !edited}
        />
      )}

      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold">{t.subjectsTitle}</h2>
        <p className="text-[13px] text-muted">
          {t.subjectsHint} {format(t.scale, { scale: grades.join(', ') })}
        </p>
      </div>

      <FormAlert>{state.error && !edited ? t.errors[state.error] : undefined}</FormAlert>

      <div className="rounded-[12px] border border-line">
        <table className="w-full text-left text-sm">
          <thead className="text-xs uppercase text-muted">
            <tr>
              <th scope="col" className="rounded-tl-[12px] bg-bg px-3 py-2.5 font-medium sm:px-4">
                {t.colSubject}
              </th>
              <th scope="col" className="hidden bg-bg px-3 py-2.5 font-medium sm:table-cell">
                {t.colCategory}
              </th>
              <th scope="col" className="bg-bg px-3 py-2.5 font-medium">
                {t.colGrade[variant]}
              </th>
              <td className="w-10 rounded-tr-[12px] bg-bg" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const name = nameOf(row);
              return (
                <tr key={row.subjectId} className="border-t border-line">
                  <th scope="row" className="px-3 py-2 font-semibold sm:px-4">
                    {name}
                  </th>
                  <td className="hidden px-3 py-2 sm:table-cell">
                    <span className={`whitespace-nowrap rounded-full px-2.5 py-1 text-xs ${row.customName ? 'bg-cream text-navy' : 'bg-bg text-muted'}`}>{categoryOf(row)}</span>
                  </td>
                  <td className="px-3 py-2">
                    <Dropdown
                      className="w-[96px]"
                      size="sm"
                      label={format(t.gradeFor, { subject: name })}
                      hideLabel
                      value={row.grade}
                      onChange={(grade) => setGrade(row.subjectId, grade)}
                      options={gradeOptions}
                      placeholder={t.chooseGrade}
                      noMatchesLabel={t.noMatches}
                      searchable={false}
                      highlight={isTarget}
                      invalid={showErrors && !row.grade}
                    />
                  </td>
                  <td className="pr-2 text-right">
                    <button type="button" onClick={() => remove(row.subjectId)} aria-label={format(t.remove, { subject: name })} className="rounded-md px-2 py-1 text-lg leading-none text-muted hover:bg-bg hover:text-navy">
                      ×
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col gap-1.5">
        <Dropdown
          label={t.addSubject}
          hideLabel
          value=""
          onChange={addOfficial}
          options={available.map((s) => ({ value: s.id, label: s.name, keywords: s.keywords }))}
          placeholder={t.addPlaceholder}
          noMatchesLabel={t.noMatches}
          createLabel={(name) => format(t.addCreate, { name })}
          onCreate={addTyped}
          resetAfterChoice
        />
        <p className="text-xs text-muted">{t.addHint}</p>
      </div>

      {/* Only what the student needs to act on: missing grades, and what targets or school grades mean. */}
      {missing > 0 && rows.length > 0 && <p className="text-[13px] text-muted">{format(t.check, { count: rows.length })} · {format(t.checkMissing, { count: missing })}</p>}
      {hasCustom && <p className="text-[13px] text-muted">{t.customHint}</p>}
      {(variant === 'target' || variant === 'school') && <p className={`rounded-[10px] px-4 py-3 text-[13px] ${isTarget ? 'bg-cream' : 'bg-blue'}`}>{t.notes[variant]}</p>}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="sm:w-[240px]">
          <SubmitButton icon="/icons/check-white.svg">{t.submit}</SubmitButton>
        </div>
        {state.saved && !edited && (
          <p role="status" className="text-sm font-medium text-[#2e7d57]">
            ✓ {t.saved}
          </p>
        )}
      </div>
    </form>
  );
}
