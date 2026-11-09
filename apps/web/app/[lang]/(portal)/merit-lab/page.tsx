import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { lang as rootLang } from 'next/root-params';
import { MeritLab } from '@/components/merit/merit-lab';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { isLocale, type Dictionary, type Locale } from '@/lib/i18n/locale';
import { KOKO_COOKIE, loadMeritInputs } from '@/lib/merit/student';
import { getAccessToken } from '@/lib/supabase/server';
import { Pending } from '@/components/ui/pending';

/**
 * Merit Lab (Figma W04): the student's merit from their own results, with the official formula. Form 4–5 students
 * see a target merit from their target grades; Form 1–3 students are told merit starts at Form 4.
 */
export default async function MeritLabPage() {
  const lang = await rootLang();
  if (!isLocale(lang)) notFound();
  const dict = await getDictionary(lang);
  const t = dict.meritLab;
  return (
    <>
      <p className="-mb-2 text-xs font-semibold tracking-wide text-muted">{t.eyebrow}</p>
      {/* The student's level and records are request-time data. */}
      <Pending label={dict.academic.loading} variant="form">
        <Lab locale={lang} dict={dict} />
      </Pending>
    </>
  );
}

function Header({ title, intro }: { title: string; intro: string }) {
  return (
    <header className="flex flex-col gap-3">
      <h1 className="text-[32px] font-bold leading-tight lg:text-[44px]">{title}</h1>
      <p className="text-[15px] text-muted">{intro}</p>
    </header>
  );
}

async function Lab({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  const t = dict.meritLab;
  const token = await getAccessToken();
  if (!token) notFound();
  let inputs;
  try {
    inputs = await loadMeritInputs(token, locale);
  } catch {
    return (
      <p role="alert" className="rounded-[18px] border border-line bg-white p-6 text-sm">
        {dict.academic.loadError}
      </p>
    );
  }

  // Form 1–3: no SPM subjects or stream yet, so no merit to show; point to what helps now.
  if (inputs.level === 'form1_3') {
    return (
      <>
        <Header title={t.early.title} intro={t.early.intro} />
        <section className="grid items-center gap-6 rounded-[18px] bg-white p-5 sm:p-6 md:grid-cols-[minmax(0,1fr)_200px]">
          <div className="flex flex-col gap-3">
            <h2 className="text-lg font-semibold">{t.early.nowTitle}</h2>
            <ul className="flex list-disc flex-col gap-1.5 pl-5 text-sm">
              {t.early.now.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
            <div className="flex flex-wrap gap-2 pt-1">
              <Link href={`/${locale}/penilaian-minat`} className="inline-flex h-11 items-center justify-center rounded-[12px] bg-navy px-5 text-sm font-semibold text-white transition-colors hover:bg-navy/90">
                {t.early.interest} →
              </Link>
              <Link href={`/${locale}/teroka`} className="inline-flex h-11 items-center justify-center rounded-[12px] border border-line bg-white px-5 text-sm font-semibold transition-colors hover:bg-bg">
                {t.nextAction}
              </Link>
            </div>
          </div>
          <Image src="/illustrations/rimau-calculator.png" alt="" width={200} height={200} className="mx-auto size-[160px] object-contain md:size-[200px]" />
        </section>
      </>
    );
  }

  // Form 4–5 work from target grades: say so in the title, so the number is never read as a real result.
  const target = inputs.level === 'form4_5' || inputs.basis === 'target';
  return (
    <>
      <Header title={target ? t.titleTarget : t.title} intro={target ? t.introTarget : t.intro} />
      {inputs.higherQualification === 'a_level' && <p className="rounded-[14px] bg-cream px-4 py-3 text-sm">{t.aLevel}</p>}
      <MeritLab
        mode={inputs.mode}
        basis={inputs.basis}
        subjects={inputs.subjects}
        catalogue={inputs.catalogue}
        cgpa={inputs.cgpa}
        cocurricular={inputs.cocurricular}
        cookieName={KOKO_COOKIE}
        t={t}
      />
      {inputs.basis === 'none' && (
        <p className="text-sm">
          {t.addResults}{' '}
          <Link href={`/${locale}/profil`} className="font-semibold underline underline-offset-2">
            {t.addResultsLink}
          </Link>
        </p>
      )}
      <section className="flex flex-col gap-3 rounded-[18px] bg-blue p-5 sm:p-6">
        <h2 className="text-lg font-semibold">{t.nextTitle}</h2>
        <p className="text-sm text-muted">{t.nextBody}</p>
        <Link href={`/${locale}/teroka`} className="inline-flex h-11 items-center justify-center self-start rounded-[12px] bg-navy px-5 text-sm font-semibold text-white transition-colors hover:bg-navy/90">
          {t.nextAction} →
        </Link>
      </section>
    </>
  );
}
