import Link from 'next/link';
import { notFound } from 'next/navigation';
import { lang as rootLang } from 'next/root-params';
import { pixelFont } from '@/components/interests/font';
import { InterestTest } from '@/components/interests/interest-test';
import { HERO, HERO_COLOURS, Sprite } from '@/components/interests/pixel';
import { Confetti, RetakeButton } from '@/components/interests/result-parts';
import { Pending } from '@/components/ui/pending';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { format, isLocale, type Dictionary, type Locale } from '@/lib/i18n/locale';
import { getInterestTest, RIASEC, type InterestTest as Test, type RiasecType } from '@/lib/interests/api';
import { getAccessToken } from '@/lib/supabase/server';

/**
 * "Penilaian minat" as a small pixel quest: the O*NET Mini Interest Profiler (30 activities, answered 0–4). The result
 * (the three highest of the six Holland types) is shown here and feeds recommendations. ?ulang=1 opens the test again.
 */
export default async function InterestPage({ searchParams }: PageProps<'/[lang]/penilaian-minat'>) {
  const lang = await rootLang();
  if (!isLocale(lang)) notFound();
  const dict = await getDictionary(lang);
  const t = dict.interest;
  return (
    <div className="flex flex-col gap-[22px]">
      <h1 className="sr-only">{t.title}</h1>
      {/* The answers and result are request-time data. */}
      <Pending label={dict.academic.loading} variant="panels">
        <Interest lang={lang} dict={dict} searchParams={searchParams} />
      </Pending>
      <Source t={t} />
    </div>
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

  if (test.result && sp.ulang !== '1') return <Result lang={lang} t={t} result={test.result} fresh={sp.baru === '1'} retaking={test.answeredSinceResult} total={test.questions.length} />;

  const questions = test.questions.map((q) => ({ id: q.id, text: lang === 'en' ? (q.textEn ?? q.text) : q.text }));
  return <InterestTest locale={lang} questions={questions} saved={test.answers} progress={test.progress} t={t.game} />;
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

      {/* The headline: "quest complete", the three-letter code and where the interests point. */}
      <section className={`px-frame relative grid gap-6 overflow-hidden rounded-[6px] bg-[#13224a] p-5 ${pixelFont.className} text-white sm:p-7 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-center`}>
        {fresh && <Confetti />}
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <Sprite rows={HERO} palette={HERO_COLOURS} size={40} className={fresh ? 'px-hop' : 'px-idle'} />
            <p className="text-[20px] font-bold uppercase text-yellow">{fresh ? t.result.questDone : t.result.codeLabel}</p>
          </div>
          <div className="flex gap-2">
            {top.map((x, i) => (
              <span key={x} className={`quiz-hex px-btn grid size-16 place-items-center rounded-[4px] text-[36px] font-bold sm:size-20 sm:text-[44px] ${i === 0 ? 'bg-yellow text-navy' : 'bg-[#2f5bd3]'}`} style={{ animationDelay: `${i * 90}ms` }}>
                {x}
              </span>
            ))}
          </div>
          <p className="text-[24px] font-semibold leading-snug sm:text-[28px]">{format(t.result.headline, { a: names[0]!, b: names[1]!, c: names[2]! })}</p>
          {takenOn && <p className="font-sans text-[14px] text-white/60">{format(t.result.completedOn, { date: takenOn })}</p>}
        </div>
        <Hexagon scores={result.scores} top={top} label={t.result.chartLabel} names={Object.fromEntries(RIASEC.map((x) => [x, t.types[x].name])) as Record<RiasecType, string>} />
      </section>

      {/* The three types: one line each, the fields as chips, more on request. */}
      <ol className="grid gap-3 md:grid-cols-3">
        {top.map((type, i) => (
          <li key={type} className="flex flex-col gap-3 rounded-[18px] bg-white p-5">
            <div className="flex items-center gap-3">
              <span className={`grid size-11 place-items-center rounded-[6px] ${pixelFont.className} text-[22px] font-bold ${i === 0 ? 'bg-yellow' : 'bg-blue'}`}>{type}</span>
              <div className="flex flex-col">
                <p className="text-[17px] font-semibold leading-tight">{t.types[type].name}</p>
                <p className="text-sm text-muted">{t.types[type].tagline}</p>
              </div>
            </div>
            <ul className="flex flex-wrap gap-1.5">
              {t.types[type].fields.map((f) => (
                <li key={f} className="rounded-full bg-bg px-2.5 py-1 text-[13px] font-medium">
                  {f}
                </li>
              ))}
            </ul>
            <details className="group text-sm">
              <summary className="cursor-pointer list-none font-semibold text-[#2f5bd3] [&::-webkit-details-marker]:hidden">
                {t.result.more} <span className="inline-block transition-transform group-open:rotate-90">›</span>
              </summary>
              <p className="pt-2">{t.types[type].body}</p>
            </details>
          </li>
        ))}
      </ol>

      {/* All six scores as pixel bars of 20 blocks. */}
      <section className="flex flex-col gap-3 rounded-[18px] bg-white p-5 sm:p-6">
        <h2 className="text-[17px] font-semibold">{t.result.allTitle}</h2>
        <ul className="flex flex-col gap-2.5">
          {ordered.map((type, row) => (
            <li key={type} className="grid grid-cols-[96px_minmax(0,1fr)_40px] items-center gap-3 text-sm sm:grid-cols-[150px_minmax(0,1fr)_48px]">
              <span className="truncate font-semibold">{t.types[type].name}</span>
              <span className="grid grid-cols-[repeat(20,minmax(0,1fr))] gap-[2px]" aria-hidden>
                {Array.from({ length: 20 }, (_, i) => (
                  <span
                    key={i}
                    className={`content-in h-3 ${i < result.scores[type] ? (top.includes(type) ? 'bg-navy' : 'bg-[#a9b3c4]') : 'bg-bg'}`}
                    style={{ animationDelay: `${row * 60 + i * 12}ms` }}
                  />
                ))}
              </span>
              <span className="text-right text-[15px] font-semibold tabular-nums">{result.scores[type]}</span>
            </li>
          ))}
        </ul>
        <p className="text-[13px] text-muted">{t.result.note}</p>
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
    <svg viewBox="0 0 300 300" role="img" aria-label={`${label}: ${RIASEC.map((x) => `${names[x]} ${scores[x]}`).join(', ')}`} className="mx-auto w-full max-w-[280px] font-sans">
      {[1, 0.66, 0.33].map((k) => (
        <polygon key={k} points={ring(k)} fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="2" strokeDasharray="4 4" />
      ))}
      <polygon points={shape} fill="rgba(255,216,77,0.35)" stroke="#ffd84d" strokeWidth="3" strokeLinejoin="miter" className="quiz-hex" />
      {RIASEC.map((x, i) => {
        const [px, py] = point(i, 1.24);
        return (
          <g key={x}>
            <text x={px} y={py - 2} textAnchor="middle" fontSize="20" fontWeight="700" fill={top.includes(x) ? '#ffd84d' : 'rgba(255,255,255,0.75)'}>
              {x}
            </text>
            <text x={px} y={py + 16} textAnchor="middle" fontSize="13" fill="rgba(255,255,255,0.7)">
              {scores[x]}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/** The credit the O*NET Tools Developer License asks for: one short line, the full statement on request. */
function Source({ t }: { t: Dictionary['interest'] }) {
  return (
    <details className="text-[12px] leading-relaxed text-muted">
      <summary className="cursor-pointer list-none [&::-webkit-details-marker]:hidden">{t.sourceShort}</summary>
      <p className="pt-1">
        {t.source}{' '}
        <a href="https://www.onetcenter.org/license_toolsdev.html" target="_blank" rel="noreferrer" className="underline underline-offset-2">
          O*NET Tools Developer License
        </a>
        .
      </p>
    </details>
  );
}
