'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { acceptFoundProgrammes, startEpanduanImport, type AdminFormState } from '@/lib/admin/actions';
import type { InstitutionProgramme, SpecialRequirement } from '@/lib/admin/api';
import { acceptable, type ImportRow, type ImportStatus } from '@/lib/admin/epanduan-import';
import { format, type Dictionary, type Locale } from '@/lib/i18n/locale';
import { FormAlert } from '@/components/auth/fields';
import { useFormAction } from '@/components/ui/use-form-action';
import { CategoryChips, FoundDetails, categoryLabel } from './epanduan-details';
import { AdminIcon } from './icons';
import { EmptyState, IconText, buttonClass } from './ui';

export interface RunSummary {
  status: 'running' | 'done' | 'failed';
  pagesRead: number;
  /** The category being read ("stpm:S"), while running. */
  currentCategory: string | null;
  /** Its place among the categories read (1-based) and how many there are. */
  categoryIndex: number;
  categoryCount: number;
  found: number;
  error: string | null;
  /** "3 minutes ago", worked out on the server. */
  when: string;
}

interface Props {
  locale: Locale;
  institutionId: string;
  code: string;
  shared: boolean;
  run: RunSummary | null;
  rows: ImportRow[];
  /** Syarat Khas read so far for found programmes (only accepted ones are read). */
  special: SpecialRequirement[];
  missing: InstitutionProgramme[];
  counts: Record<ImportStatus | 'missing', number>;
  t: Dictionary['admin'];
  levels: Dictionary['levels'];
}

type Filter = 'all' | ImportStatus | 'missing';
const STEP = 50;
const STATUS_TONE: Record<ImportStatus, string> = { new: 'bg-blue text-navy', changed: 'bg-yellow text-navy', same: 'bg-bg text-muted' };

/**
 * "Programmes from ePanduan" on an institution's profile: start a read, watch it run, then pick found programmes
 * and accept them as drafts. Another admin approves each draft before students see it.
 */
export function EpanduanImport({ locale, institutionId, code, shared, run, rows, special, missing, counts, t, levels }: Props) {
  const m = t.institutions.import;
  const router = useRouter();
  const [startState, onStart, starting] = useFormAction<AdminFormState>(startEpanduanImport, {});
  const [acceptState, onAccept, accepting] = useFormAction<AdminFormState>(acceptFoundProgrammes, {});
  // Nothing is ticked for a shared code (Politeknik, Kolej Komuniti): the admin picks this college's programmes.
  const [picked, setPicked] = useState<Set<string>>(() => new Set(shared ? [] : rows.filter(acceptable).map((r) => r.found.code)));
  const [filter, setFilter] = useState<Filter>('all');
  const [shown, setShown] = useState(STEP);

  // While a read (or Syarat Khas for accepted programmes) is running, ask the server again every few seconds.
  const running = run?.status === 'running';
  const readingSpecial = special.some((s) => s.status === 'pending');
  useEffect(() => {
    if (!running && !readingSpecial) return;
    const timer = setInterval(() => router.refresh(), running ? 3000 : 5000);
    return () => clearInterval(timer);
  }, [running, readingSpecial, router]);
  const specialByCode = useMemo(() => {
    const map = new Map<string, SpecialRequirement[]>();
    for (const s of special) map.set(s.code, [...(map.get(s.code) ?? []), s]);
    return map;
  }, [special]);
  const [jenprog, category] = (run?.currentCategory ?? ':').split(':');

  const visible = useMemo(() => (filter === 'all' || filter === 'missing' ? rows : rows.filter((r) => r.status === filter)), [rows, filter]);
  const pickable = rows.filter(acceptable);
  const toggle = (codeValue: string) =>
    setPicked((current) => {
      const next = new Set(current);
      if (next.has(codeValue)) next.delete(codeValue);
      else next.add(codeValue);
      return next;
    });
  const chosen = pickable.filter((r) => picked.has(r.found.code));

  return (
    <div className="flex flex-col gap-4">
      <section className="flex flex-col gap-3 rounded-[18px] border border-line bg-white p-5 lg:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-1">
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              <AdminIcon name="search" size={20} />
              {m.title} <span className="rounded-full bg-bg px-2 py-0.5 text-sm">{code}</span>
            </h2>
            <p className="max-w-[70ch] text-sm text-muted">{m.intro}</p>
          </div>
          <form onSubmit={onStart}>
            <input type="hidden" name="locale" value={locale} />
            <input type="hidden" name="code" value={code} />
            <button type="submit" disabled={starting || running} className={buttonClass(run ? 'secondary' : 'accent')}>
              <IconText icon={run ? 'rotate' : 'search'} busy={starting || running}>
                {run ? m.again : m.start}
              </IconText>
            </button>
          </form>
        </div>
        <FormAlert>{!starting && startState.error ? t.errors[startState.error] : undefined}</FormAlert>
        {shared && (
          <p className="flex items-start gap-2 rounded-[12px] bg-cream px-4 py-3 text-sm">
            <AdminIcon name="info" size={18} />
            {format(m.shared, { code })}
          </p>
        )}
        {!run ? (
          <p className="text-sm text-muted">{m.never}</p>
        ) : run.status === 'running' ? (
          <p role="status" className="flex items-center gap-2 rounded-[12px] bg-blue px-4 py-3 text-sm">
            <AdminIcon name="spinner" size={18} />
            <span>
              {format(m.running, { pages: run.pagesRead })}
              {run.currentCategory && (
                <span className="block text-[13px] text-muted">
                  {format(m.runningCategory, { category: categoryLabel(jenprog ?? '', category ?? '', m), n: run.categoryIndex, total: run.categoryCount })}
                </span>
              )}
            </span>
          </p>
        ) : run.status === 'failed' ? (
          <p role="alert" className="flex items-center gap-2 rounded-[12px] bg-red/10 px-4 py-3 text-sm">
            <AdminIcon name="alert" size={18} className="text-[#b33a35]" />
            {format(m.failed, { reason: failureReason(run.error, m.reasons) })}
          </p>
        ) : (
          <p className="flex items-center gap-2 text-[13px] text-muted">
            <AdminIcon name="clock" size={14} />
            {format(m.lastRun, { when: run.when, pages: run.pagesRead, found: run.found })}
          </p>
        )}
      </section>

      {run?.status === 'done' && rows.length === 0 && <EmptyState icon="search" text={m.empty} />}

      {rows.length > 0 && (
        <form onSubmit={onAccept} className="flex flex-col gap-3">
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="institutionId" value={institutionId} />
          {chosen.map((r) => (
            <input key={r.found.code} type="hidden" name="codes" value={r.found.code} />
          ))}

          <nav aria-label={m.columns.status} className="flex flex-wrap gap-2">
            {(['all', 'new', 'changed', 'same', 'missing'] as const).map((key) => {
              const n = key === 'all' ? rows.length : counts[key];
              const active = filter === key;
              return (
                <button
                  key={key}
                  type="button"
                  aria-pressed={active}
                  onClick={() => {
                    setFilter(key);
                    setShown(STEP);
                  }}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[13px] font-semibold transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy/40 ${
                    active ? 'border-navy bg-navy text-white' : 'border-line bg-white hover:border-navy/30 hover:bg-bg'
                  }`}
                >
                  {m.filters[key]}
                  <span className={`rounded-full px-1.5 text-xs ${active ? 'bg-white/20' : 'bg-bg'}`}>{n}</span>
                </button>
              );
            })}
          </nav>

          {filter === 'missing' ? (
            <section className="flex flex-col gap-2 rounded-[14px] border border-line bg-white p-4">
              <h3 className="font-semibold">{m.missingTitle}</h3>
              <p className="text-[13px] text-muted">{m.missingHint}</p>
              {missing.length === 0 ? (
                <p className="text-sm text-muted">-</p>
              ) : (
                <ul className="flex flex-col divide-y divide-line">
                  {missing.map((p) => (
                    <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                      <span>
                        <span className="font-mono text-[13px] text-muted">{p.programCode}</span> {p.name}
                      </span>
                      <Link href={`/${locale}/admin/program/${p.id}`} className={buttonClass('secondary', 'sm')}>
                        <IconText icon="eye">{t.institutions.open}</IconText>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ) : (
            <div className="overflow-x-auto rounded-[14px] border border-line bg-white">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead className="bg-bg text-[13px] text-muted">
                  <tr>
                    <th className="w-12 px-4 py-3 font-medium">
                      <span className="sr-only">{m.columns.pick}</span>
                    </th>
                    <th className="px-4 py-3 font-medium">{m.columns.code}</th>
                    <th className="px-4 py-3 font-medium">{m.columns.name}</th>
                    <th className="px-4 py-3 font-medium">{m.columns.level}</th>
                    <th className="px-4 py-3 font-medium">{m.columns.duration}</th>
                    <th className="px-4 py-3 font-medium">{m.columns.nec}</th>
                    <th className="px-4 py-3 font-medium">{m.columns.merit}</th>
                    <th className="px-4 py-3 font-medium">{m.columns.status}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {visible.slice(0, shown).map((row) => {
                    const f = row.found;
                    const canPick = acceptable(row);
                    return (
                      <tr key={f.code} className={`transition-colors duration-150 ${picked.has(f.code) && canPick ? 'bg-blue/40' : 'hover:bg-bg/70'}`}>
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            aria-label={`${m.columns.pick}: ${f.name}`}
                            checked={canPick && picked.has(f.code)}
                            disabled={!canPick}
                            onChange={() => toggle(f.code)}
                            className="size-4 accent-navy disabled:opacity-40"
                          />
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 font-mono text-[13px]">{f.code}</td>
                        <td className="px-4 py-3">
                          <p className="font-semibold">{f.name}</p>
                          <CategoryChips programme={f} m={m} />
                          <p className="flex flex-wrap gap-x-2 text-[12px] text-muted">
                            {f.campuses.join(' · ')}
                            {f.isStem && <span>{m.flags.stem}</span>}
                            {f.isTvet && <span>{m.flags.tvet}</span>}
                            {f.bumiputeraOnly && <span>{m.flags.bumiputera}</span>}
                            {f.feeder && <span>{m.flags.feeder}</span>}
                            {f.isNew && <span className="font-semibold text-navy">{m.flags.newProgramme}</span>}
                          </p>
                          {row.changes.length > 0 && <p className="text-[12px] text-[#8a6100]">{format(m.changes, { fields: row.changes.map((c) => m.fields[c]).join(', ') })}</p>}
                          {row.problem && (
                            <p className="flex items-center gap-1 text-[12px] text-[#b33a35]">
                              <AdminIcon name="alert" size={12} />
                              {m.problems[row.problem]}
                            </p>
                          )}
                          <FoundDetails programme={f} special={specialByCode.get(f.code) ?? []} m={m} />
                        </td>
                        <td className="px-4 py-3">{f.level ? levels[f.level] : (f.levelText ?? '-')}</td>
                        <td className="whitespace-nowrap px-4 py-3">{f.durationSemesters ? format(m.semesters, { n: f.durationSemesters }) : '-'}</td>
                        <td className="px-4 py-3 text-[13px]" title={f.necName ?? undefined}>
                          {f.necCode ?? '-'}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3">{f.merit !== null ? `${f.merit.toFixed(2)}%` : '-'}</td>
                        <td className="px-4 py-3">
                          <span className={`whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_TONE[row.status]}`}>{m.status[row.status]}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          {filter !== 'missing' && visible.length > shown && (
            <button type="button" onClick={() => setShown(shown + STEP)} className={`${buttonClass('secondary')} self-center`}>
              {format(t.pagination.range, { from: 1, to: shown, total: visible.length })} · +{Math.min(STEP, visible.length - shown)}
            </button>
          )}

          {/* One bar for the choice and the action, kept at the bottom while scrolling the list. */}
          <div className="sticky bottom-0 z-10 flex flex-col gap-2 rounded-[14px] border border-line bg-white/95 p-4 backdrop-blur sm:flex-row sm:items-center">
            <div className="flex flex-1 flex-wrap items-center gap-2">
              <button type="button" onClick={() => setPicked(new Set(pickable.map((r) => r.found.code)))} className={buttonClass('ghost', 'sm')}>
                <IconText icon="check">{m.selectAll}</IconText>
              </button>
              <button type="button" onClick={() => setPicked(new Set())} className={buttonClass('ghost', 'sm')}>
                <IconText icon="x">{m.clear}</IconText>
              </button>
            </div>
            <button type="submit" disabled={accepting || chosen.length === 0} className={buttonClass('primary')}>
              <IconText icon="plus" busy={accepting}>
                {format(m.accept, { n: chosen.length })}
              </IconText>
            </button>
          </div>
          <FormAlert>{!accepting && acceptState.error ? t.errors[acceptState.error] : undefined}</FormAlert>
          {acceptState.imported && !accepting && (
            <p role="status" className="flex items-center gap-2 rounded-[12px] bg-mint px-4 py-3 text-sm text-[#1f6b47]">
              <AdminIcon name="checkCircle" size={18} />
              {format(m.accepted, { created: acceptState.imported.created, updated: acceptState.imported.updated })}
              {acceptState.imported.failed > 0 && ` ${format(m.acceptedFailed, { failed: acceptState.imported.failed })}`}
            </p>
          )}
        </form>
      )}
      <p className="text-[12px] text-muted">{m.source}</p>
    </div>
  );
}

/** The stored failure ("unavailable: ePanduan answered 503") in plain words for the admin. */
function failureReason(error: string | null, reasons: Dictionary['admin']['institutions']['import']['reasons']): string {
  const kind = error?.split(':')[0];
  if (kind === 'layout_changed') return reasons.layout;
  if (kind === 'unavailable') return reasons.unavailable;
  if (kind === 'stopped') return reasons.stopped;
  return reasons.other;
}
