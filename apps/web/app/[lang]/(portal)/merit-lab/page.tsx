import Link from 'next/link';
import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { lang as rootLang } from 'next/root-params';
import { MeritLab } from '@/components/merit/merit-lab';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { isLocale, type Dictionary, type Locale } from '@/lib/i18n/locale';
import { KOKO_COOKIE, loadMeritInputs } from '@/lib/merit/student';
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
  return (
    <>
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
    </>
  );
}
