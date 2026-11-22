import Image from 'next/image';
import Link from 'next/link';
import { Fragment, type ReactNode } from 'react';
import { notFound } from 'next/navigation';
import { lang as rootLang } from 'next/root-params';
import type { ProgramDetail } from '@edulaunch/contracts';
import { ClearPlan, PlanForm } from '@/components/roadmap/plan-form';
import { Pending } from '@/components/ui/pending';
import { getProgramme, getReferenceData } from '@/lib/catalogue/api';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { format, isLocale, type Dictionary, type Locale } from '@/lib/i18n/locale';
import { getInterestTest } from '@/lib/interests/api';
import { getMe, getRoadmap, listRecords, listSavedProgrammes, type RoadmapStep } from '@/lib/profile/api';
import { getRecommendations, type Recommendation } from '@/lib/recommendation/api';
import { reachableByRoute, routeOfLevel, stagesFor, type Route, type Stage } from '@/lib/roadmap/paths';
import { getAccessToken } from '@/lib/supabase/server';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * "Roadmap saya" (Figma: W05 / Education roadmap): the road from where the student is now, stage by stage as the
 * Malaysian system runs, with how many programmes they can reach on each route; a target programme and the careers
 * it leads to (as ePanduan lists them); the plan they saved; and the next actions. Nothing here is invented: a stage
 * without data says so.
 */
export default async function RoadmapPage({ searchParams }: PageProps<'/[lang]/roadmap'>) {
  const lang = await rootLang();
  if (!isLocale(lang)) notFound();
  const dict = await getDictionary(lang);
  const t = dict.roadmap;
  return (
    <div className="flex flex-col gap-6">
      <header className="relative flex flex-col gap-2 sm:pr-40">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">{t.eyebrow}</p>
        <h1 className="text-[28px] font-bold leading-tight lg:text-[36px]">{t.title}</h1>
        <p className="text-[15px] text-muted">{t.intro}</p>
        <Image src="/illustrations/rimau-waving.png" alt="" width={120} height={120} className="pointer-events-none absolute -top-4 right-0 hidden sm:block" />
      </header>
      <Pending label={t.loading} variant="panels">
        <Roadmap lang={lang} dict={dict} searchParams={searchParams} />
      </Pending>
    </div>
  );
}

async function Roadmap({ lang, dict, searchParams }: { lang: Locale; dict: Dictionary; searchParams: PageProps<'/[lang]/roadmap'>['searchParams'] }) {
  const t = dict.roadmap;
  const [sp, token] = await Promise.all([searchParams, getAccessToken()]);
  if (!token) notFound();
  const [me, recs, saved, plan, records, interest, reference] = await Promise.all([
    getMe(token).catch(() => null),
    getRecommendations(token).catch(() => null),
    listSavedProgrammes(token).catch(() => []),
    getRoadmap(token).catch(() => null),
    listRecords(token).catch(() => []),
    getInterestTest(token).catch(() => null),
    getReferenceData().catch(() => null),
  ]);
  const level = me?.educationLevel ?? null;
  if (!level)
    return (
      <section className="flex flex-col items-start gap-3 rounded-[22px] bg-white p-6">
        <p className="text-sm">{t.needLevel}</p>
        <Link href={`/${lang}/profil#tahap`} className="inline-flex h-11 items-center rounded-[12px] bg-navy px-5 text-sm font-semibold text-white">
          {t.chooseLevel}
        </Link>
      </section>
    );

  const items = recs?.items ?? [];
  const reachable = reachableByRoute(items);
  const stages = stagesFor(level);
  const school = level === 'form1_3';

  // Targets to choose from: saved programmes first, then the student's reachable suggestions (not Form 4 streams).
  const recById = new Map(items.map((i) => [i.programId, i]));
  const savedProgrammes = (await Promise.all(saved.map((s) => getProgramme(s.programId).catch(() => null)))).filter((p): p is ProgramDetail => p !== null);
  const options = [
    ...savedProgrammes.filter((p) => p.studyLevel !== 'form4_stream').map((p) => ({ id: p.id, name: p.name, saved: true })),
    ...items.filter((i) => i.eligibility !== 'not_yet' && i.details.studyLevel !== 'form4_stream' && !saved.some((s) => s.programId === i.programId)).slice(0, 12).map((i) => ({ id: i.programId, name: i.programName, saved: false })),
  ];
  const planProgramme = plan?.steps.find((s) => s.type === 'programme')?.programId ?? null;
  const asked = typeof sp.sasaran === 'string' && UUID.test(sp.sasaran) ? sp.sasaran : null;
  const targetId = [asked, planProgramme, options[0]?.id].find((id): id is string => Boolean(id) && (options.some((o) => o.id === id) || id === planProgramme)) ?? null;
  const target = targetId ? (savedProgrammes.find((p) => p.id === targetId) ?? (await getProgramme(targetId).catch(() => null))) : null;
  const targetRoute = target ? routeOfLevel(target.studyLevel) : null;
  const institution = (id: string | null) => reference?.institutions.find((i) => i.id === id)?.name ?? dict.recommendations.streamProvider;
  const chosenCareer = plan?.steps.find((s) => s.type === 'career')?.label ?? null;

  const nowLabel =
    school && me?.formYear
      ? format(dict.onboarding.levels.form1_3.short, { form: me.formYear })
      : me?.higherQualification
        ? format(dict.home.after, { name: dict.higher.shortNames[me.higherQualification] })
        : dict.onboarding.levels[level].title;
  const streams = school ? items.filter((i) => i.details.studyLevel === 'form4_stream').sort((a, b) => (b.details.interest?.fit ?? -1) - (a.details.interest?.fit ?? -1)).slice(0, 2) : [];

  // The next actions, from what the student has and has not done.
  const hasResults = school ? records.some((r) => r.qualification === 'school') : records.some((r) => r.qualification === 'spm' || r.qualification === me?.higherQualification);
  const actions: Array<{ text: string; href: string; done: boolean }> = [
    { text: t.actions.results, href: `/${lang}/dokumen`, done: hasResults },
    { text: t.actions.interest, href: `/${lang}/penilaian-minat`, done: Boolean(interest?.result) },
    ...(target
      ? [
          { text: format(t.actions.check, { programme: target.name }), href: `/${lang}/teroka/${target.id}`, done: recById.get(target.id)?.eligibility === 'eligible' },
          { text: format(t.actions.save, { programme: target.name }), href: `/${lang}/teroka/${target.id}`, done: saved.some((s) => s.programId === target.id) },
        ]
      : [{ text: t.actions.pickTarget, href: `/${lang}/cadangan`, done: false }]),
    ...(level === 'form4_5' ? [{ text: t.actions.targets, href: `/${lang}/dokumen`, done: records.some((r) => r.kind === 'target') }] : []),
  ];

  return (
    <>
      {/* The road: one column per stage, the student's own data in each. */}
      <section aria-labelledby="road-title" className="flex flex-col gap-4 rounded-[22px] bg-white p-5 sm:p-6">
        <h2 id="road-title" className="text-[20px] font-bold">
          {t.road.title}
        </h2>
        <ol className="flex flex-col gap-3 lg:flex-row lg:items-stretch lg:gap-0">
          {stages.map((stage, i) => (
            <Fragment key={i}>
              {i > 0 && (
                <li aria-hidden className="flex items-center justify-center text-[#a9b3c4] lg:w-8 lg:shrink-0">
                  <span className="lg:hidden">↓</span>
                  <span className="hidden lg:inline">→</span>
                </li>
              )}
              <li className="flex min-w-0 flex-1 flex-col gap-2">
                <p className="text-[12px] font-semibold uppercase tracking-wide text-muted">{t.road.stage[stageName(stage)]}</p>
                <StageNodes
                  stage={stage}
                  lang={lang}
                  dict={dict}
                  nowLabel={nowLabel}
                  reachable={reachable}
                  targetRoute={targetRoute}
                  target={target}
                  streams={streams}
                  chosenCareer={chosenCareer}
                />
              </li>
            </Fragment>
          ))}
        </ol>
        <p className="text-[12px] text-muted">{t.road.note}</p>
      </section>

      {!school && (
        <div className="grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-start">
          {/* Target and careers: choose, then save the plan. */}
          <section aria-labelledby="target-title" className="flex flex-col gap-4 rounded-[22px] bg-white p-5 sm:p-6">
            <h2 id="target-title" className="text-[20px] font-bold">
              {t.plan.title}
            </h2>
            {options.length === 0 && !target ? (
              <p className="text-sm text-muted">{t.plan.noOptions}</p>
            ) : (
              <>
                <form action={`/${lang}/roadmap`} className="flex flex-col gap-2 sm:flex-row sm:items-end">
                  <label className="flex min-w-0 flex-1 flex-col gap-2">
                    <span className="text-sm font-semibold">{t.plan.target}</span>
                    <select name="sasaran" defaultValue={targetId ?? ''} className="h-12 w-full min-w-0 rounded-[12px] border-[1.5px] border-[#8792a6] bg-white px-3 text-[15px] font-semibold">
                      {options.some((o) => o.saved) && (
                        <optgroup label={t.plan.savedGroup}>
                          {options.filter((o) => o.saved).map((o) => (
                            <option key={o.id} value={o.id}>
                              {o.name}
                            </option>
                          ))}
                        </optgroup>
                      )}
                      {options.some((o) => !o.saved) && (
                        <optgroup label={t.plan.suggestedGroup}>
                          {options.filter((o) => !o.saved).map((o) => (
                            <option key={o.id} value={o.id}>
                              {o.name}
                            </option>
                          ))}
                        </optgroup>
                      )}
                    </select>
                  </label>
                  <button type="submit" className="inline-flex h-12 shrink-0 items-center justify-center rounded-[12px] border border-line bg-white px-5 text-sm font-semibold hover:bg-bg">
                    {t.plan.show}
                  </button>
                </form>
                {target && (
                  <>
                    <p className="text-sm text-muted">{[institution(target.institutionId), (dict.levels as Record<string, string>)[target.studyLevel]].filter(Boolean).join(' · ')}</p>
                    <PlanForm key={target.id} target={target.id} careers={target.details.careers} chosen={plan?.steps.some((s) => s.programId === target.id) ? chosenCareer : null} t={t.plan} />
                    {target.details.careers.length > 0 && (
                      <p className="text-[12px] text-muted">
                        {t.plan.careerSource}{' '}
                        {target.details.sourceUrl && (
                          <a href={target.details.sourceUrl} target="_blank" rel="noreferrer" className="underline underline-offset-2">
                            {t.plan.openSource}
                          </a>
                        )}
                      </p>
                    )}
                  </>
                )}
              </>
            )}
          </section>

          <div className="flex flex-col gap-5">
            <SavedPlan lang={lang} t={t} steps={plan?.steps ?? null} dict={dict} />
            <Actions t={t} actions={actions} />
          </div>
        </div>
      )}
      {school && <Actions t={t} actions={actions.filter((a) => a.href.endsWith('dokumen') || a.href.endsWith('penilaian-minat'))} />}
    </>
  );
}

const stageName = (stage: Stage): 'now' | 'career' | Route => (stage.kind === 'routes' ? (stage.routes.length > 1 ? 'afterSpm' : stage.routes[0]!) : stage.kind) as 'now' | 'career' | Route;

function Node({ children, tone = 'plain', href }: { children: ReactNode; tone?: 'now' | 'chosen' | 'plain' | 'muted'; href?: string }) {
  const look = { now: 'bg-yellow', chosen: 'bg-[#dcf3e6] ring-2 ring-[#1f8a5b]', plain: 'bg-blue', muted: 'bg-bg text-muted' }[tone];
  const body = <span className={`flex flex-col gap-0.5 rounded-[14px] px-4 py-3 ${look}`}>{children}</span>;
  return href ? (
    <Link href={href} className="block transition-transform hover:-translate-y-0.5">
      {body}
    </Link>
  ) : (
    body
  );
}

function StageNodes(props: {
  stage: Stage;
  lang: Locale;
  dict: Dictionary;
  nowLabel: string;
  reachable: Partial<Record<Route, number>>;
  targetRoute: Route | null;
  target: ProgramDetail | null;
  streams: Recommendation[];
  chosenCareer: string | null;
}) {
  const { stage, lang, dict, nowLabel, reachable, targetRoute, target, streams, chosenCareer } = props;
  const t = dict.roadmap;
  if (stage.kind === 'now')
    return (
      <Node tone="now">
        <span className="font-semibold">{t.road.youNow}</span>
        <span className="text-[13px]">{nowLabel}</span>
      </Node>
    );
  if (stage.kind === 'career') {
    if (!target) return <Node tone="muted">{t.road.pickTargetFirst}</Node>;
    if (target.details.careers.length === 0) return <Node tone="muted">{t.road.careersPreparing}</Node>;
    return (
      <div className="flex flex-col gap-2">
        {target.details.careers.slice(0, 3).map((c) => (
          <Node key={c} tone={c === chosenCareer ? 'chosen' : 'plain'}>
            <span className="font-semibold">{c}</span>
          </Node>
        ))}
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-2">
      {stage.routes.map((route) => {
        if (route === 'form4_stream')
          return streams.length ? (
            streams.map((s) => (
              <Node key={s.programId} tone="plain" href={`/${lang}/teroka/${s.programId}`}>
                <span className="font-semibold">{s.programName}</span>
                {s.details.interest && <span className="text-[13px]">{format(t.road.interestFit, { level: dict.recommendations.levels[s.details.interest.level] })}</span>}
              </Node>
            ))
          ) : (
            <Node key={route} tone="muted" href={`/${lang}/penilaian-minat`}>
              {t.road.takeInterest}
            </Node>
          );
        const count = reachable[route];
        // Degree after a diploma or pre-university: the target when it is a degree, else the count.
        const isTarget = targetRoute === route;
        return (
          <Node key={route} tone={isTarget ? 'chosen' : 'plain'}>
            <span className="font-semibold">{t.routes[route].name}</span>
            <span className="text-[13px]">{isTarget && target ? target.name : count ? format(t.road.reachable, { count }) : t.routes[route].detail}</span>
          </Node>
        );
      })}
    </div>
  );
}

function SavedPlan({ lang, t, steps, dict }: { lang: Locale; t: Dictionary['roadmap']; steps: RoadmapStep[] | null; dict: Dictionary }) {
  return (
    <section aria-labelledby="mine-title" className="flex flex-col gap-3 rounded-[22px] bg-white p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <h2 id="mine-title" className="text-[20px] font-bold">
          {t.mine.title}
        </h2>
        {steps && steps.length > 0 && <ClearPlan label={t.mine.clear} />}
      </div>
      {steps === null ? (
        <p className="text-sm text-muted">{t.mine.unavailable}</p>
      ) : steps.length === 0 ? (
        <p className="text-sm text-muted">{t.mine.empty}</p>
      ) : (
        <ol className="flex flex-col gap-2">
          {steps.map((s, i) => (
            <li key={i} className="flex items-start gap-3">
              <span className="grid size-7 shrink-0 place-items-center rounded-full bg-navy text-[13px] font-bold text-white">{i + 1}</span>
              <span className="flex min-w-0 flex-col">
                <span className="text-[12px] font-semibold uppercase tracking-wide text-muted">{t.mine.types[s.type]}</span>
                {s.type === 'programme' && s.programId ? (
                  <Link href={`/${lang}/teroka/${s.programId}`} className="font-semibold hover:text-[#2f5bd3]">
                    {s.label}
                  </Link>
                ) : (
                  <span className="font-semibold">{s.type === 'route' && s.label in t.routes ? t.routes[s.label as Route].name : s.label}</span>
                )}
              </span>
            </li>
          ))}
        </ol>
      )}
      <p className="text-[12px] text-muted">{dict.roadmap.mine.note}</p>
    </section>
  );
}

function Actions({ t, actions }: { t: Dictionary['roadmap']; actions: Array<{ text: string; href: string; done: boolean }> }) {
  return (
    <section aria-labelledby="actions-title" className="flex flex-col gap-3 rounded-[22px] bg-blue p-5 sm:p-6">
      <h2 id="actions-title" className="text-[20px] font-bold">
        {t.actions.title}
      </h2>
      <ul className="flex flex-col gap-2">
        {actions.map((a) => (
          <li key={a.text}>
            <Link href={a.href} className={`flex items-start gap-2 rounded-[10px] px-2 py-1.5 text-sm hover:bg-white/60 ${a.done ? 'text-muted line-through' : 'font-semibold'}`}>
              <span aria-hidden className={a.done ? 'text-[#1f8a5b] no-underline' : ''}>
                {a.done ? '✓' : '○'}
              </span>
              <span>
                {a.done && <span className="sr-only">{t.actions.doneLabel} </span>}
                {a.text}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
