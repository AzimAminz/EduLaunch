'use client';

import { useMemo, useState, useTransition } from 'react';
import { EligibilityResult } from '@/components/catalogue/eligibility-result';
import { Dropdown } from '@/components/ui/dropdown';
import type { Dictionary, Locale } from '@/lib/i18n/locale';
import { checkWithGrades } from '@/lib/eligibility/try-actions';
import type { EligibilityAnswer } from '@/lib/recommendation/api';

type T = Dictionary['tryEligibility'];

export interface TryRow {
  subjectId: string;
  name: string;
  /** Named in this programme's requirements. */
  required: boolean;
  /** The saved grade, or '' when none is saved. */
  grade: string;
}

interface Props {
  locale: Locale;
  programId: string;
  rows: TryRow[];
  /** Every subject on the scale, to add one the programme or profile does not list. */
  subjects: Array<{ id: string; name: string }>;
  grades: readonly string[];
  /** The CGPA field, for students after pre-university or a certificate (null for everyone else). */
  cgpa: { initial: number | null } | null;
  t: T;
  eligibility: Dictionary['eligibility'];
  routeNames: Record<string, string>;
  subjectNames: Record<string, string>;
  ui: { noMatches: string };
}

/**
 * "What if": the student's grades (filled in from their profile) for the subjects this programme names and the ones
 * they saved, to change and check against the programme's requirements. Nothing is saved.
 */
export function TryGrades({ locale, programId, rows: initialRows, subjects, grades, cgpa, t, eligibility, routeNames, subjectNames, ui }: Props) {
  const [rows, setRows] = useState(initialRows);
  const [cgpaText, setCgpaText] = useState(cgpa?.initial != null ? cgpa.initial.toFixed(2) : '');
  const [answer, setAnswer] = useState<EligibilityAnswer | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [changed, setChanged] = useState(false);
  const [pending, start] = useTransition();
  const names = useMemo(() => new Map(Object.entries(subjectNames)), [subjectNames]);
  const addable = subjects.filter((s) => !rows.some((r) => r.subjectId === s.id));

  const setGrade = (id: string, grade: string) => {
    setRows((all) => all.map((r) => (r.subjectId === id ? { ...r, grade } : r)));
    setChanged(true);
  };

  const check = () => {
    const cgpaValue = cgpa ? (cgpaText.trim() === '' ? null : Number(cgpaText)) : undefined;
    if (cgpaValue !== undefined && cgpaValue !== null && (!Number.isFinite(cgpaValue) || cgpaValue < 0 || cgpaValue > 4)) return setError(t.cgpaInvalid);
    setError(null);
    start(async () => {
      const result = await checkWithGrades({ programId, grades: rows.filter((r) => r.grade).map((r) => ({ subjectId: r.subjectId, grade: r.grade })), ...(cgpaValue !== undefined ? { cgpa: cgpaValue } : {}) });
      if (!result.ok) return setError(t.failed);
      setAnswer(result.answer);
      setChanged(false);
    });
  };

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-start">
      <section className="flex flex-col gap-4 rounded-[18px] bg-white p-5 sm:p-6">
        <div className="flex flex-col gap-1">
          <h2 className="text-[17px] font-semibold">{t.gradesTitle}</h2>
          <p className="text-sm text-muted">{t.gradesHint}</p>
        </div>
        <ul className="flex flex-col divide-y divide-line">
          {rows.map((r) => (
            <li key={r.subjectId} className="flex items-center justify-between gap-3 py-2.5">
              <label htmlFor={`g-${r.subjectId}`} className="flex min-w-0 flex-col">
                <span className="font-semibold leading-snug">{r.name}</span>
                {r.required && <span className="text-[12px] text-[#2f5bd3]">{t.required}</span>}
              </label>
              <select
                id={`g-${r.subjectId}`}
                value={r.grade}
                onChange={(e) => setGrade(r.subjectId, e.target.value)}
                className={`h-11 w-[124px] shrink-0 rounded-[10px] border-[1.5px] bg-white px-3 text-[15px] font-semibold ${r.grade ? 'border-[#8792a6]' : 'border-dashed border-line text-muted'}`}
              >
                <option value="">{t.none}</option>
                {grades.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </li>
          ))}
        </ul>
        {addable.length > 0 && (
          <Dropdown
            label={t.addSubject}
            value=""
            onChange={(id) => {
              const s = subjects.find((x) => x.id === id);
              if (s) setRows((all) => [...all, { subjectId: s.id, name: s.name, required: false, grade: '' }]);
            }}
            options={addable.map((s) => ({ value: s.id, label: s.name }))}
            placeholder={t.addPlaceholder}
            noMatchesLabel={ui.noMatches}
            resetAfterChoice
          />
        )}
        {cgpa && (
          <label className="flex flex-col gap-2">
            <span className="text-sm font-semibold">{t.cgpa}</span>
            <input
              inputMode="decimal"
              value={cgpaText}
              onChange={(e) => {
                setCgpaText(e.target.value);
                setChanged(true);
              }}
              placeholder="3.50"
              className="h-11 w-[140px] rounded-[10px] border-[1.5px] border-[#8792a6] px-3 text-[15px] font-semibold"
            />
          </label>
        )}
        {error && (
          <p role="alert" className="rounded-[10px] bg-[#fdecea] px-3 py-2 text-sm text-[#b33a35]">
            {error}
          </p>
        )}
        <button type="button" onClick={check} disabled={pending} className="inline-flex h-11 items-center justify-center rounded-[12px] bg-navy px-5 text-sm font-semibold text-white hover:bg-navy/90 disabled:opacity-60">
          {pending ? t.checking : t.check}
        </button>
        <p className="text-[12px] text-muted">{t.notSaved}</p>
      </section>

      <div aria-live="polite" className="flex flex-col gap-3">
        {answer ? (
          <>
            {changed && <p className="rounded-[12px] bg-cream px-4 py-2.5 text-[13px]">{t.stale}</p>}
            <div className="content-in">
              <EligibilityResult locale={locale} answer={answer} subjectNames={names} t={eligibility} routeNames={routeNames} />
            </div>
          </>
        ) : (
          <section className="flex flex-col gap-2 rounded-[18px] bg-blue p-5 sm:p-6">
            <h2 className="text-[17px] font-semibold">{t.waitingTitle}</h2>
            <p className="text-sm">{t.waitingBody}</p>
          </section>
        )}
      </div>
    </div>
  );
}
