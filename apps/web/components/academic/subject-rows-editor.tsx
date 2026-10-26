'use client';

import { useMemo } from 'react';
import { cleanSubjectName, matchOfficialSubject, sortRows, type SubjectOption, type SubjectRow } from '@/lib/profile/records';
import { format, type Dictionary, type Locale } from '@/lib/i18n/locale';
import { Dropdown } from '@/components/ui/dropdown';

interface SubjectRowsEditorProps {
  locale: Locale;
  t: Dictionary['academic'];
  subjects: SubjectOption[];
  grades: readonly string[];
  rows: SubjectRow[];
  onChange: (update: (rows: SubjectRow[]) => SubjectRow[]) => void;
  gradeColumn: string;
  /** Yellow grade fields, for SPM targets. */
  highlight?: boolean;
  /** Mark rows without a grade (after a failed save). */
  showMissing?: boolean;
}

/**
 * The subject table shared by every results form: one row per subject with a grade (system dropdown),
 * × to remove, and "Add subject" that searches the official list or keeps a subject the student typed.
 */
export function SubjectRowsEditor({ locale, t, subjects, grades, rows, onChange, gradeColumn, highlight, showMissing }: SubjectRowsEditorProps) {
  const byId = useMemo(() => new Map(subjects.map((s) => [s.id, s])), [subjects]);
  const available = subjects.filter((s) => !rows.some((r) => r.subjectId === s.id));
  const missing = rows.filter((r) => !r.grade).length;
  const gradeOptions = grades.map((g) => ({ value: g, label: g }));

  const nameOf = (row: SubjectRow) => row.customName ?? byId.get(row.subjectId)?.name ?? '';
  const categoryOf = (row: SubjectRow) =>
    row.customName ? t.categories.custom : (t.categories[(byId.get(row.subjectId)?.category ?? 'other') as keyof typeof t.categories] ?? t.categories.other);

  const setGrade = (subjectId: string, grade: string) => onChange((all) => all.map((r) => (r.subjectId === subjectId ? { ...r, grade } : r)));
  const remove = (subjectId: string) => onChange((all) => all.filter((r) => r.subjectId !== subjectId));
  const add = (row: SubjectRow) => onChange((all) => sortRows([...all, row], subjects, locale));
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

  return (
    <>
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
                {gradeColumn}
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
                      highlight={highlight}
                      invalid={showMissing && !row.grade}
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

      {/* Only what the student needs to act on. */}
      {missing > 0 && <p className="text-[13px] text-muted">{format(t.check, { count: rows.length })} · {format(t.checkMissing, { count: missing })}</p>}
      {rows.some((r) => r.customName) && <p className="text-[13px] text-muted">{t.customHint}</p>}
    </>
  );
}
