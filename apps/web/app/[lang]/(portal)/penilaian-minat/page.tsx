import Link from 'next/link';
import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { lang as rootLang } from 'next/root-params';
import { InterestTest } from '@/components/interests/interest-test';
import { Confetti, RetakeButton } from '@/components/interests/result-parts';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { format, isLocale, type Dictionary, type Locale } from '@/lib/i18n/locale';
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
  const answeredNow = Object.keys(test.answers).length;

  if (test.result && sp.ulang !== '1') return <Result lang={lang} t={t} result={test.result} fresh={sp.baru === '1'} retaking={test.answeredSinceResult} total={test.questions.length} />;

  const questions = test.questions.map((q) => ({ id: q.id, text: lang === 'en' ? (q.textEn ?? q.text) : q.text }));
  return (
    <>
      {answeredNow === 0 && (
        <section className="flex flex-col gap-1 rounded-[18px] bg-blue p-5">
          <p className="font-semibold">{t.introTitle}</p>
          <p className="text-sm">{t.intro}</p>
        </section>
      )}
      <InterestTest locale={lang} questions={questions} saved={test.answers} progress={test.progress} t={t.test} />
    </>
  );
}

function Result({ lang, t, result, fresh, retaking, total }: { lang: Locale; t: Dictionary['interest']; result: NonNullable<Test['result']>; fresh: boolean; retaking: number; total: number }) {
  const top = result.code.split('') as RiasecType[];
  const ordered = [...RIASEC].sort((a, b) => result.scores[b] - result.scores[a] || RIASEC.indexOf(a) - RIASEC.indexOf(b));
  const takenOn = result.completedAt ? result.completedAt.toLocaleDateString(lang === 'ms' ? 'ms-MY' : 'en-MY', { day: 'numeric', month: 'long', year: 'numeric' }) : null;
  const names = top.map((x) => t.types[x].name);
  return (
    <div className="flex flex-col gap-5">
      {retaking > 0 && (
        <div role="status" className="flex flex-col gap-3 rounded-[18px] bg-cream p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm">
            <span className="font-semibold">{t.result.retakingTitle}</span> {format(t.result.retakingBody, { count: retaking, total })}
          </p>
          <Link href={`/${lang}/penilaian-minat?ulang=1`} className="inline-flex h-10 shrink-0 items-center self-start rounded-[10px] bg-navy px-4 text-sm font-semibold text-white hover:bg-navy/90 sm:self-center">
            {t.result.retakingAction} →
          </Link>
        </div>
      )}

      {/* The headline: where the student's interests point, with the three-letter code. */}
      <section className="relative grid gap-6 overflow-hidden rounded-[22px] bg-navy p-5 text-white sm:p-7 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-center">
        {fresh && <Confetti />}
        <div className="flex flex-col gap-4">
          <p className="text-sm text-white/70">{fresh ? t.result.freshLabel : t.result.codeLabel}</p>
          <div className="flex gap-2">
            {top.map((x, i) => (
              <span key={x} className={`quiz-hex grid size-16 place-items-center rounded-[16px] text-[32px] font-bold sm:size-20 sm:text-[40px] ${i === 0 ? 'bg-yellow text-navy' : 'bg-white/10'}`} style={{ animationDelay: `${i * 90}ms` }}>
                {x}
              </span>
            ))}
          </div>
          <p className="text-[20px] font-semibold leading-snug sm:text-[24px]">{format(t.result.headline, { a: names[0]!, b: names[1]!, c: names[2]! })}</p>
          <p className="text-sm text-white/80">{t.result.lead}</p>
          {takenOn && <p className="text-[13px] text-white/60">{format(t.result.completedOn, { date: takenOn })}</p>}
        </div>
        <Hexagon scores={result.scores} top={top} names={Object.fromEntries(RIASEC.map((x) => [x, t.types[x].name])) as Record<RiasecType, string>} label={t.result.chartLabel} />
      </section>

      <ol className="grid gap-3 md:grid-cols-3">
        {top.map((type, i) => (
          <li key={type} className="flex flex-col gap-2 rounded-[18px] bg-white p-5">
            <div className="flex items-center gap-3">
              <span className={`grid size-10 place-items-center rounded-[12px] text-lg font-bold ${i === 0 ? 'bg-yellow' : 'bg-blue'}`}>{type}</span>
              <div className="flex flex-col">
                <p className="text-[12px] font-semibold text-muted">{format(t.result.rank, { n: i + 1 })}</p>
                <p className="text-[17px] font-semibold leading-tight">{t.types[type].name}</p>
              </div>
            </div>
            <p className="text-sm">{t.types[type].body}</p>
            <p className="mt-auto border-t border-line pt-2 text-[13px] text-muted">
              {t.result.fieldsLabel} {t.types[type].fields}
            </p>
          </li>
        ))}
      </ol>

      <section className="flex flex-col gap-4 rounded-[18px] bg-white p-5 sm:p-6">
        <div className="flex flex-col gap-1">
          <h2 className="text-[17px] font-semibold">{t.result.allTitle}</h2>
          <p className="text-sm text-muted">{t.result.allHint}</p>
        </div>
        <ul className="flex flex-col gap-3">
          {ordered.map((type, i) => (
            <li key={type} className="grid grid-cols-[112px_minmax(0,1fr)_48px] items-center gap-3 text-sm sm:grid-cols-[160px_minmax(0,1fr)_56px]">
              <span className="truncate font-semibold">
                {t.types[type].name} <span className="text-muted">({type})</span>
              </span>
              <span className="h-2.5 overflow-hidden rounded-full bg-bg" aria-hidden>
                <span
                  className={`quiz-grow block h-full w-full origin-left rounded-full ${top.includes(type) ? 'bg-navy' : 'bg-[#a9b3c4]'}`}
                  style={{ transform: `scaleX(${result.scores[type] / 20})`, animationDelay: `${i * 60}ms` }}
                />
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
        <RetakeButton locale={lang} t={t.result} takenOn={takenOn} />
      </div>
    </div>
  );
}

/** The six types on Holland's hexagon (R-I-A-S-E-C round the edge), the student's scores as a shape inside it. */
function Hexagon({ scores, top, names, label }: { scores: Record<RiasecType, number>; top: RiasecType[]; names: Record<RiasecType, string>; label: string }) {
  const c = 150;
  const r = 96;
  const point = (i: number, k: number) => {
    const angle = -Math.PI / 2 + (i * Math.PI) / 3;
    return [c + Math.cos(angle) * r * k, c + Math.sin(angle) * r * k] as const;
  };
  const ring = (k: number) => RIASEC.map((_, i) => point(i, k).join(',')).join(' ');
  const shape = RIASEC.map((x, i) => point(i, Math.max(0.04, scores[x] / 20)).join(',')).join(' ');
  return (
    <svg viewBox="0 0 300 300" role="img" aria-label={`${label}: ${RIASEC.map((x) => `${names[x]} ${scores[x]}`).join(', ')}`} className="mx-auto w-full max-w-[300px]">
      {[1, 0.66, 0.33].map((k) => (
        <polygon key={k} points={ring(k)} fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="1" />
      ))}
      {RIASEC.map((_, i) => {
        const [x, y] = point(i, 1);
        return <line key={i} x1={c} y1={c} x2={x} y2={y} stroke="rgba(255,255,255,0.12)" />;
      })}
      <polygon points={shape} fill="rgba(255,216,77,0.35)" stroke="#ffd84d" strokeWidth="2.5" strokeLinejoin="round" className="quiz-hex" />
      {RIASEC.map((x, i) => {
        const [px, py] = point(i, 1.24);
        const strong = top.includes(x);
        return (
          <g key={x}>
            <text x={px} y={py - 4} textAnchor="middle" fontSize="16" fontWeight="700" fill={strong ? '#ffd84d' : 'rgba(255,255,255,0.75)'}>
              {x}
            </text>
            <text x={px} y={py + 12} textAnchor="middle" fontSize="11" fill="rgba(255,255,255,0.7)">
              {scores[x]}
            </text>
          </g>
        );
      })}
    </svg>
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
