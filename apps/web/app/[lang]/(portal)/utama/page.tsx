import Image from 'next/image';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { notFound } from 'next/navigation';
import { lang as rootLang } from 'next/root-params';
import { Pending } from '@/components/ui/pending';
import { getProgramme, getReferenceData } from '@/lib/catalogue/api';
import { listNotifications, type Notification } from '@/lib/engagement/api';
import { dayPart, nextStep, type NextStep } from '@/lib/home/next-step';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { format, isLocale, type Dictionary, type Locale } from '@/lib/i18n/locale';
import { getInterestTest, type RiasecType } from '@/lib/interests/api';
import { compareMerit } from '@/lib/merit/compare';
import { loadMeritInputs, studentMerit } from '@/lib/merit/student';
import { getMe, listRecords, listSavedProgrammes } from '@/lib/profile/api';
import { getRecommendations, type Recommendation } from '@/lib/recommendation/api';
import { CHANCE_LEVEL, MATCH_STYLE, matchOf } from '@/lib/recommendation/present';
import { getAccessToken, getAccount } from '@/lib/supabase/server';

type Reference = Awaited<ReturnType<typeof getReferenceData>>;
type T = Dictionary['home'];

/**
 * The student home (Figma: W02 / Dashboard pelajar, W / Dashboard · Tingkatan 1–3): a greeting, the best matches
 * (or, in Form 1–3, the Form 4 streams), the one step that unlocks the most, the merit, interests and results at a
 * glance, saved programmes and the latest notices. Every block reads real data and drops out quietly if its
 * service does not answer, so one failure never blanks the page.
 */
export default async function HomePage() {
  const lang = await rootLang();
  if (!isLocale(lang)) notFound();
  const dict = await getDictionary(lang);
  return (
    <Pending label={dict.home.loading} variant="panels">
      <Home lang={lang} dict={dict} />
    </Pending>
  );
}

async function Home({ lang, dict }: { lang: Locale; dict: Dictionary }) {
  const t = dict.home;
  const [account, token] = await Promise.all([getAccount(), getAccessToken()]);
  if (!account || !token) notFound();

  const [me, records, interest, merit, recs, saved, notices, reference] = await Promise.all([
    getMe(token).catch(() => null),
    listRecords(token).catch(() => []),
    getInterestTest(token).catch(() => null),
    loadMeritInputs(token, lang).catch(() => null),
    getRecommendations(token).catch(() => null),
    listSavedProgrammes(token).catch(() => []),
    listNotifications(token).catch(() => null),
    getReferenceData().catch(() => null),
  ]);

  const level = me?.educationLevel ?? null;
  const school = level === 'form1_3';
  const items = recs?.items ?? [];
  const hasResults = school ? records.some((r) => r.qualification === 'school') : merit !== null && merit.basis !== 'none';
  // Most programmes after pre-university or a certificate still check SPM grades.
  const spmMissing = (level === 'after_preu' || level === 'after_certificate') && !records.some((r) => r.qualification === 'spm' && r.kind === 'actual');
  const step = nextStep({
    level,
    hasResults,
    spmMissing,
    interest: { done: Boolean(interest?.result), answered: interest ? Object.keys(interest.answers).length : 0, total: interest?.questions.length ?? 30 },
    savedCount: saved.length,
    recommendationCount: items.length,
  });

  // Names of programmes that are not in the student's list (saved ones, notices), looked up once each.
  const known = new Map(items.map((i) => [i.programId, { name: i.programName, institutionId: i.details.institutionId }]));
  const lookups = [...new Set([...saved.slice(0, 3).map((s) => s.programId), ...(notices ?? []).slice(0, 3).flatMap((n) => (n.programId ? [n.programId] : []))])].filter((id) => !known.has(id));
  const fetched = await Promise.all(lookups.map((id) => getProgramme(id).then((p) => [id, { name: p.name, institutionId: p.institutionId }] as const).catch(() => null)));
  for (const f of fetched) if (f) known.set(f[0], f[1]);

  const firstName = (account.name ?? '').trim().split(/\s+/)[0] || null;
  const greeting = t.greeting[dayPart(new Date())];
  const levelText = !level
    ? null
    : me?.formYear
      ? format(dict.onboarding.levels.form1_3.short, { form: me.formYear })
      : me?.higherQualification
        ? format(t.after, { name: dict.higher.shortNames[me.higherQualification] })
        : dict.onboarding.levels[level].title;
  const basis = merit?.basis === 'target' ? t.basis.target : merit?.basis === 'actual' ? t.basis.actual : null;
  const myMerit = merit ? studentMerit(merit) : null;
  const code = (interest?.result?.code.split('') ?? []) as RiasecType[];
  const unread = notices?.filter((n) => !n.readAt).length ?? 0;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1.5">
        {levelText && <p className="text-xs font-semibold uppercase tracking-wide text-muted">{levelText}</p>}
        <h1 className="text-[28px] font-bold leading-tight lg:text-[36px]">{firstName ? format(t.greetingName, { greeting, name: firstName }) : greeting}</h1>
        <p className="text-[15px] text-muted">{school ? t.leadSchool : basis ? format(t.lead, { basis }) : t.leadEmpty}</p>
      </header>

      {school ? (
        <SchoolHome lang={lang} dict={dict} items={items} interestDone={Boolean(interest?.result)} code={code} hasResults={hasResults} step={step} />
      ) : (
        <>
          <TopMatches lang={lang} dict={dict} items={items} reference={reference} merit={merit && myMerit !== null ? { mode: merit.mode, merit: myMerit } : null} generatedAt={recs?.generatedAt ?? null} basis={basis} hasResults={hasResults} spmMissing={spmMissing} />
          {/* The SPM step is already the headline when no programme can be reached without it. */}
          {step && !(step.kind === 'spm' && items.length > 0 && items.every((i) => i.eligibility === 'not_yet')) && <StepBanner lang={lang} t={t} step={step} />}
          <div className="grid gap-4 md:grid-cols-3">
            <Glance title={t.merit.title} href={`/${lang}/merit-lab`} action={t.merit.action}>
              {myMerit !== null ? (
                <>
                  <p className="text-[36px] font-bold leading-none tabular-nums">{myMerit.toFixed(2)}</p>
                  <p className="text-[13px] text-muted">{merit?.basis === 'target' ? t.merit.target : t.merit.actual}</p>
                </>
              ) : (
                <p className="text-sm text-muted">{t.merit.none}</p>
              )}
            </Glance>
            <Glance title={t.interest.title} href={`/${lang}/penilaian-minat`} action={code.length ? t.interest.view : t.interest.take}>
              {code.length ? (
                <>
                  <p className="text-[36px] font-bold leading-none tracking-[0.12em]">{code.join('')}</p>
                  <p className="text-[13px] text-muted">{code.map((x) => dict.interest.types[x].name).join(' · ')}</p>
                </>
              ) : (
                <p className="text-sm text-muted">{t.interest.none}</p>
              )}
            </Glance>
            <Glance title={t.results.title} href={`/${lang}/dokumen`} action={hasResults ? t.results.update : t.results.fill}>
              <p className="text-[17px] font-semibold">{!hasResults ? t.results.missing : merit?.basis === 'target' ? t.results.target : t.results.actual}</p>
              {spmMissing && <p className="text-[13px] font-semibold text-[#8a6100]">{t.results.spmMissing}</p>}
              <p className="text-[13px] text-muted">{format(t.results.count, { count: records.length })}</p>
            </Glance>
          </div>
        </>
      )}

      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
        <Saved lang={lang} t={t} saved={saved} items={items} known={known} reference={reference} dict={dict} />
        <Updates lang={lang} t={t} notices={notices} unread={unread} known={known} />
      </div>
    </div>
  );
}

/** The best match, with what it rests on, and the next two strong options. */
function TopMatches(props: {
  lang: Locale;
  dict: Dictionary;
  items: Recommendation[];
  reference: Reference | null;
  merit: { mode: Parameters<typeof compareMerit>[0]['mode']; merit: number } | null;
  generatedAt: Date | null;
  basis: string | null;
  hasResults: boolean;
  spmMissing: boolean;
}) {
  const { lang, dict, items, reference, merit, generatedAt, basis, hasResults, spmMissing } = props;
  const t = dict.home;
  // The best match the student can get into (eligible, else almost); never a programme they cannot get into yet.
  const top = items.find((i) => i.eligibility === 'eligible' && i.isTopMatch) ?? items.find((i) => i.eligibility === 'eligible') ?? items.find((i) => i.eligibility === 'almost');
  const institutionName = (id: string | null) => reference?.institutions.find((i) => i.id === id)?.name ?? dict.recommendations.streamProvider;
  if (!top && items.length > 0)
    return (
      <section aria-labelledby="top-title" className="flex flex-col gap-3 rounded-[22px] bg-navy p-6 text-white sm:p-7">
        <h2 id="top-title" className="text-[22px] font-bold">
          {t.top.titleNotYet}
        </h2>
        <p className="max-w-[640px] text-sm text-white/80">{spmMissing ? t.top.notYetSpm : t.top.notYetBody}</p>
        <div className="flex flex-wrap gap-2">
          <Link href={spmMissing ? `/${lang}/dokumen?bahagian=spm` : `/${lang}/cadangan`} className="inline-flex h-11 items-center rounded-[12px] bg-yellow px-5 text-sm font-semibold text-navy hover:brightness-95">
            {spmMissing ? t.top.fillSpm : t.top.seeWhy} →
          </Link>
        </div>
        <p className="pt-2 text-[13px] font-semibold text-yellow">{t.top.closest}</p>
        <ul className="grid gap-2 md:grid-cols-3">
          {items.slice(0, 3).map((o) => (
            <li key={o.programId}>
              <Link href={`/${lang}/teroka/${o.programId}`} className="flex h-full flex-col rounded-[14px] bg-white/10 px-4 py-3 transition-colors hover:bg-white/15">
                <span className="font-semibold leading-snug">{o.programName}</span>
                <span className="text-[13px] text-white/70">{institutionName(o.details.institutionId)}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    );
  if (!top)
    return (
      <section className="flex flex-col gap-2 rounded-[22px] bg-navy p-6 text-white sm:p-7">
        <h2 className="text-[22px] font-bold">{t.top.title}</h2>
        <p className="text-sm text-white/80">{hasResults ? t.top.empty : t.top.noResults}</p>
        <Link href={hasResults ? `/${lang}/teroka` : `/${lang}/dokumen`} className="mt-2 inline-flex h-11 items-center self-start rounded-[12px] bg-yellow px-5 text-sm font-semibold text-navy hover:brightness-95">
          {hasResults ? t.top.explore : t.top.fillResults} →
        </Link>
      </section>
    );
  // Other strong options: also ones the student can get into.
  const others = items.filter((i) => i.programId !== top.programId && i.eligibility !== 'not_yet').slice(0, 2);
  const institution = institutionName;
  const d = top.details;
  const years = d.durationSemesters ? format(dict.recommendations.years, { n: d.durationSemesters / 2 }) : null;
  const subtitle = [institution(d.institutionId), (dict.levels as Record<string, string>)[d.studyLevel] ?? d.studyLevel, years].filter(Boolean).join(' · ');
  const comparison = merit ? compareMerit(merit, { entryRoutes: d.entryRoutes, averageMerit: d.averageMerit }) : null;
  const chance = comparison?.status === 'comparable' ? CHANCE_LEVEL[comparison.band] : null;
  const match = matchOf(top.score);
  // Why it is suggested, in a few lines, from what the list worked out (never invented).
  const reasons = [
    top.eligibility === 'eligible' ? t.top.reasonEligible : top.eligibility === 'almost' ? format(t.top.reasonAlmost, { count: d.unmet.length }) : null,
    d.interest && d.interest.sharedTypes.length ? format(t.top.reasonInterest, { types: d.interest.sharedTypes.map((x) => dict.interest.types[x].name).join(' & ') }) : null,
    d.continuity && d.continuity.fieldMatch && d.continuity.fieldMatch !== 'none' && d.continuity.name ? format(t.top.reasonContinuity, { name: d.continuity.name }) : null,
  ].filter((r): r is string => Boolean(r));
  const updated = generatedAt ? generatedAt.toLocaleDateString(lang === 'ms' ? 'ms-MY' : 'en-MY', { day: 'numeric', month: 'short' }) : null;

  return (
    <section aria-labelledby="top-title" className="grid grid-cols-[minmax(0,1fr)] gap-5 rounded-[22px] bg-navy p-5 text-white sm:p-7 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="flex flex-col gap-4 lg:col-span-2">
        {(updated || basis) && (
          <p className="self-start rounded-full bg-yellow px-3 py-1 text-[12px] font-semibold text-navy">{[updated && format(t.top.updated, { date: updated }), basis].filter(Boolean).join(' · ')}</p>
        )}
        <h2 id="top-title" className="text-[24px] font-bold leading-tight">
          {t.top.title}
        </h2>
      </div>

      <article className="flex min-w-0 flex-col gap-3 rounded-[18px] bg-white p-5 text-navy">
        <div className="flex flex-wrap gap-2">
          {top.isTopMatch && <span className="rounded-full bg-yellow px-2.5 py-1 text-[12px] font-semibold">★ {dict.recommendations.topMatch}</span>}
          <span className={`rounded-full px-2.5 py-1 text-[12px] font-semibold ${MATCH_STYLE[match].badge}`}>{dict.recommendations.match[match]}</span>
          <span className="rounded-full bg-bg px-2.5 py-1 text-[12px] font-semibold">{dict.recommendations.status[top.eligibility]}</span>
          {chance && (
            <span className="rounded-full bg-bg px-2.5 py-1 text-[12px] font-semibold">
              {dict.recommendations.chance.label}: {dict.recommendations.chance[chance]}
            </span>
          )}
        </div>
        <div>
          <h3 className="text-[20px] font-bold leading-snug">{top.programName}</h3>
          <p className="text-sm text-muted">{subtitle}</p>
        </div>
        {reasons.length > 0 && (
          <ul className="flex flex-col gap-1.5 text-sm">
            {reasons.map((r) => (
              <li key={r} className="flex gap-2">
                <span aria-hidden className="text-[#1f8a5b]">
                  ✓
                </span>
                {r}
              </li>
            ))}
          </ul>
        )}
        <Link href={`/${lang}/teroka/${top.programId}`} className="mt-1 inline-flex h-11 items-center justify-center rounded-[12px] bg-navy px-5 text-sm font-semibold text-white hover:bg-navy/90">
          {t.top.view} →
        </Link>
      </article>

      <div className="flex min-w-0 flex-col gap-3">
        {others.length > 0 && <p className="text-[13px] font-semibold text-yellow">{t.top.others}</p>}
        {others.map((o) => (
          <Link key={o.programId} href={`/${lang}/teroka/${o.programId}`} className="flex items-center justify-between gap-3 rounded-[14px] bg-white/10 px-4 py-3 transition-colors hover:bg-white/15">
            <span className="flex min-w-0 flex-col">
              <span className="truncate font-semibold">{o.programName}</span>
              <span className="truncate text-[13px] text-white/70">{institution(o.details.institutionId)}</span>
            </span>
            <span className={`shrink-0 rounded-full px-2.5 py-1 text-[12px] font-semibold ${o.eligibility === 'eligible' ? 'bg-mint text-[#145c3b]' : o.eligibility === 'almost' ? 'bg-cream text-[#7a4f06]' : 'bg-white/20'}`}>
              {dict.recommendations.status[o.eligibility]}
            </span>
          </Link>
        ))}
        <Link href={`/${lang}/cadangan`} className="mt-auto inline-flex h-11 items-center justify-center rounded-[12px] bg-yellow px-5 text-sm font-semibold text-navy hover:brightness-95">
          {format(t.top.all, { count: items.length })} →
        </Link>
      </div>
    </section>
  );
}

/** Form 1–3: the Form 4 streams that suit the student's interests, and their progress so far. */
function SchoolHome({ lang, dict, items, interestDone, code, hasResults, step }: { lang: Locale; dict: Dictionary; items: Recommendation[]; interestDone: boolean; code: RiasecType[]; hasResults: boolean; step: NextStep }) {
  const t = dict.home;
  // Choosing a Form 4 stream rests on interests: the streams by how well they fit them, labelled by that fit (the
  // overall score also counts school results, which a Form 3 student may not have entered yet).
  const streams = [...items].sort((a, b) => (b.details.interest?.fit ?? -1) - (a.details.interest?.fit ?? -1)).slice(0, 4);
  const FIT_STYLE = { high: MATCH_STYLE.strong.badge, medium: MATCH_STYLE.fair.badge, low: MATCH_STYLE.weak.badge } as const;
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
      <section aria-labelledby="streams-title" className="flex flex-col gap-4 rounded-[22px] bg-white p-5 sm:p-6">
        <div className="flex flex-col gap-1">
          <h2 id="streams-title" className="text-[20px] font-bold">
            {t.school.title}
          </h2>
          <p className="text-sm text-muted">{interestDone ? t.school.lead : t.school.leadNoInterest}</p>
        </div>
        {interestDone && streams.length > 0 ? (
          <ul className="grid gap-3 sm:grid-cols-2">
            {streams.map((s, i) => {
              const fit = s.details.interest?.level;
              return (
                <li key={s.programId}>
                  <Link href={`/${lang}/teroka/${s.programId}`} className="flex h-full flex-col gap-2 rounded-[16px] bg-bg p-4 transition-colors hover:bg-blue">
                    <span className="flex flex-wrap gap-1.5">
                      {i === 0 && <span className="rounded-full bg-yellow px-2.5 py-1 text-[12px] font-semibold">★ {t.school.best}</span>}
                      {fit && <span className={`rounded-full px-2.5 py-1 text-[12px] font-semibold ${FIT_STYLE[fit]}`}>{format(t.school.fit, { level: dict.recommendations.levels[fit] })}</span>}
                    </span>
                    <span className="font-semibold leading-snug">{s.programName}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : (
          step?.kind === 'interest' && <StepBanner lang={lang} t={t} step={step} compact />
        )}
        <div className="flex flex-wrap gap-2">
          <Link href={`/${lang}/cadangan`} className="inline-flex h-11 items-center rounded-[12px] bg-navy px-5 text-sm font-semibold text-white hover:bg-navy/90">
            {t.school.all}
          </Link>
          {interestDone && (
            <Link href={`/${lang}/penilaian-minat`} className="inline-flex h-11 items-center rounded-[12px] border border-line bg-white px-5 text-sm font-semibold hover:bg-bg">
              {format(t.school.interest, { code: code.join('') })}
            </Link>
          )}
        </div>
        <p className="rounded-[12px] bg-cream px-4 py-3 text-[13px]">{t.school.note}</p>
      </section>

      <aside className="flex flex-col gap-3 rounded-[22px] bg-blue p-5">
        <Image src="/illustrations/rimau-compass.png" alt="" width={140} height={140} className="self-center" />
        <h2 className="text-[17px] font-semibold">{t.school.progress}</h2>
        <ul className="flex flex-col gap-2 text-sm">
          <Check done={interestDone}>{interestDone ? t.school.interestDone : t.school.interestTodo}</Check>
          <Check done={hasResults}>{hasResults ? t.school.resultsDone : t.school.resultsTodo}</Check>
        </ul>
        {!hasResults && (
          <Link href={`/${lang}/dokumen`} className="inline-flex h-11 items-center justify-center rounded-[12px] bg-white px-5 text-sm font-semibold hover:bg-bg">
            {t.school.fillResults}
          </Link>
        )}
      </aside>
    </div>
  );
}

function Check({ done, children }: { done: boolean; children: ReactNode }) {
  return (
    <li className={`flex gap-2 ${done ? '' : 'text-muted'}`}>
      <span aria-hidden className={done ? 'text-[#1f8a5b]' : ''}>
        {done ? '✓' : '–'}
      </span>
      {children}
    </li>
  );
}

/** The one step that unlocks the most, with Rimau beside it. */
function StepBanner({ lang, t, step, compact }: { lang: Locale; t: T; step: NonNullable<NextStep>; compact?: boolean }) {
  const copy = t.steps[step.kind];
  const href = step.kind === 'level' ? `/${lang}/profil#tahap` : step.kind === 'results' ? `/${lang}/dokumen` : step.kind === 'spm' ? `/${lang}/dokumen?bahagian=spm` : step.kind === 'interest' ? `/${lang}/penilaian-minat` : `/${lang}/cadangan`;
  const started = step.kind === 'interest' && step.answered > 0;
  const body = step.kind === 'interest' && started ? format(t.steps.interest.bodyStarted, { left: step.total - step.answered }) : copy.body;
  const action = started ? t.steps.interest.continue : copy.action;
  return (
    <section className={`relative flex flex-col gap-3 overflow-hidden rounded-[22px] ${compact ? 'bg-bg p-5' : 'bg-navy p-6 text-white sm:p-7 sm:pr-48'}`}>
      <p className={`text-[13px] font-semibold ${compact ? 'text-[#2f5bd3]' : 'text-yellow'}`}>{t.steps.label}</p>
      <h2 className="text-[22px] font-bold leading-tight">{copy.title}</h2>
      <p className={`text-sm ${compact ? 'text-muted' : 'text-white/80'}`}>{body}</p>
      {step.kind === 'interest' && started && (
        <div className="flex items-center gap-3">
          <span className={`h-2 w-full max-w-[280px] overflow-hidden rounded-full ${compact ? 'bg-white' : 'bg-white/20'}`}>
            <span className="block h-full origin-left rounded-full bg-yellow" style={{ transform: `scaleX(${step.answered / step.total})` }} />
          </span>
          <span className="shrink-0 text-[13px] tabular-nums">
            {step.answered}/{step.total}
          </span>
        </div>
      )}
      <Link href={href} className="mt-1 inline-flex h-11 items-center self-start rounded-full bg-yellow px-6 text-sm font-semibold text-navy hover:brightness-95">
        {action} →
      </Link>
      {!compact && <Image src="/illustrations/rimau-waving.png" alt="" width={170} height={170} className="pointer-events-none absolute bottom-0 right-6 hidden sm:block" />}
    </section>
  );
}

function Glance({ title, href, action, children }: { title: string; href: string; action: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3 rounded-[18px] bg-white p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-[16px] font-semibold">{title}</h2>
        <Link href={href} className="text-sm font-semibold text-[#2f5bd3] hover:underline">
          {action} →
        </Link>
      </div>
      <div className="flex flex-col gap-1">{children}</div>
    </section>
  );
}

function Saved(props: {
  lang: Locale;
  t: T;
  dict: Dictionary;
  saved: Array<{ programId: string }>;
  items: Recommendation[];
  known: Map<string, { name: string; institutionId: string | null }>;
  reference: Reference | null;
}) {
  const { lang, t, dict, saved, items, known, reference } = props;
  const status = new Map(items.map((i) => [i.programId, i.eligibility]));
  const shown = saved.slice(0, 3).filter((s) => known.has(s.programId));
  return (
    <section className="flex flex-col gap-3 rounded-[18px] bg-white p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-[17px] font-semibold">{format(t.saved.title, { count: saved.length })}</h2>
        {saved.length > 0 && (
          <Link href={`/${lang}/simpanan`} className="text-sm font-semibold text-[#2f5bd3] hover:underline">
            {t.saved.all} →
          </Link>
        )}
      </div>
      {shown.length === 0 ? (
        <p className="text-sm text-muted">{t.saved.empty}</p>
      ) : (
        <ul className="flex flex-col divide-y divide-line">
          {shown.map((s) => {
            const p = known.get(s.programId)!;
            const st = status.get(s.programId);
            return (
              <li key={s.programId}>
                <Link href={`/${lang}/teroka/${s.programId}`} className="flex items-center justify-between gap-3 py-3 hover:text-[#2f5bd3]">
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate font-semibold">{p.name}</span>
                    <span className="truncate text-[13px] text-muted">{reference?.institutions.find((i) => i.id === p.institutionId)?.name ?? dict.recommendations.streamProvider}</span>
                  </span>
                  {st && <span className={`shrink-0 rounded-full px-2.5 py-1 text-[12px] font-semibold ${st === 'eligible' ? 'bg-mint text-[#145c3b]' : st === 'almost' ? 'bg-cream text-[#7a4f06]' : 'bg-bg'}`}>{dict.recommendations.status[st]}</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function Updates({ lang, t, notices, unread, known }: { lang: Locale; t: T; notices: Notification[] | null; unread: number; known: Map<string, { name: string }> }) {
  const text = (n: Notification) => (n.type === 'requirement_changed' ? format(t.updates.requirementChanged, { programme: (n.programId && known.get(n.programId)?.name) || t.updates.aProgramme }) : n.message);
  return (
    <section className="flex flex-col gap-3 rounded-[18px] bg-white p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-[17px] font-semibold">{unread > 0 ? format(t.updates.titleNew, { count: unread }) : t.updates.title}</h2>
        {notices && notices.length > 0 && (
          <Link href={`/${lang}/kemas-kini`} className="text-sm font-semibold text-[#2f5bd3] hover:underline">
            {t.updates.all} →
          </Link>
        )}
      </div>
      {notices === null ? (
        <p className="text-sm text-muted">{t.updates.unavailable}</p>
      ) : notices.length === 0 ? (
        <p className="text-sm text-muted">{t.updates.empty}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {notices.slice(0, 3).map((n) => (
            <li key={n.id} className={`flex flex-col gap-0.5 rounded-[12px] px-4 py-3 ${n.readAt ? 'bg-bg' : 'bg-blue'}`}>
              <span className="text-sm font-semibold">{text(n)}</span>
              <span className="text-[12px] text-muted">{n.createdAt.toLocaleDateString(lang === 'ms' ? 'ms-MY' : 'en-MY', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
