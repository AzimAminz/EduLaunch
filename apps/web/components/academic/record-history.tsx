import Link from 'next/link';
import type { AcademicRecord } from '@/lib/profile/api';
import { historyKind } from '@/lib/profile/records';
import { format, type Dictionary, type Locale } from '@/lib/i18n/locale';

/** "Saved records": the student's history across levels (school years, SPM targets, actual SPM). Nothing is deleted. */
export function RecordHistory({ locale, t, records, currentId }: { locale: Locale; t: Dictionary['academic']['history']; records: AcademicRecord[]; currentId: string | null }) {
  return (
    <section className="flex flex-col gap-3 rounded-[18px] bg-white p-5">
      <h2 className="text-lg font-semibold">{t.title}</h2>
      <p className="text-[13px] text-muted">{t.intro}</p>
      {records.length === 0 ? (
        <p className="text-sm text-muted">{t.empty}</p>
      ) : (
        <ul className="flex flex-col divide-y divide-line">
          {records.map((r) => {
            const current = r.id === currentId;
            return (
              <li key={r.id} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <p className="text-sm font-semibold">{format(t.labels[historyKind(r)], { year: r.examYear ?? t.noYear })}</p>
                  <p className="text-xs text-muted">
                    {r.cgpa !== null || r.muetBand !== null
                      ? format(t.details, { cgpa: r.cgpa?.toFixed(2) ?? '–', muet: r.muetBand === null ? '–' : r.muetBand === 5.5 ? '5+' : r.muetBand.toFixed(1) })
                      : format(t.subjects, { count: r.subjects.length })}
                  </p>
                </div>
                {current ? (
                  <span className="shrink-0 rounded-full bg-blue px-2.5 py-1 text-xs font-semibold">{t.current}</span>
                ) : (
                  <Link href={`/${locale}/dokumen/rekod/${r.id}`} className="shrink-0 rounded-[9px] border border-line px-3 py-1.5 text-sm font-semibold hover:bg-bg">
                    {t.open}
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
