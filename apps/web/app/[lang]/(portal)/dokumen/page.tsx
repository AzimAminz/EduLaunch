import Image from 'next/image';
import Link from 'next/link';
import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { lang as rootLang } from 'next/root-params';
import { GradeScales, hasSubjectGrades } from '@edulaunch/contracts';
import { HigherResultsForm } from '@/components/academic/higher-results-form';
import { RecordHistory } from '@/components/academic/record-history';
import { SubjectTable } from '@/components/academic/subject-table';
import { fieldName, getReferenceData, localName } from '@/lib/catalogue/api';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { format, isLocale, type Dictionary, type Locale } from '@/lib/i18n/locale';
import { getCurrentRecord, getMe, listRecords, type AcademicRecord } from '@/lib/profile/api';
import { examYearsFor, gradesFor, higherChoicesFor, recordFormFor, schoolTabsFor, sortRows, startingRows, type HigherQualification, type RecordVariant, type SubjectOption } from '@/lib/profile/records';
import { getAccessToken } from '@/lib/supabase/server';

const SIDE_IMAGE: Record<RecordVariant, string> = {
  school: '/illustrations/rimau-waving.png',
  target: '/illustrations/rimau-compass.png',
  actual: '/illustrations/rimau-shield.png',
  basic: '/illustrations/rimau-shield.png',
};

type SearchParams = PageProps<'/[lang]/dokumen'>['searchParams'];
type Reference = Awaited<ReturnType<typeof getReferenceData>>;

/**
 * "Dokumen akademik": the results form for the student's level (Figma: Profil akademik · …) and their saved records.
 * After pre-university or diploma there are two parts: the qualification (CGPA, MUET…) and the basic SPM results.
 */
export default async function AcademicPage({ searchParams }: PageProps<'/[lang]/dokumen'>) {
  const lang = await rootLang();
  if (!isLocale(lang)) notFound();
  const dict = await getDictionary(lang);
  return (
    // The student's level and results are request-time data.
    <Suspense fallback={<p className="text-sm text-muted">{dict.academic.loading}</p>}>
      <Academic lang={lang} dict={dict} searchParams={searchParams} />
    </Suspense>
  );
}

const subjectOptions = (reference: Reference, qualification: string, lang: Locale): SubjectOption[] =>
  reference.subjects
    .filter((s) => s.qualification === qualification)
    .map((s) => ({ id: s.id, name: localName(s, lang), category: s.category, isMandatory: s.isMandatory, keywords: [s.name, s.nameEn ?? '', ...s.aliases].filter(Boolean) }));

const toRows = (record: AcademicRecord | null, subjects: SubjectOption[], lang: Locale) =>
  record ? sortRows(record.subjects.map((s) => ({ subjectId: s.subjectId, grade: s.grade, customName: s.customName })), subjects, lang) : startingRows(subjects, lang);

/** Loads the level, the student's history and the subject list. */
async function loadBasics(token: string) {
  try {
    const me = await getMe(token);
    if (!me.educationLevel) return { state: 'noLevel' as const };
    const [history, reference] = await Promise.all([listRecords(token), getReferenceData()]);
    return { state: 'ready' as const, level: me.educationLevel, formYear: me.formYear, higherQualification: me.higherQualification, history, reference };
  } catch {
    return { state: 'error' as const };
  }
}

async function loadRecord(token: string, ...key: Parameters<typeof getCurrentRecord> extends [string, ...infer R] ? R : never) {
  try {
    return { ok: true as const, record: await getCurrentRecord(token, ...key) };
  } catch {
    return { ok: false as const };
  }
}

async function Academic({ lang, dict, searchParams }: { lang: Locale; dict: Dictionary; searchParams: SearchParams }) {
  const t = dict.academic;
  const token = await getAccessToken();
  if (!token) notFound();
  const query = await searchParams;
  const param = (name: string) => (typeof query[name] === 'string' ? (query[name] as string) : '');

  const data = await loadBasics(token);
  if (data.state === 'error') return <LoadError text={t.loadError} />;
  if (data.state === 'noLevel') {
    return (
      <section className="flex flex-col items-start gap-3 rounded-[22px] bg-white p-6 lg:p-10">
        <h1 className="text-[28px] font-bold leading-tight">{t.noLevel.title}</h1>
        <p className="text-[15px] text-muted">{t.noLevel.body}</p>
        <Link href={`/${lang}/mula`} className="rounded-[10px] bg-navy px-5 py-3 font-semibold text-white">
          {t.noLevel.action}
        </Link>
      </section>
    );
  }

  const { level, formYear, higherQualification, history, reference } = data;
  const thisYear = new Date().getFullYear();
  const choices = higherChoicesFor(level);
  const showHigher = choices.length > 0 && param('bahagian') !== 'spm';
  const levelTitle = dict.onboarding.levels[level].title.toLocaleUpperCase(lang);

  // ── Pre-university or diploma qualification ──
  if (showHigher) {
    const h = dict.higher;
    const levelKey = level as 'after_preu' | 'after_diploma';
    // The qualification the student chose when setting their level; only its form is shown.
    const qualification: HigherQualification | null = level === 'after_diploma' ? 'diploma' : higherQualification;
    if (!qualification) {
      return (
        <section className="flex flex-col items-start gap-3 rounded-[22px] bg-white p-6 lg:p-10">
          <h1 className="text-[28px] font-bold leading-tight">{h.chooseQualification.title}</h1>
          <p className="text-[15px] text-muted">{h.chooseQualification.body}</p>
          <Link href={`/${lang}/profil`} className="rounded-[10px] bg-navy px-5 py-3 font-semibold text-white">
            {h.chooseQualification.action}
          </Link>
        </section>
      );
    }
    const loaded = await loadRecord(token, qualification, 'actual');
    if (!loaded.ok) return <LoadError text={t.loadError} />;
    const record = loaded.record;
    const subjects = hasSubjectGrades(qualification) ? subjectOptions(reference, qualification, lang) : [];

    return (
      <>
        <Heading eyebrow={`${t.eyebrow} · ${levelTitle}`} title={h.titles[levelKey]} intro={h.intros[levelKey]} />
        <SectionTabs lang={lang} dict={dict} current="results" />
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          <section className="flex flex-col gap-4 rounded-[18px] bg-white p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold">
                {h.qualificationLabel}: {h.qualifications[qualification]}
              </p>
              <Link href={`/${lang}/profil`} className="text-sm font-semibold text-[#2f5bd3] hover:underline">
                {h.changeQualification}
              </Link>
            </div>
            <HigherResultsForm
              // Another qualification starts from its own saved values; saving keeps the form (and its notice).
              key={qualification}
              locale={lang}
              qualification={qualification}
              t={h}
              academic={t}
              subjects={subjects}
              grades={hasSubjectGrades(qualification) ? GradeScales[qualification] : []}
              fields={reference.fields.map((f) => ({ value: f.id, label: fieldName(f, lang) })).sort((a, b) => a.label.localeCompare(b.label, lang))}
              years={Array.from({ length: 6 }, (_, i) => thisYear - i)}
              initial={{
                examYear: record?.examYear ?? null,
                cgpa: record?.cgpa ?? null,
                muetBand: record?.muetBand ?? null,
                fieldId: record?.fieldId ?? null,
                programmeName: record?.programmeName ?? null,
                rows: hasSubjectGrades(qualification) ? toRows(record, subjects, lang) : [],
              }}
              status={record?.status ?? 'none'}
            />
          </section>
          <div className="flex flex-col gap-4">
            <aside className="flex flex-col gap-2 rounded-[18px] bg-blue p-5">
              <p className="text-lg font-semibold">{h.sideTitle}</p>
              <p className="text-sm">{h.sideBody[levelKey]}</p>
              <p className="text-xs text-muted">{h.sideNote}</p>
            </aside>
            <RecordHistory locale={lang} t={t.history} records={history} currentId={record?.id ?? null} />
          </div>
        </div>
      </>
    );
  }

  // ── School grades, SPM targets, actual SPM, or the basic SPM part of a higher level ──
  const form = recordFormFor(level);
  const years = examYearsFor(form, thisYear, formYear);
  const tabs = schoolTabsFor(formYear, thisYear);
  const wantedYear = Number(param('tahun'));
  // School results are kept per year: the year in the address, else the newest saved one, else this year.
  const schoolYear =
    form.kind === 'school'
      ? (years.find((y) => y === wantedYear) ?? history.find((r) => r.kind === 'school' && r.examYear && years.includes(r.examYear))?.examYear ?? thisYear)
      : null;
  const loaded = await loadRecord(token, form.qualification, form.kind, schoolYear);
  if (!loaded.ok) return <LoadError text={t.loadError} />;
  const record = loaded.record;
  const subjects = subjectOptions(reference, form.qualification, lang);

  return (
    <>
      <Heading eyebrow={`${t.eyebrow} · ${levelTitle}`} title={t.titles[form.variant]} intro={t.intros[form.variant]} />
      {choices.length > 0 && <SectionTabs lang={lang} dict={dict} current="spm" />}
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <section className="flex flex-col gap-4 rounded-[18px] bg-white p-5 sm:p-6">
          {schoolYear !== null && (
            <nav aria-label={t.yearTabs} className="flex flex-wrap gap-2">
              {tabs.map((tab) => (
                <Link
                  key={tab.year}
                  href={`/${lang}/dokumen?tahun=${tab.year}`}
                  aria-current={tab.year === schoolYear ? 'page' : undefined}
                  className={`rounded-full px-4 py-2 text-sm font-semibold ${tab.year === schoolYear ? 'bg-navy text-white' : 'bg-bg hover:bg-blue'}`}
                >
                  {format(t.schoolTab, tab)}
                </Link>
              ))}
            </nav>
          )}
          <SubjectTable
            // A different form (level or year) starts from its own saved rows; saving keeps the form (and its notice).
            key={`${form.variant}-${schoolYear ?? ''}`}
            locale={lang}
            variant={form.variant}
            t={t}
            subjects={subjects}
            grades={gradesFor(form.qualification)}
            years={years}
            fixedYear={schoolYear ?? undefined}
            initialYear={record?.examYear ?? null}
            initialRows={toRows(record, subjects, lang)}
            status={record?.status ?? 'none'}
          />
        </section>
        <div className="flex flex-col gap-4">
          <aside className="hidden flex-col gap-3 rounded-[18px] bg-blue p-6 lg:flex">
            <Image src={SIDE_IMAGE[form.variant]} alt="" width={180} height={180} loading="eager" className="size-[180px] object-contain" />
            <p className="text-lg font-semibold">{t.sideTitle[form.variant]}</p>
            <p className="text-sm text-muted">{t.sideBody[form.variant]}</p>
          </aside>
          <RecordHistory locale={lang} t={t.history} records={history} currentId={record?.id ?? null} />
        </div>
      </div>
    </>
  );
}

function Heading({ eyebrow, title, intro }: { eyebrow: string; title: string; intro: string }) {
  return (
    <header className="flex flex-col gap-3">
      <p className="text-xs font-semibold tracking-wide text-muted">{eyebrow}</p>
      <h1 className="text-[32px] font-bold leading-tight lg:text-[44px]">{title}</h1>
      <p className="text-[15px] text-muted">{intro}</p>
    </header>
  );
}

/** "Qualification" | "Basic SPM" for students after pre-university or diploma. */
function SectionTabs({ lang, dict, current }: { lang: Locale; dict: Dictionary; current: 'results' | 'spm' }) {
  const tabs = [
    { key: 'results', href: `/${lang}/dokumen`, label: dict.higher.sections.results },
    { key: 'spm', href: `/${lang}/dokumen?bahagian=spm`, label: dict.higher.sections.spm },
  ] as const;
  return (
    <nav aria-label={dict.higher.sectionsLabel} className="flex gap-1 self-start rounded-[12px] bg-white p-1">
      {tabs.map((tab) => (
        <Link
          key={tab.key}
          href={tab.href}
          aria-current={tab.key === current ? 'page' : undefined}
          className={`rounded-[9px] px-4 py-2 text-sm font-semibold ${tab.key === current ? 'bg-navy text-white' : 'hover:bg-bg'}`}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}

function LoadError({ text }: { text: string }) {
  return (
    <p role="alert" className="rounded-[18px] border border-line bg-white p-6 text-sm">
      {text}
    </p>
  );
}
