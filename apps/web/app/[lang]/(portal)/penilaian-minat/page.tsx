import Link from 'next/link';
import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { lang as rootLang } from 'next/root-params';
import { InterestTest } from '@/components/interests/interest-test';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { format, isLocale, type Dictionary, type Locale } from '@/lib/i18n/locale';
import { retakeInterestTest } from '@/lib/interests/actions';
import { getInterestTest, RIASEC, type InterestTest as Test, type RiasecType } from '@/lib/interests/api';
import { getAccessToken } from '@/lib/supabase/server';

/**
 * "Penilaian minat": the O*NET Mini Interest Profiler (30 activities, answered 0–4). The result (the three highest of
 * the six Holland types) is shown here and feeds recommendations. ?ulang=1 opens the test again after a result.
 */
export default async function InterestPage({ searchParams }: PageProps<'/[lang]/penilaian-minat'>) {
  const lang = await rootLang();
  if (!isLocale(lang)) notFound();
  const dict = await getDictionary(lang);
  const t = dict.interest;
  return (
    <>
      <header className="flex flex-col gap-2">
        <p className="text-xs font-semibold tracking-wide text-muted">{t.eyebrow}</p>
        <h1 className="text-[28px] font-bold leading-tight lg:text-[32px]">{t.title}</h1>
      </header>
      {/* The answers and result are request-time data. */}
      <Suspense fallback={<p className="text-sm text-muted">{dict.academic.loading}</p>}>
        <Interest lang={lang} dict={dict} searchParams={searchParams} />
      </Suspense>
      <Source t={t} />
    </>
  );
}

async function Interest({ lang, dict, searchParams }: { lang: Locale; dict: Dictionary; searchParams: PageProps<'/[lang]/penilaian-minat'>['searchParams'] }) {
  const t = dict.interest;
  const [sp, token] = await Promise.all([searchParams, getAccessToken()]);
  if (!token) notFound();
  let test: Test;
  try {
    test = await getInterestTest(token);
  } catch {
    return (
      <p role="alert" className="rounded-[18px] border border-line bg-white p-6 text-sm">
        {dict.academic.loadError}
      </p>
    );
  }
  if (test.questions.length === 0) return <p className="rounded-[18px] bg-white p-6 text-sm">{t.unavailable}</p>;

  if (test.result && sp.ulang !== '1') return <Result lang={lang} t={t} result={test.result} />;

  const questions = test.questions.map((q) => ({ id: q.id, text: lang === 'en' ? (q.textEn ?? q.text) : q.text }));
  const started = Object.keys(test.answers).length > 0;
  return (
    <>
      <section className="flex flex-col gap-2 rounded-[18px] bg-blue p-5 sm:p-6">
        <p className="font-semibold">{started ? t.continueTitle : t.introTitle}</p>
        <p className="text-sm">{t.intro}</p>
      </section>
      <InterestTest locale={lang} questions={questions} saved={test.answers} t={t.test} />
    </>
  );
}

function Result({ lang, t, result }: { lang: Locale; t: Dictionary['interest']; result: NonNullable<Test['result']> }) {
  const top = result.code.split('') as RiasecType[];
  const ordered = [...RIASEC].sort((a, b) => result.scores[b] - result.scores[a] || RIASEC.indexOf(a) - RIASEC.indexOf(b));
  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-5 rounded-[18px] bg-white p-5 sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="flex flex-col gap-1">
            <p className="text-sm text-muted">{t.result.codeLabel}</p>
            <p className="text-[44px] font-bold leading-none tracking-[0.12em]">{result.code}</p>
          </div>
          {result.completedAt && (
            <p className="text-[13px] text-muted">
              {format(t.result.completedOn, { date: result.completedAt.toLocaleDateString(lang === 'ms' ? 'ms-MY' : 'en-MY', { day: 'numeric', month: 'long', year: 'numeric' }) })}
            </p>
          )}
        </div>
        <p className="text-[15px]">{t.result.lead}</p>
        <ol className="grid gap-3 md:grid-cols-3">
          {top.map((type, i) => (
            <li key={type} className={`flex flex-col gap-2 rounded-[14px] p-4 ${i === 0 ? 'bg-navy text-white' : 'bg-bg'}`}>
              <p className={`text-[12px] font-semibold ${i === 0 ? 'text-white/70' : 'text-muted'}`}>{format(t.result.rank, { n: i + 1 })}</p>
              <p className="text-[18px] font-semibold leading-tight">
                {t.types[type].name} <span className={i === 0 ? 'text-white/70' : 'text-muted'}>({type})</span>
              </p>
              <p className={`text-sm ${i === 0 ? 'text-white/90' : ''}`}>{t.types[type].body}</p>
              <p className={`text-[13px] ${i === 0 ? 'text-white/70' : 'text-muted'}`}>
                {t.result.fieldsLabel} {t.types[type].fields}
              </p>
            </li>
          ))}
        </ol>
      </section>

      <section className="flex flex-col gap-4 rounded-[18px] bg-white p-5 sm:p-6">
        <div className="flex flex-col gap-1">
          <h2 className="text-[17px] font-semibold">{t.result.allTitle}</h2>
          <p className="text-sm text-muted">{t.result.allHint}</p>
        </div>
        <ul className="flex flex-col gap-3">
          {ordered.map((type) => (
            <li key={type} className="grid grid-cols-[120px_minmax(0,1fr)_56px] items-center gap-3 text-sm sm:grid-cols-[160px_minmax(0,1fr)_64px]">
              <span className="font-semibold">
                {t.types[type].name} <span className="text-muted">({type})</span>
              </span>
              <span className="h-2.5 overflow-hidden rounded-full bg-bg" aria-hidden>
                <span className={`block h-full rounded-full ${top.includes(type) ? 'bg-navy' : 'bg-[#a9b3c4]'}`} style={{ width: `${(result.scores[type] / 20) * 100}%` }} />
              </span>
              <span className="text-right tabular-nums">{format(t.result.scoreOf, { score: result.scores[type] })}</span>
            </li>
          ))}
        </ul>
        <p className="rounded-[12px] bg-cream px-4 py-3 text-[13px]">{t.result.note}</p>
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <Link href={`/${lang}/teroka`} className="inline-flex h-11 items-center rounded-[12px] bg-navy px-5 text-sm font-semibold text-white transition-colors hover:bg-navy/90">
          {t.result.explore} →
        </Link>
        <form action={retakeInterestTest}>
          <input type="hidden" name="locale" value={lang} />
          <button type="submit" className="h-11 rounded-[12px] border border-line bg-white px-5 text-sm font-semibold transition-colors hover:bg-bg">
            {t.result.retake}
          </button>
        </form>
        <p className="w-full text-[13px] text-muted">{t.result.retakeHint}</p>
      </div>
    </div>
  );
}

/** The credit the O*NET Tools Developer License asks for. */
function Source({ t }: { t: Dictionary['interest'] }) {
  return (
    <p className="text-[12px] leading-relaxed text-muted">
      {t.source}{' '}
      <a href="https://www.onetcenter.org/license_toolsdev.html" target="_blank" rel="noreferrer" className="underline underline-offset-2">
        O*NET Tools Developer License
      </a>
      .
    </p>
  );
}
