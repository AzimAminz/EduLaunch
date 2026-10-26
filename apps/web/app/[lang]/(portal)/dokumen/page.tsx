import Image from 'next/image';
import Link from 'next/link';
import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { lang as rootLang } from 'next/root-params';
import { SubjectTable } from '@/components/academic/subject-table';
import { getReferenceData, localName } from '@/lib/catalogue/api';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { isLocale, type Dictionary, type Locale } from '@/lib/i18n/locale';
import { getCurrentRecord, getMe } from '@/lib/profile/api';
import { examYearsFor, gradesFor, recordFormFor, sortRows, startingRows, type RecordVariant } from '@/lib/profile/records';
import { getAccessToken } from '@/lib/supabase/server';

const SIDE_IMAGE: Record<RecordVariant, string> = {
  school: '/illustrations/rimau-waving.png',
  target: '/illustrations/rimau-compass.png',
  actual: '/illustrations/rimau-shield.png',
  basic: '/illustrations/rimau-shield.png',
};

/** "Dokumen akademik": the results form for the student's education level (Figma: Profil akademik · …). */
export default async function AcademicPage() {
  const lang = await rootLang();
  if (!isLocale(lang)) notFound();
  const dict = await getDictionary(lang);
  return (
    // The student's level and results are request-time data.
    <Suspense fallback={<p className="text-sm text-muted">{dict.academic.loading}</p>}>
      <Academic lang={lang} dict={dict} />
    </Suspense>
  );
}

/** Loads what the form needs: the level, the saved record of that level's kind, and the subject list. */
async function loadAcademic(token: string) {
  try {
    const me = await getMe(token);
    if (!me.educationLevel) return { state: 'noLevel' as const };
    const form = recordFormFor(me.educationLevel);
    const [record, reference] = await Promise.all([getCurrentRecord(token, form.qualification, form.kind), getReferenceData()]);
    return { state: 'ready' as const, form, record, reference, level: me.educationLevel };
  } catch {
    return { state: 'error' as const };
  }
}

async function Academic({ lang, dict }: { lang: Locale; dict: Dictionary }) {
  const t = dict.academic;
  const token = await getAccessToken();
  if (!token) notFound();

  const data = await loadAcademic(token);
  if (data.state === 'error') {
    return (
      <p role="alert" className="rounded-[18px] border border-line bg-white p-6 text-sm">
        {t.loadError}
      </p>
    );
  }
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

  const { form, record, reference, level } = data;
  const subjects = reference.subjects
    .filter((s) => s.qualification === form.qualification)
    .map((s) => ({ id: s.id, name: localName(s, lang), category: s.category, isMandatory: s.isMandatory }));
  const rows = record ? sortRows(record.subjects.map((s) => ({ subjectId: s.subjectId, grade: s.grade })), subjects, lang) : startingRows(subjects, lang);
  const status = record ? t.status[record.status] : t.status.none;

  return (
    <>
      <header className="flex flex-col gap-3">
        <p className="text-xs font-semibold tracking-wide text-muted">
          {t.eyebrow} · {dict.onboarding.levels[level].title.toLocaleUpperCase(lang)}
        </p>
        <h1 className="text-[32px] font-bold leading-tight lg:text-[44px]">{t.titles[form.variant]}</h1>
        <p className="text-[15px] text-muted">{t.intros[form.variant]}</p>
      </header>
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <section className="flex flex-col gap-4 rounded-[18px] bg-white p-5 sm:p-6">
          <p className="self-start rounded-full bg-bg px-3 py-1 text-xs font-semibold">{status}</p>
          <SubjectTable
            locale={lang}
            variant={form.variant}
            t={t}
            subjects={subjects}
            grades={gradesFor(form.qualification)}
            years={examYearsFor(form, new Date().getFullYear())}
            initialYear={record?.examYear ?? null}
            initialRows={rows}
          />
        </section>
        <aside className="hidden flex-col gap-3 rounded-[18px] bg-blue p-6 lg:flex">
          <Image src={SIDE_IMAGE[form.variant]} alt="" width={180} height={180} loading="eager" className="size-[180px] object-contain" />
          <p className="text-lg font-semibold">{t.sideTitle[form.variant]}</p>
          <p className="text-sm text-muted">{t.sideBody[form.variant]}</p>
        </aside>
      </div>
    </>
  );
}
