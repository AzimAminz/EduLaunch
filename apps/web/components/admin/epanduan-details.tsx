import type { ReactNode } from 'react';
import type { FoundProgramme, SpecialRequirement } from '@/lib/admin/api';
import { groupCategories } from '@/lib/admin/epanduan-text';
import { format, type Dictionary } from '@/lib/i18n/locale';
import { CategoryTabs } from './category-tabs';
import { AdminIcon, type AdminIconName } from './icons';

type ImportDict = Dictionary['admin']['institutions']['import'];

/** "SPM tahun semasa", "Diploma UA"… for an ePanduan candidate category. */
export function categoryLabel(jenprog: string, category: string, m: ImportDict): string {
  const labels: Record<string, string> = m.categories;
  return labels[`${jenprog}:${category}`] ?? `${jenprog.toUpperCase()} ${category}`;
}

/** The categories a programme is listed under, as small chips. */
export function CategoryChips({ programme, m }: { programme: FoundProgramme; m: ImportDict }) {
  if (programme.categories.length === 0) return null;
  return (
    <span className="flex flex-wrap gap-1">
      {programme.categories.map((c) => (
        <span key={`${c.jenprog}:${c.category}`} className="rounded-full bg-bg px-2 py-0.5 text-[11px] font-semibold text-navy">
          {categoryLabel(c.jenprog, c.category, m)}
        </span>
      ))}
    </span>
  );
}

/** "JURUTERA,USAHAWAN, PENDIDIK" → ["Jurutera", "Usahawan", "Pendidik"]; long prose stays one paragraph. */
function careerList(text: string | null): string[] | null {
  if (!text) return null;
  const parts = text.split(/\s*[,;]\s*/).map((p) => p.trim()).filter(Boolean);
  if (parts.length < 2 || parts.some((p) => p.length > 60)) return null;
  return parts.map((p) => (p === p.toUpperCase() ? p.charAt(0) + p.slice(1).toLowerCase() : p));
}

/** Everything ePanduan shows for one programme, read at a glance: details, requirements by category, fees, careers. */
export function FoundDetailsBody({ programme, special, m, headers, empty }: {
  programme: FoundProgramme;
  special: SpecialRequirement[];
  m: ImportDict;
  /** Above each category tab's text, by group key. */
  headers?: Record<string, ReactNode>;
  empty?: string;
}) {
  const info: Array<[AdminIconName, string, string | null]> = [
    ['programme', m.info.level, programme.levelText],
    ['clock', m.info.duration, programme.durationSemesters ? format(m.semesters, { n: programme.durationSemesters }) : null],
    ['sliders', m.info.mode, programme.studyMode ? m.info.modes[programme.studyMode] : null],
    ['list', m.info.nec, programme.necCode ? `${programme.necCode} · ${programme.necName ?? ''}`.replace(/ · $/, '') : null],
    ['listChecks', m.info.interview, programme.hasInterview === null ? null : programme.hasInterview ? m.info.yes : m.info.no],
    ['draft', m.info.year, programme.year ? String(programme.year) : null],
  ];
  const careers = careerList(programme.careers);
  return (
    <div className="flex flex-col gap-3 text-[13px]">
      <dl className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {info
          .filter(([, , value]) => value)
          .map(([icon, label, value]) => (
            <div key={label} className="flex items-start gap-2 rounded-[10px] border border-line bg-white px-3 py-2">
              <AdminIcon name={icon} size={15} className="mt-0.5 text-muted" />
              <div className="min-w-0">
                <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted">{label}</dt>
                <dd className="font-medium">{value}</dd>
              </div>
            </div>
          ))}
      </dl>
      {programme.note && (
        <p className="flex items-start gap-2 rounded-[10px] bg-cream px-3 py-2">
          <AdminIcon name="info" size={15} className="mt-0.5" />
          <span>
            <span className="font-semibold">{m.info.note}: </span>
            {programme.note}
          </span>
        </p>
      )}
      <CategoryTabs groups={groupCategories(programme.categories, special)} m={m} headers={headers} empty={empty} />
      {(programme.fees || programme.careers) && (
        <div className="grid gap-3 sm:grid-cols-2">
          {programme.careers && (
            <section className="flex flex-col gap-1.5 rounded-[12px] border border-line bg-white p-3">
              <h4 className="text-[12px] font-bold uppercase tracking-wide text-muted">{m.careers}</h4>
              {careers ? (
                <ul className="flex flex-wrap gap-1">
                  {careers.map((c) => (
                    <li key={c} className="rounded-full bg-mint px-2 py-0.5 text-[12px] text-[#1f6b47]">
                      {c}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="leading-relaxed">{programme.careers}</p>
              )}
            </section>
          )}
          {programme.fees && (
            <section className="flex flex-col gap-1.5 rounded-[12px] border border-line bg-white p-3">
              <h4 className="text-[12px] font-bold uppercase tracking-wide text-muted">{m.fees}</h4>
              <p className="leading-relaxed text-muted">{programme.fees}</p>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

/** The details behind a disclosure, so a long list stays short until a row is opened. */
export function FoundDetails({ programme, special, m, open = false }: { programme: FoundProgramme; special: SpecialRequirement[]; m: ImportDict; open?: boolean }) {
  return (
    <details open={open} className="group mt-1">
      <summary className="inline-flex cursor-pointer list-none items-center gap-1 rounded-md text-[12px] font-semibold text-[#2f5bd3] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy/40">
        <span className="transition-transform duration-150 group-open:rotate-90 motion-reduce:transition-none">›</span>
        {m.details}
      </summary>
      <div className="mt-2 rounded-[12px] border border-line bg-bg/60 p-3">
        <FoundDetailsBody programme={programme} special={special} m={m} />
      </div>
    </details>
  );
}
