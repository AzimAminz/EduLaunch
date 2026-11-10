import Link from 'next/link';
import { notFound } from 'next/navigation';
import { lang as rootLang } from 'next/root-params';
import { z } from 'zod';
import { GradeScales, hasSubjectGrades, type MatriculationStream } from '@edulaunch/contracts';
import { HigherResultsForm } from '@/components/academic/higher-results-form';
import { SubjectTable } from '@/components/academic/subject-table';
import { fieldName, getReferenceData, localName } from '@/lib/catalogue/api';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { format, isLocale, type Dictionary, type Locale } from '@/lib/i18n/locale';
import { getRecord } from '@/lib/profile/api';
import { subjectOptions, toRows } from '@/lib/profile/form-rows';
import { gradesFor, historyKind, recordLabel, rowsForStream, type HigherQualification, type RecordVariant } from '@/lib/profile/records';
import { getAccessToken } from '@/lib/supabase/server';
import { Pending } from '@/components/ui/pending';

/**
 * One saved record: older school years, SPM targets kept after the real results, an earlier qualification. Read
 * first, with "Edit" opening the same results form the record was made with (?sunting=1), so a mistake in an old
 * record can be put right without changing the education level.
 */
export default async function RecordPage({ params, searchParams }: PageProps<'/[lang]/dokumen/rekod/[id]'>) {
  const lang = await rootLang();
  if (!isLocale(lang)) notFound();
  const dict = await getDictionary(lang);
  return (
    <>
      <Link href={`/${lang}/dokumen`} className="text-sm font-semibold hover:underline">
        ← {dict.academic.view.back}
      </Link>
      <Pending label={dict.academic.loading} variant="form">
        <SavedRecord lang={lang} dict={dict} params={params} searchParams={searchParams} />
      </Pending>
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

type Props = PageProps<'/[lang]/dokumen/rekod/[id]'>;

/** The form a record was made with: school grades, SPM targets, SPM results, or a qualification after SPM. */
function variantOf(record: { qualification: string; kind: string }): RecordVariant | 'higher' {
  if (record.qualification === 'school') return 'school';
  if (record.qualification === 'spm') return record.kind === 'target' ? 'target' : 'actual';
  return 'higher';
}

async function SavedRecord({ lang, dict, params, searchParams }: { lang: Locale; dict: Dictionary; params: Props['params']; searchParams: Props['searchParams'] }) {
  const t = dict.academic;
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const editing = sp.sunting === '1';
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
    ...(record.stream && record.stream in h.streams ? [[h.stream, h.streams[record.stream as keyof typeof h.streams]] as [string, string]] : []),
    ...(fieldLabel ? [[h.field, fieldName(fieldLabel, lang)] as [string, string]] : []),
    ...(!fieldLabel && record.customFieldName ? [[h.field, record.customFieldName] as [string, string]] : []),
    ...(record.programmeName ? [[h.programme, record.programmeName] as [string, string]] : []),
    ...(record.semesterGpas ?? []).map((g, i) => [format(h.semesters.label, { n: i + 1 }), g === null ? '–' : g.toFixed(2)] as [string, string]),
  ];
  const title = recordLabel(record, t.history);
  const here = `/${lang}/dokumen/rekod/${record.id}`;

  if (editing) {
    const thisYear = new Date().getFullYear();
    const years = [...new Set([...(record.examYear ? [record.examYear] : []), ...Array.from({ length: 8 }, (_, i) => thisYear - i)])].sort((a, b) => b - a);
    const variant = variantOf(record);
    const subjects = subjectOptions(reference, record.qualification, lang);
    const q = record.qualification as HigherQualification;
    return (
      <>
        <header className="flex flex-col gap-3">
          <p className="text-xs font-semibold tracking-wide text-muted">{t.eyebrow}</p>
          <h1 className="text-[32px] font-bold leading-tight lg:text-[44px]">{format(t.view.editTitle, { record: title })}</h1>
          <p className="text-[15px] text-muted">{t.view.editIntro}</p>
        </header>
        <section className="flex flex-col gap-4 rounded-[18px] bg-white p-5 sm:p-6">
          {variant === 'higher' ? (
            <HigherResultsForm
              locale={lang}
              qualification={q}
              t={dict.higher}
              academic={t}
              subjects={hasSubjectGrades(q) ? subjects : []}
              grades={hasSubjectGrades(q) ? GradeScales[q] : []}
              fields={reference.fields.map((f) => ({ value: f.id, label: fieldName(f, lang) })).sort((a, b) => a.label.localeCompare(b.label, lang))}
              years={years}
              initial={{
                examYear: record.examYear,
                cgpa: record.cgpa,
                muetBand: record.muetBand,
                fieldId: record.fieldId,
                programmeName: record.programmeName,
                qualificationLevel: record.qualificationLevel,
                stream: record.stream,
                customFieldName: record.customFieldName,
                semesterGpas: record.semesterGpas,
                rows: !hasSubjectGrades(q)
                  ? []
                  : record.stream && record.qualification === 'matriculation'
                    ? rowsForStream(record.stream as MatriculationStream, subjects, toRows(record, subjects, lang))
                    : toRows(record, subjects, lang),
              }}
              status={record.status}
            />
          ) : (
            <SubjectTable
              locale={lang}
              variant={variant}
              t={t}
              subjects={subjects}
              grades={gradesFor(record.qualification as 'school' | 'spm')}
              years={years}
              // Saved onto this record, so its year (and, for school grades and SPM targets, its form) can change too.
              recordId={record.id}
              formChoices={variant === 'school' ? [1, 2, 3] : variant === 'target' ? [4, 5] : undefined}
              initialForm={record.formLevel}
              initialYear={record.examYear}
              initialRows={toRows(record, subjects, lang)}
              status={record.status}
            />
          )}
        </section>
        <Link href={here} className="self-start text-sm font-semibold underline underline-offset-2">
          {t.view.doneEditing}
        </Link>
      </>
    );
  }

  return (
    <>
      <header className="flex flex-col gap-3">
        <p className="text-xs font-semibold tracking-wide text-muted">{t.eyebrow}</p>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h1 className="text-[32px] font-bold leading-tight lg:text-[44px]">{title}</h1>
          <Link href={`${here}?sunting=1`} className="inline-flex h-11 items-center rounded-[12px] bg-navy px-5 text-sm font-semibold text-white transition-colors hover:bg-navy/90">
            {t.view.edit}
          </Link>
        </div>
        <p className="text-[15px] text-muted">{t.view.readOnly}</p>
      </header>
      <section data-reveal className="flex flex-col gap-4 rounded-[18px] bg-white p-5 sm:p-6">
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
