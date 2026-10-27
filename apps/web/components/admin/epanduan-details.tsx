import type { FoundProgramme, SpecialRequirement } from '@/lib/admin/api';
import { format, type Dictionary } from '@/lib/i18n/locale';

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
        <span key={`${c.jenprog}:${c.category}`} title={categoryLabel(c.jenprog, c.category, m)} className="rounded-full bg-bg px-2 py-0.5 text-[11px] font-semibold text-navy">
          {categoryLabel(c.jenprog, c.category, m)}
        </span>
      ))}
    </span>
  );
}

/**
 * Everything ePanduan shows for one programme, as plain text an admin can read and quote: details, each category's
 * Syarat Am and Syarat Khas, fees and careers. Opens on demand so the list stays short.
 */
export function FoundDetails({ programme, special, m, open = false }: { programme: FoundProgramme; special: SpecialRequirement[]; m: ImportDict; open?: boolean }) {
  const byCategory = new Map(special.map((s) => [s.category, s]));
  const info: Array<[string, string | null]> = [
    [m.info.level, programme.levelText],
    [m.info.mode, programme.studyMode ? m.info.modes[programme.studyMode] : null],
    [m.info.duration, programme.durationSemesters ? format(m.semesters, { n: programme.durationSemesters }) : null],
    [m.info.nec, programme.necCode ? `${programme.necCode} ${programme.necName ?? ''}`.trim() : null],
    [m.info.interview, programme.hasInterview === null ? null : programme.hasInterview ? m.info.yes : m.info.no],
    [m.info.year, programme.year ? String(programme.year) : null],
    [m.info.note, programme.note],
  ];
  return (
    <details open={open} className="group mt-1">
      <summary className="inline-flex cursor-pointer list-none items-center gap-1 rounded-md text-[12px] font-semibold text-[#2f5bd3] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy/40">
        <span className="transition-transform duration-150 group-open:rotate-90 motion-reduce:transition-none">›</span>
        {m.details}
      </summary>
      <div className="mt-2 flex flex-col gap-3 rounded-[12px] border border-line bg-bg/60 p-3 text-[13px]">
        <dl className="grid gap-x-4 gap-y-1 sm:grid-cols-2">
          {info
            .filter(([, value]) => value)
            .map(([label, value]) => (
              <div key={label} className="flex gap-2">
                <dt className="shrink-0 text-muted">{label}:</dt>
                <dd className="font-medium">{value}</dd>
              </div>
            ))}
        </dl>
        {programme.categories.map((c) => {
          const khas = byCategory.get(c.category);
          return (
            <section key={`${c.jenprog}:${c.category}`} className="flex flex-col gap-1.5 rounded-[10px] bg-white p-3">
              <h4 className="text-[13px] font-semibold">{format(m.requirementsFor, { category: categoryLabel(c.jenprog, c.category, m) })}</h4>
              <p className="text-[12px] font-semibold text-muted">{m.general}</p>
              <p className="whitespace-pre-wrap leading-relaxed">{c.generalRequirements ?? m.none}</p>
              <p className="text-[12px] font-semibold text-muted">{m.special}</p>
              <p className="whitespace-pre-wrap leading-relaxed">
                {!khas ? m.specialLater : khas.status === 'pending' ? m.specialReading : khas.status === 'failed' ? m.specialFailed : (khas.text ?? m.none)}
              </p>
            </section>
          );
        })}
        {programme.fees && (
          <p>
            <span className="font-semibold">{m.fees}: </span>
            {programme.fees}
          </p>
        )}
        {programme.careers && (
          <p>
            <span className="font-semibold">{m.careers}: </span>
            {programme.careers}
          </p>
        )}
      </div>
    </details>
  );
}
