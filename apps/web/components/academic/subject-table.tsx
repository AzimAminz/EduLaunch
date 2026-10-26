'use client';

import { useActionState, useMemo, useState } from 'react';
import { saveAcademicRecord } from '@/lib/profile/actions';
import { sortRows, type RecordVariant, type SubjectOption, type SubjectRow } from '@/lib/profile/records';
import { format, type Dictionary, type Locale } from '@/lib/i18n/locale';
import { FormAlert, SubmitButton } from '@/components/auth/fields';

interface SubjectTableProps {
  locale: Locale;
  variant: RecordVariant;
  t: Dictionary['academic'];
  /** Subjects on this grade scale, already named in the reader's language. */
  subjects: SubjectOption[];
  grades: readonly string[];
  years: number[];
  initialYear: number | null;
  initialRows: SubjectRow[];
}

const SELECT = 'rounded-[9px] border border-line bg-white px-3 py-2 text-sm font-semibold text-navy outline-none focus:border-navy focus:ring-2 focus:ring-navy/15';

/**
 * The results table from the Figma "Profil akademik" screens: one row per subject with a grade,
 * × to remove, "+ Add subject" from the official list. Everything is saved together.
 */
export function SubjectTable({ locale, variant, t, subjects, grades, years, initialYear, initialRows }: SubjectTableProps) {
  const [state, action] = useActionState(saveAcademicRecord, {});
  const [rows, setRows] = useState(initialRows);
  const [year, setYear] = useState(initialYear ? String(initialYear) : '');
  const byId = useMemo(() => new Map(subjects.map((s) => [s.id, s])), [subjects]);
  const available = subjects.filter((s) => !rows.some((r) => r.subjectId === s.id));
  const missing = rows.filter((r) => !r.grade).length;
  const isTarget = variant === 'target';

  const setGrade = (subjectId: string, grade: string) => setRows((all) => all.map((r) => (r.subjectId === subjectId ? { ...r, grade } : r)));
  const remove = (subjectId: string) => setRows((all) => all.filter((r) => r.subjectId !== subjectId));
  const add = (subjectId: string) => subjectId && setRows((all) => sortRows([...all, { subjectId, grade: '' }], subjects, locale));
  const categoryOf = (s: SubjectOption | undefined) => t.categories[(s?.category ?? 'other') as keyof typeof t.categories] ?? t.categories.other;

  return (
    <form action={action} className="flex flex-col gap-5">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="variant" value={variant} />
      <input type="hidden" name="subjects" value={JSON.stringify(rows)} />

      <label className="flex max-w-[260px] flex-col gap-2 text-sm font-semibold">
        {variant === 'school' ? t.examYear.school : t.examYear.spm}
        <select name="examYear" value={year} onChange={(e) => setYear(e.target.value)} className={`${SELECT} py-3 text-[15px]`}>
          <option value="">{t.noYear}</option>
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </label>

      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold">{t.subjectsTitle}</h2>
        <p className="text-[13px] text-muted">
          {t.subjectsHint} {format(t.scale, { scale: grades.join(', ') })}
        </p>
      </div>

      <FormAlert>{state.error && t.errors[state.error]}</FormAlert>

      <div className="overflow-hidden rounded-[12px] border border-line">
        <table className="w-full text-left text-sm">
          <thead className="bg-bg text-xs uppercase text-muted">
            <tr>
              <th scope="col" className="px-3 py-2.5 font-medium sm:px-4">
                {t.colSubject}
              </th>
              <th scope="col" className="hidden px-3 py-2.5 font-medium sm:table-cell">
                {t.colCategory}
              </th>
              <th scope="col" className="px-3 py-2.5 font-medium">
                {t.colGrade[variant]}
              </th>
              <td className="w-10" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const subject = byId.get(row.subjectId);
              const name = subject?.name ?? row.subjectId;
              return (
                <tr key={row.subjectId} className="border-t border-line">
                  <th scope="row" className="px-3 py-2.5 font-semibold sm:px-4">
                    {name}
                  </th>
                  <td className="hidden px-3 py-2.5 sm:table-cell">
                    <span className="rounded-full bg-bg px-2.5 py-1 text-xs text-muted">{categoryOf(subject)}</span>
                  </td>
                  <td className="px-3 py-2">
                    <select
                      aria-label={format(t.gradeFor, { subject: name })}
                      value={row.grade}
                      onChange={(e) => setGrade(row.subjectId, e.target.value)}
                      aria-invalid={state.error === 'missingGrade' && !row.grade ? true : undefined}
                      className={`${SELECT} w-[92px] ${isTarget ? 'border-yellow bg-yellow' : ''} ${state.error === 'missingGrade' && !row.grade ? 'border-red' : ''}`}
                    >
                      <option value="">{t.chooseGrade}</option>
                      {grades.map((g) => (
                        <option key={g} value={g}>
                          {g}
                        </option>
                      ))}
                    </select>
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

      {available.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <select
            aria-label={t.addSubject}
            value=""
            onChange={(e) => add(e.target.value)}
            className="w-full cursor-pointer rounded-[12px] border-2 border-dashed border-[#9aa3b2] bg-white px-4 py-3 text-center text-[15px] font-semibold text-navy hover:bg-bg"
          >
            <option value="">{t.addSubject}</option>
            {available.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <p className="text-xs text-muted">{t.addHint}</p>
        </div>
      )}

      <p className={`rounded-[10px] px-4 py-3 text-sm ${missing === 0 && rows.length > 0 ? 'bg-mint' : 'bg-bg'}`}>
        {format(t.check, { count: rows.length })} · {missing === 0 ? t.checkAllGraded : format(t.checkMissing, { count: missing })}
      </p>

      <p className={`rounded-[10px] px-4 py-3 text-[13px] ${isTarget ? 'bg-cream' : 'bg-blue'}`}>{t.notes[variant]}</p>

      {state.saved && (
        <p role="status" className="rounded-[10px] bg-mint px-4 py-3 text-sm font-medium">
          {t.saved}
        </p>
      )}

      <div className="sm:max-w-[280px]">
        <SubmitButton icon="/icons/check-white.svg">{t.submit}</SubmitButton>
      </div>
    </form>
  );
}
