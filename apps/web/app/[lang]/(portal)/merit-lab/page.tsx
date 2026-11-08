import Link from 'next/link';
import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { lang as rootLang } from 'next/root-params';
import { MeritLab, type LabSubject } from '@/components/merit/merit-lab';
import { getReferenceData, localName } from '@/lib/catalogue/api';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { isLocale, type Dictionary, type Locale } from '@/lib/i18n/locale';
import { getMe, listRecords, type AcademicRecord } from '@/lib/profile/api';
import { getAccessToken } from '@/lib/supabase/server';

/** Merit Lab (Figma W04): the student's merit from their own results, worked out with the official formula. */
export default async function MeritLabPage() {
  const lang = await rootLang();
  if (!isLocale(lang)) notFound();
  const dict = await getDictionary(lang);
  const t = dict.meritLab;
  return (
    <>
      <header className="flex flex-col gap-3">
        <p className="text-xs font-semibold tracking-wide text-muted">{t.eyebrow}</p>
        <h1 className="text-[32px] font-bold leading-tight lg:text-[44px]">{t.title}</h1>
        <p className="text-[15px] text-muted">{t.intro}</p>
      </header>
      {/* The student's records are request-time data. */}
      <Suspense fallback={<p className="text-sm text-muted">{dict.academic.loading}</p>}>
        <Lab locale={lang} dict={dict} />
      </Suspense>
      <section className="flex flex-col gap-3 rounded-[18px] bg-blue p-5 sm:p-6">
        <h2 className="text-lg font-semibold">{t.nextTitle}</h2>
        <p className="text-sm text-muted">{t.nextBody}</p>
        <Link href={`/${lang}/teroka`} className="inline-flex h-11 items-center justify-center self-start rounded-[12px] bg-navy px-5 text-sm font-semibold text-white transition-colors hover:bg-navy/90">
          {t.nextAction} →
        </Link>
      </section>
    </>
  );
}

const CGPA_ROUTES = ['stpm', 'matriculation', 'foundation'];
const DIPLOMA_ROUTES = ['diploma', 'dvm', 'dkm'];

async function Lab({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  const t = dict.meritLab;
  const token = await getAccessToken();
  if (!token) notFound();
  let me, records: AcademicRecord[], reference;
  try {
    [me, records, reference] = await Promise.all([getMe(token), listRecords(token), getReferenceData()]);
  } catch {
    return (
      <p role="alert" className="rounded-[18px] border border-line bg-white p-6 text-sm">
        {dict.academic.loadError}
      </p>
    );
  }

  // After pre-university or a diploma, the merit comes from the CGPA of that qualification.
  const higher = me.higherQualification;
  const higherRecord = higher ? records.find((r) => r.qualification === higher) : undefined;
  if (higher && (CGPA_ROUTES.includes(higher) || DIPLOMA_ROUTES.includes(higher))) {
    return (
      <MeritLab
        mode={DIPLOMA_ROUTES.includes(higher) ? 'diploma' : 'cgpa'}
        basis={higherRecord?.cgpa != null ? 'actual' : 'none'}
        subjects={[]}
        catalogue={[]}
        cgpa={higherRecord?.cgpa ?? null}
        t={t}
      />
    );
  }

  // Otherwise SPM: actual results when there are any, else the Form 4–5 targets.
  const spmSubjects = reference.subjects.filter((s) => s.qualification === 'spm');
  const byId = new Map(spmSubjects.map((s) => [s.id, s]));
  const actual = records.find((r) => r.qualification === 'spm' && r.kind === 'actual');
  const target = records.find((r) => r.qualification === 'spm' && r.kind === 'target');
  const record = actual ?? target;
  const subjects = (record?.subjects ?? []).flatMap((s) => {
    const subject = byId.get(s.subjectId);
    return subject ? [{ name: subject.name, label: localName(subject, locale), grade: s.grade }] : [];
  });
  const catalogue: LabSubject[] = spmSubjects.map((s) => ({ name: s.name, label: localName(s, locale) })).sort((a, b) => a.label.localeCompare(b.label, locale));

  return (
    <>
      {higher === 'a_level' && <p className="rounded-[14px] bg-cream px-4 py-3 text-sm">{t.aLevel}</p>}
      <MeritLab mode="spm" basis={actual ? 'actual' : target ? 'target' : 'none'} subjects={subjects} catalogue={catalogue} cgpa={null} t={t} />
      {!record && (
        <p className="text-sm">
          {t.addResults}{' '}
          <Link href={`/${locale}/profil`} className="font-semibold underline underline-offset-2">
            {t.addResultsLink}
          </Link>
        </p>
      )}
    </>
  );
}
