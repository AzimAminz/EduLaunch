import Link from 'next/link';
import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { lang as rootLang } from 'next/root-params';
import { z } from 'zod';
import { fieldName, getReferenceData, localName } from '@/lib/catalogue/api';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { format, isLocale, type Dictionary, type Locale } from '@/lib/i18n/locale';
import { getRecord } from '@/lib/profile/api';
import { historyKind } from '@/lib/profile/records';
import { getAccessToken } from '@/lib/supabase/server';

/** One saved record, read only: older school years, SPM targets kept after the real results, and so on. */
export default async function RecordPage({ params }: PageProps<'/[lang]/dokumen/rekod/[id]'>) {
  const lang = await rootLang();
  if (!isLocale(lang)) notFound();
  const dict = await getDictionary(lang);
  return (
    <>
      <Link href={`/${lang}/dokumen`} className="text-sm font-semibold hover:underline">
        ← {dict.academic.view.back}
      </Link>
      <Suspense fallback={<p className="text-sm text-muted">{dict.academic.loading}</p>}>
        <SavedRecord lang={lang} dict={dict} params={params} />
      </Suspense>
    </>
  );
}

async function load(token: string, id: string) {
  try {
    const [record, reference] = await Promise.all([getRecord(token, id), getReferenceData()]);
    return { record, reference };
  } catch {
    return null;
  }
}

async function SavedRecord({ lang, dict, params }: { lang: Locale; dict: Dictionary; params: PageProps<'/[lang]/dokumen/rekod/[id]'>['params'] }) {
  const t = dict.academic;
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const token = await getAccessToken();
  if (!token) notFound();
  // Someone else's record answers like a missing one.
  const data = await load(token, id);
  if (!data) notFound();

  const { record, reference } = data;
  const names = new Map(reference.subjects.map((s) => [s.id, localName(s, lang)]));
  const kind = historyKind(record);
  const h = dict.higher;
  const fieldLabel = record.fieldId ? reference.fields.find((f) => f.id === record.fieldId) : undefined;
  // CGPA, MUET and diploma details, shown above the subjects when the record has them.
  const details: Array<[string, string]> = [
    ...(record.cgpa !== null ? [[h.cgpa, record.cgpa.toFixed(2)] as [string, string]] : []),
    ...(record.muetBand !== null ? [[h.muet, `Band ${record.muetBand === 5.5 ? '5+' : record.muetBand.toFixed(1)}`] as [string, string]] : []),
    ...(fieldLabel ? [[h.field, fieldName(fieldLabel, lang)] as [string, string]] : []),
    ...(record.programmeName ? [[h.programme, record.programmeName] as [string, string]] : []),
  ];
  return (
    <>
      <header className="flex flex-col gap-3">
        <p className="text-xs font-semibold tracking-wide text-muted">{t.eyebrow}</p>
        <h1 className="text-[32px] font-bold leading-tight lg:text-[44px]">{format(t.history.labels[kind], { year: record.examYear ?? t.history.noYear })}</h1>
        <p className="text-[15px] text-muted">{t.view.readOnly}</p>
      </header>
      <section className="flex flex-col gap-4 rounded-[18px] bg-white p-5 sm:p-6">
        <p className="self-start rounded-full bg-bg px-3 py-1 text-xs font-semibold">{t.status[record.status]}</p>
        {details.length > 0 && (
          <dl className="grid gap-3 sm:grid-cols-3">
            {details.map(([label, value]) => (
              <div key={label} className="rounded-[12px] bg-bg px-4 py-3">
                <dt className="text-xs text-muted">{label}</dt>
                <dd className="text-lg font-semibold">{value}</dd>
              </div>
            ))}
          </dl>
        )}
        {record.subjects.length > 0 && (
          <table className="w-full overflow-hidden rounded-[12px] border border-line text-left text-sm">
            <thead className="bg-bg text-xs uppercase text-muted">
              <tr>
                <th scope="col" className="px-4 py-2.5 font-medium">
                  {t.colSubject}
                </th>
                <th scope="col" className="px-4 py-2.5 font-medium">
                  {kind in t.colGrade ? t.colGrade[kind as keyof typeof t.colGrade] : t.colGrade.actual}
                </th>
              </tr>
            </thead>
            <tbody>
              {record.subjects.map((s) => (
                <tr key={s.subjectId} className="border-t border-line">
                  <th scope="row" className="px-4 py-2.5 font-semibold">
                    {s.customName ?? names.get(s.subjectId) ?? '—'}
                    {s.customName && <span className="ml-2 rounded-full bg-cream px-2 py-0.5 text-xs font-normal">{t.categories.custom}</span>}
                  </th>
                  <td className="px-4 py-2.5 font-semibold">{s.grade}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </>
  );
}
