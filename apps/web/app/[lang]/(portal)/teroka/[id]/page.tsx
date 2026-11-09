import { Suspense } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { z } from 'zod';
import { lang as rootLang } from 'next/root-params';
import { EligibilityResult } from '@/components/catalogue/eligibility-result';
import { FieldIllustration } from '@/components/catalogue/field-illustration';
import { NotFoundError, fieldName, getProgramme, getPublishedRequirements, getReferenceData, localName } from '@/lib/catalogue/api';
import { programmeMeta } from '@/lib/catalogue/presentation';
import { describeRequirement } from '@/lib/catalogue/requirements';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { format, isLocale, type Dictionary, type Locale } from '@/lib/i18n/locale';
import { compareMerit } from '@/lib/merit/compare';
import { loadMeritInputs, studentMerit } from '@/lib/merit/student';
import { getEligibility } from '@/lib/recommendation/api';
import { getAccessToken } from '@/lib/supabase/server';

export default async function ProgrammePage({ params }: PageProps<'/[lang]/teroka/[id]'>) {
  const lang = await rootLang();
  if (!isLocale(lang)) notFound();
  const dict = await getDictionary(lang);
  return (
    <>
      <Link href={`/${lang}/teroka`} className="text-sm font-semibold text-navy hover:underline">
        ← {dict.detail.back}
      </Link>
      {/* The programme id is only known at request time. */}
      <Suspense fallback={<p className="text-sm text-muted">{dict.directory.loading}</p>}>
        <Programme lang={lang} dict={dict} params={params} />
      </Suspense>
    </>
  );
}

async function Programme({ lang, dict, params }: { lang: Locale; dict: Dictionary; params: PageProps<'/[lang]/teroka/[id]'>['params'] }) {
  const { id } = await params;
  const t = dict.detail;
  // A malformed link is treated like a programme that does not exist.
  if (!z.uuid().safeParse(id).success) notFound();

  let programme: Awaited<ReturnType<typeof getProgramme>>;
  try {
    programme = await getProgramme(id);
  } catch (err) {
    if (err instanceof NotFoundError) notFound();
    throw err;
  }
  const [reference, requirements] = await Promise.all([getReferenceData(), getPublishedRequirements([programme.id])]);

  const institution = reference.institutions.find((i) => i.id === programme.institutionId);
  const fields = reference.fields.filter((f) => programme.fieldIds.includes(f.id)).map((f) => fieldName(f, lang));
  const subjectNames = new Map(reference.subjects.map((s) => [s.id, localName(s, lang)]));
  const described = requirements.map((r) => describeRequirement(r, subjectNames, dict.requirements));
  const isSample = described.some((d) => d.isSample);

  return (
    <>
      <header className="flex flex-col gap-[22px]">
        <p className="text-xs font-semibold uppercase leading-tight text-muted">{institution?.name ?? dict.card.streamProvider}</p>
        <h1 className="text-[32px] font-bold leading-tight lg:text-[44px]">{programme.name}</h1>
        <p className="text-[15px] leading-tight text-muted">{[programmeMeta(programme.studyLevel, programme.durationSemesters, dict), ...fields].join(' • ')}</p>
      </header>

      {/* The student's own check reads their session, so it streams in after the rest of the page. */}
      <Suspense fallback={<p className="rounded-[22px] bg-white p-6 text-sm text-muted">{dict.eligibility.checking}</p>}>
        <Eligibility lang={lang} dict={dict} programId={programme.id} subjectNames={subjectNames} />
      </Suspense>
      <Suspense fallback={null}>
        <MeritStanding lang={lang} dict={dict} entryRoutes={programme.entryRoutes} averageMerit={programme.averageMerit} />
      </Suspense>

      <div data-reveal-stagger className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
        <section className="flex flex-col gap-[18px] rounded-[22px] bg-white p-6" aria-labelledby="requirements-title">
          <h2 id="requirements-title" className="text-[26px] font-semibold leading-tight">
            {t.requirementsTitle}
          </h2>
          {described.length === 0 && <p className="text-sm text-muted">{t.noRequirement}</p>}
          {/* A route can have one requirement per candidate category, so the route alone is not a unique key. */}
          {described.map((d, n) => (
            <div key={`${d.entryRoute}-${n}`} className="flex flex-col gap-[18px]">
              <Item title={t.entryRoute} detail={d.entryRoute} />
              {d.items.map((item, i) => (
                <Item key={i} title={item.title} detail={item.detail} />
              ))}
            </div>
          ))}
          {described.length > 0 && <Item title={t.sourceTitle} detail={isSample ? t.sourceSample : t.sourcePublished} />}
        </section>

        <section className="relative flex flex-col gap-[9px] overflow-hidden rounded-[22px] bg-blue px-5 pb-[260px] pt-5" aria-labelledby="evidence-title">
          <h2 id="evidence-title" className="text-[19px] font-semibold leading-tight">
            {t.evidenceTitle}
          </h2>
          <p className="text-sm leading-tight text-muted">{t.evidenceIntro}</p>
          <ul className="flex flex-col gap-2">
            {[...new Set(described.flatMap((d) => d.quotes))].map((quote) => (
              <li key={quote} className="rounded-xl bg-white/70 px-4 py-3 text-sm italic text-navy">
                “{quote}”
              </li>
            ))}
          </ul>
          <FieldIllustration world="documents" size={230} inset={7.67} className="absolute bottom-0 left-1/2 -translate-x-1/2" />
        </section>
      </div>
    </>
  );
}

async function loadEligibility(programId: string) {
  try {
    const token = await getAccessToken();
    return token ? await getEligibility(token, programId) : null;
  } catch {
    return null;
  }
}

async function Eligibility({ lang, dict, programId, subjectNames }: { lang: Locale; dict: Dictionary; programId: string; subjectNames: ReadonlyMap<string, string> }) {
  const answer = await loadEligibility(programId);
  if (!answer) {
    return (
      <p role="alert" className="rounded-[22px] border border-line bg-white p-6 text-sm">
        {dict.eligibility.loadError}
      </p>
    );
  }
  return <EligibilityResult locale={lang} answer={answer} subjectNames={subjectNames} t={dict.eligibility} routeNames={dict.requirements.routes} />;
}

/**
 * The student's merit beside the programme's average merit, when both belong to the same group of candidates.
 * Never a chance or a promise: the average is of students who were offered a place, from one past intake.
 */
async function MeritStanding({ lang, dict, entryRoutes, averageMerit }: { lang: Locale; dict: Dictionary; entryRoutes: string[]; averageMerit: { intakeYear: number; value: number } | null }) {
  const t = dict.meritStanding;
  const token = await getAccessToken();
  if (!token) return null;
  const inputs = await loadMeritInputs(token, lang).catch(() => null);
  // Before Form 4 there is no merit to compare, so the card is left out.
  if (!inputs || inputs.level === 'form1_3') return null;
  const merit = studentMerit(inputs);
  const comparison = merit === null ? null : compareMerit({ mode: inputs.mode, merit }, { entryRoutes, averageMerit });
  const tone = comparison?.status === 'comparable' ? { above: 'bg-mint', near: 'bg-cream', below: 'bg-[#ffedea]' }[comparison.band] : 'bg-white';
  const sentence =
    merit === null
      ? t.noMerit
      : !comparison || comparison.status === 'no_average'
        ? format(t.noAverage, { merit: merit.toFixed(2) })
        : comparison.status === 'other_group'
          ? format(comparison.group === 'spm' ? t.otherGroupSpm : t.otherGroupPreu, { merit: merit.toFixed(2) })
          : format(t.bands[comparison.band], { merit: merit.toFixed(2), average: comparison.average.toFixed(2), year: comparison.year, gap: Math.abs(comparison.gap).toFixed(2) });
  return (
    <section aria-labelledby="merit-title" className={`flex flex-col gap-4 rounded-[22px] p-6 sm:flex-row sm:items-center sm:justify-between ${tone}`}>
      <div className="flex min-w-0 flex-col gap-1.5">
        <h2 id="merit-title" className="text-[19px] font-semibold leading-tight">
          {t.title}
        </h2>
        <p className="text-sm">{sentence}</p>
        {merit !== null && inputs.basis === 'target' && <p className="text-[13px] font-medium">{t.targetNote}</p>}
        {comparison?.status === 'comparable' && <p className="text-[13px] text-muted">{t.note}</p>}
      </div>
      {comparison?.status === 'comparable' && merit !== null && (
        <dl className="flex shrink-0 gap-6 tabular-nums">
          <div>
            <dt className="text-[13px] text-muted">{t.yours}</dt>
            <dd className="text-[28px] font-bold leading-none">{merit.toFixed(2)}</dd>
          </div>
          <div>
            <dt className="text-[13px] text-muted">{format(t.average, { year: comparison.year })}</dt>
            <dd className="text-[28px] font-bold leading-none">{comparison.average.toFixed(2)}</dd>
          </div>
        </dl>
      )}
      <Link href={`/${lang}/merit-lab`} className="shrink-0 self-start text-sm font-semibold text-navy underline underline-offset-2 sm:self-center">
        {merit === null ? t.openLabEmpty : t.openLab}
      </Link>
    </section>
  );
}

function Item({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="flex flex-col gap-[9px] rounded-[22px] bg-bg p-5">
      <p className="text-[19px] font-semibold leading-tight">{title}</p>
      <p className="text-sm leading-tight text-muted">{detail}</p>
    </div>
  );
}
