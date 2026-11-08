'use client';

import Image from 'next/image';
import { useMemo, useState } from 'react';
import { GradeScales, MeritSources, SpmStreams, cgpaMerit, diplomaMerit, isSpmUniversal, spmMerit, suggestSpmStream, type SpmStream } from '@edulaunch/contracts';
import { format, type Dictionary } from '@/lib/i18n/locale';

type T = Dictionary['meritLab'];

export interface LabSubject {
  /** The official (Malay) name, used to find the subject's type. */
  name: string;
  /** The name in the page language. */
  label: string;
}

interface Row extends LabSubject {
  grade: string;
  /** The grade as saved in the profile, to tell a simulation from the record. */
  saved: string | null;
}

const STREAMS = Object.keys(SpmStreams) as SpmStream[];
const UNIVERSAL: LabSubject[] = [
  { name: 'Bahasa Melayu', label: 'Bahasa Melayu' },
  { name: 'Bahasa Inggeris', label: 'Bahasa Inggeris' },
  { name: 'Matematik', label: 'Matematik' },
  { name: 'Sejarah', label: 'Sejarah' },
];

const field = 'h-10 rounded-[10px] border border-[#9aa3b2] bg-white px-3 text-[15px] text-navy outline-none transition-colors focus:border-navy focus:ring-2 focus:ring-navy/15';

/**
 * Merit Lab: the student's merit worked out live from their results, with the official formula. Grades, the stream
 * and co-curricular marks can be changed to try "what if"; nothing here is saved to the profile.
 */
export function MeritLab({
  mode,
  basis,
  subjects,
  catalogue,
  cgpa,
  cocurricular,
  cookieName,
  t,
}: {
  mode: 'spm' | 'cgpa' | 'diploma';
  /** What the starting values come from. */
  basis: 'actual' | 'target' | 'none';
  /** The saved SPM grades (SPM mode). */
  subjects: Array<LabSubject & { grade: string }>;
  /** Every SPM subject, for "add a subject". */
  catalogue: LabSubject[];
  cgpa: number | null;
  /** The co-curricular mark to start from (the one set here last time, or full marks). */
  cocurricular: number;
  /** Where the co-curricular mark is remembered, so programme pages use the same one. */
  cookieName: string;
  t: T;
}) {
  const start = (): Row[] => {
    const rows = subjects.map((s) => ({ ...s, saved: s.grade }));
    // The four universal subjects are always listed, so a missing one is plain to see.
    const missing = UNIVERSAL.filter((u) => !rows.some((r) => r.name.toLowerCase() === u.name.toLowerCase())).map((u) => ({
      ...u,
      label: catalogue.find((c) => c.name === u.name)?.label ?? u.label,
      grade: '',
      saved: null,
    }));
    // Universal subjects first, in their usual order (BM, BI, Mathematics, History), then the rest as saved.
    const order = (r: Row) => {
      const u = UNIVERSAL.findIndex((x) => x.name.toLowerCase() === r.name.toLowerCase());
      return u === -1 ? UNIVERSAL.length : u;
    };
    return [...missing, ...rows].sort((a, b) => order(a) - order(b));
  };
  const [rows, setRows] = useState<Row[]>(start);
  // Start with the stream that gives the best merit for these subjects (ties go to the stream the subjects suggest);
  // the student can pick their own.
  const [stream, setStream] = useState<SpmStream>(() => {
    const results = subjects.map((s) => ({ subject: s.name, grade: s.grade }));
    const suggested = suggestSpmStream(results);
    return STREAMS.reduce((bestSoFar, s) => (spmMerit(results, s, 0).merit > spmMerit(results, bestSoFar, 0).merit ? s : bestSoFar), suggested);
  });
  const [koko, setKokoState] = useState(cocurricular.toFixed(2));
  const setKoko = (value: string) => {
    setKokoState(value);
    const n = Number.parseFloat(value);
    // Remembered in this browser for a year; programme pages compare with the same mark.
    if (Number.isFinite(n)) document.cookie = `${cookieName}=${Math.min(Math.max(n, 0), 10).toFixed(2)}; path=/; max-age=31536000; samesite=lax`;
  };
  const [pngk, setPngk] = useState(cgpa === null ? '' : cgpa.toFixed(2));
  const [adding, setAdding] = useState('');

  const kokoValue = Math.min(Math.max(Number.parseFloat(koko) || 0, 0), 10);
  const pngkValue = Math.min(Math.max(Number.parseFloat(pngk) || 0, 0), 4);
  const spm = useMemo(() => spmMerit(rows.filter((r) => r.grade).map((r) => ({ subject: r.name, grade: r.grade })), stream, kokoValue), [rows, stream, kokoValue]);
  const merit = mode === 'spm' ? spm.merit : mode === 'cgpa' ? cgpaMerit(pngkValue, kokoValue).merit : diplomaMerit(pngkValue);
  const changed = mode === 'spm' ? rows.some((r) => r.grade !== (r.saved ?? '')) : cgpa !== null && pngkValue !== cgpa;
  const label = changed || basis === 'none' ? t.basis.simulation : basis === 'actual' ? t.basis.actual : t.basis.target;
  const counted = new Set([...spm.package.subjects, ...spm.additional.subjects].map((s) => s.subject));
  const free = catalogue.filter((c) => !rows.some((r) => r.name === c.name));

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <section className="flex flex-col gap-4 rounded-[18px] bg-white p-5 sm:p-6">
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-semibold">{mode === 'spm' ? t.gradesTitle : t.cgpaTitle}</h2>
          <p className="text-[13px] text-muted">{basis === 'none' ? t.noRecord : basis === 'target' ? t.fromTarget : t.fromActual}</p>
        </div>

        {mode === 'spm' ? (
          <>
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-semibold">{t.stream}</span>
              <select value={stream} onChange={(e) => setStream(e.target.value as SpmStream)} className={field}>
                {STREAMS.map((s) => (
                  <option key={s} value={s}>
                    {t.streams[s]}
                  </option>
                ))}
              </select>
              <span className="text-[12px] text-muted">{t.streamHint[stream]}</span>
            </label>

            <ul className="flex flex-col gap-2">
              {rows.map((r, i) => {
                const universal = isSpmUniversal(r.name);
                const used = universal || counted.has(r.name);
                return (
                  <li key={r.name} className={`flex items-center gap-3 rounded-[14px] px-4 py-2.5 transition-colors ${used ? 'bg-bg' : 'bg-bg/50'}`}>
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-[15px] font-semibold">{r.label}</span>
                      <span className="text-[12px] text-muted">
                        {universal ? t.part.universal : spm.package.subjects.some((s) => s.subject === r.name) ? t.part.package : counted.has(r.name) ? t.part.additional : t.part.notCounted}
                        {r.saved !== null && r.grade !== r.saved && ` · ${format(t.wasGrade, { grade: r.saved })}`}
                      </span>
                    </span>
                    <select
                      aria-label={format(t.gradeFor, { subject: r.label })}
                      value={r.grade}
                      onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, grade: e.target.value } : x)))}
                      className={`${field} w-[88px] font-semibold`}
                    >
                      <option value="">—</option>
                      {GradeScales.spm.map((g) => (
                        <option key={g} value={g}>
                          {g}
                        </option>
                      ))}
                    </select>
                    {!universal && (
                      <button
                        type="button"
                        onClick={() => setRows(rows.filter((_, j) => j !== i))}
                        aria-label={format(t.remove, { subject: r.label })}
                        className="flex size-8 shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:bg-white hover:text-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy/40"
                      >
                        ×
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>

            {free.length > 0 && (
              <div className="flex gap-2">
                <select value={adding} onChange={(e) => setAdding(e.target.value)} aria-label={t.addSubject} className={`${field} min-w-0 flex-1`}>
                  <option value="">{t.addSubject}</option>
                  {free.map((c) => (
                    <option key={c.name} value={c.name}>
                      {c.label}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  disabled={!adding}
                  onClick={() => {
                    const s = catalogue.find((c) => c.name === adding);
                    if (s) setRows([...rows, { ...s, grade: 'A', saved: null }]);
                    setAdding('');
                  }}
                  className="h-10 shrink-0 rounded-[10px] bg-navy px-4 text-sm font-semibold text-white transition-colors hover:bg-navy/90 disabled:opacity-50"
                >
                  {t.add}
                </button>
              </div>
            )}
          </>
        ) : (
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-semibold">{t.cgpa}</span>
            <input type="number" inputMode="decimal" min={0} max={4} step={0.01} value={pngk} onChange={(e) => setPngk(e.target.value)} placeholder="3.50" className={field} />
          </label>
        )}

        {mode !== 'diploma' && (
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-semibold">{t.cocurricular}</span>
            <input type="number" inputMode="decimal" min={0} max={10} step={0.01} value={koko} onChange={(e) => setKoko(e.target.value)} className={field} />
            <span className="text-[12px] text-muted">{t.cocurricularHint}</span>
          </label>
        )}
      </section>

      <section aria-live="polite" className="flex flex-col gap-4 rounded-[18px] bg-yellow p-5 sm:p-6">
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-semibold">{t.resultTitle}</h2>
          <p className="text-[13px] text-navy/70">{label}</p>
        </div>
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-[64px] font-bold leading-none tracking-[-0.02em] tabular-nums sm:text-[80px]">{merit.toFixed(2)}</p>
            <p className="mt-2 text-[15px]">{t.outOf}</p>
          </div>
          <Image src="/illustrations/rimau-calculator.png" alt="" width={132} height={132} className="size-[110px] shrink-0 object-contain sm:size-[132px]" />
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-white/60" aria-hidden>
          <div className="h-full rounded-full bg-navy transition-[width] duration-300 motion-reduce:transition-none" style={{ width: `${merit}%` }} />
        </div>

        <dl className="flex flex-col rounded-[14px] bg-white/70 px-4 py-2 text-sm">
          {(mode === 'spm'
            ? [
                [t.part.universal, `${spm.universal.mark.toFixed(2)} / 40`],
                [t.part.package, `${spm.package.mark.toFixed(2)} / 30`],
                [t.part.additional, `${spm.additional.mark.toFixed(2)} / 10`],
                [t.academic, `${spm.academic.toFixed(2)} / 90`],
                [t.cocurricular, `${spm.cocurricular.toFixed(2)} / 10`],
              ]
            : mode === 'cgpa'
              ? [
                  [t.academic, `${cgpaMerit(pngkValue, kokoValue).academic.toFixed(2)} / 90`],
                  [t.cocurricular, `${kokoValue.toFixed(2)} / 10`],
                ]
              : [[t.academic, `${merit.toFixed(2)} / 100`]]
          ).map(([k, v]) => (
            <div key={k} className="flex items-baseline justify-between gap-4 py-1.5">
              <dt className="text-navy/75">{k}</dt>
              <dd className="font-semibold tabular-nums">{v}</dd>
            </div>
          ))}
        </dl>

        {mode === 'spm' && spm.universal.missing.length > 0 && <p className="text-[13px] font-medium">{t.missingUniversal}</p>}
        {mode === 'spm' && spm.package.subjects.length < SpmStreams[stream].count && <p className="text-[13px] font-medium">{t.missingPackage}</p>}

        <p className="text-[12px] text-navy/75">
          {t.formula[mode]}{' '}
          <a href={mode === 'spm' ? MeritSources.spm : MeritSources.cgpa} target="_blank" rel="noreferrer" className="font-semibold underline underline-offset-2">
            {t.source}
          </a>
          {' · '}
          {t.checked}
        </p>
        <p className="text-[12px] text-navy/75">{t.disclaimer}</p>
      </section>
    </div>
  );
}
