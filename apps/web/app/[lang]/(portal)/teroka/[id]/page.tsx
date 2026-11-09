import { Suspense, type ReactNode } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { z } from 'zod';
import { lang as rootLang } from 'next/root-params';
import { routesFor, type ProgramDetail, type PublishedRequirement } from '@edulaunch/contracts';
import { RequirementLinesView } from '@/components/admin/requirement-lines-view';
import { EligibilityResult } from '@/components/catalogue/eligibility-result';
import { NotFoundError, fieldName, getProgramme, getPublishedRequirements, getReferenceData, localName } from '@/lib/catalogue/api';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { format, isLocale, type Dictionary, type Locale } from '@/lib/i18n/locale';
import { compareMerit } from '@/lib/merit/compare';
import { loadMeritInputs, studentMerit } from '@/lib/merit/student';
import { getMe } from '@/lib/profile/api';
import { getEligibility } from '@/lib/recommendation/api';
import { getAccessToken } from '@/lib/supabase/server';

/**
 * A programme as students see it: the same approved facts an admin sees (code, faculty, NEC field, mode, campuses,
 * entry features, careers, fees, source), the student's own check against its requirements and its average merit,
 * and the requirements per entry route laid out like ePanduan (Syarat Am, Syarat Khas, sections, DAN / ATAU).
 */
export default async function ProgrammePage({ params }: PageProps<'/[lang]/teroka/[id]'>) {
  const lang = await rootLang();
  if (!isLocale(lang)) notFound();
  const dict = await getDictionary(lang);
  return (
    <>
      <Link href={`/${lang}/teroka`} className="self-start text-sm font-semibold text-navy hover:underline">
        ← {dict.detail.back}
      </Link>
      {/* The programme id is only known at request time. */}
      <Suspense fallback={<p className="text-sm text-muted">{dict.directory.loading}</p>}>
        <Programme lang={lang} dict={dict} params={params} />
      </Suspense>
    </>
  );
}

function Card({ title, children, id }: { title: string; children: ReactNode; id?: string }) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-3 rounded-[22px] bg-white p-5 sm:p-6">
      <h2 id={id} className="text-[17px] font-semibold">
        {title}
      </h2>
      {children}
    </section>
  );
}

async function Programme({ lang, dict, params }: { lang: Locale; dict: Dictionary; params: PageProps<'/[lang]/teroka/[id]'>['params'] }) {
  const { id } = await params;
  const t = dict.detail;
  // A malformed link is treated like a programme that does not exist.
  if (!z.uuid().safeParse(id).success) notFound();

  let programme: ProgramDetail;
  try {
    programme = await getProgramme(id);
  } catch (err) {
    if (err instanceof NotFoundError) notFound();
    throw err;
  }
  const [reference, requirements] = await Promise.all([getReferenceData(), getPublishedRequirements([programme.id])]);
  const d = programme.details;
  const institution = reference.institutions.find((i) => i.id === programme.institutionId);
  const fields = reference.fields.filter((f) => programme.fieldIds.includes(f.id)).map((f) => fieldName(f, lang));
  const subjectNames = new Map(reference.subjects.map((s) => [s.id, localName(s, lang)]));
  const nec = d.necCode ? reference.necFields.find((n) => n.code === d.necCode) : undefined;
  const routes: Record<string, string> = dict.requirements.routes;
  const years = programme.durationSemesters ? programme.durationSemesters / 2 : null;
  const isSample = requirements.some((r) => r.rules.some((rule) => rule.officialText?.startsWith('[Contoh]')));
  // Entry features as short tags, only those that apply.
  const flags = (
    [
      [d.isStem, t.flags.stem],
      [d.isTvet, t.flags.tvet],
      [d.hasInterview, t.flags.interview],
      [d.bumiputeraOnly, t.flags.bumiputera],
      [d.jointDegree, t.flags.jointDegree],
      [d.feeder, t.flags.feeder],
    ] as const
  )
    .filter(([on]) => on)
    .map(([, label]) => label);
  const facts: Array<[string, ReactNode]> = [
    [t.facts.level, dict.levels[programme.studyLevel]],
    [t.facts.duration, programme.durationSemesters ? format(t.facts.semesters, { n: programme.durationSemesters, years: years! }) : '—'],
    [t.facts.mode, d.studyMode ? ((t.modes as Record<string, string>)[d.studyMode] ?? d.studyMode) : '—'],
    [
      programme.averageMerit ? format(t.facts.merit, { year: programme.averageMerit.intakeYear }) : t.facts.meritNone,
      programme.averageMerit ? programme.averageMerit.value.toFixed(2) : '—',
    ],
  ];
  const info: Array<[string, ReactNode]> = [
    [t.info.institution, institution?.name ?? dict.card.streamProvider],
    [t.info.programCode, d.programCode],
    [t.info.internalCode, d.internalCode],
    [t.info.faculty, d.faculty],
    [t.info.nec, d.necCode ? `${d.necCode}${nec ? ` · ${nec.name}` : ''}` : null],
    [t.info.fields, fields.length ? fields.join(', ') : null],
    [t.info.campuses, d.campuses.length ? d.campuses.join(' · ') : null],
    [t.info.routes, programme.entryRoutes.length ? programme.entryRoutes.map((r) => routes[r] ?? r).join(', ') : null],
  ];

  return (
    <>
      <header className="flex flex-col gap-3">
        <p className="text-sm font-semibold text-muted">{institution?.name ?? dict.card.streamProvider}</p>
        <h1 className="text-[28px] font-bold leading-tight lg:text-[36px]">{programme.name}</h1>
        {flags.length > 0 && (
          <ul className="flex flex-wrap gap-2" aria-label={t.flagsLabel}>
            {flags.map((f) => (
              <li key={f} className="rounded-full bg-blue px-3 py-1 text-[13px] font-semibold">
                {f}
              </li>
            ))}
          </ul>
        )}
      </header>

      {/* The four facts students compare first. */}
      <dl className="grid grid-cols-2 overflow-hidden rounded-[22px] bg-white lg:grid-cols-4">
        {facts.map(([label, value], n) => (
          <div key={label} className={`flex flex-col gap-1 p-5 ${n % 2 === 1 ? 'border-l border-line' : ''} ${n >= 2 ? 'border-t border-line lg:border-t-0' : ''} ${n === 2 ? 'lg:border-l' : ''}`}>
            <dt className="text-[13px] text-muted">{label}</dt>
            <dd className="text-[17px] font-semibold tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex min-w-0 flex-col gap-6">
          {/* The student's own check reads their session, so it streams in after the rest of the page. */}
          <Suspense fallback={<p className="rounded-[22px] bg-white p-6 text-sm text-muted">{dict.eligibility.checking}</p>}>
            <Eligibility lang={lang} dict={dict} programId={programme.id} subjectNames={subjectNames} />
          </Suspense>
          <Suspense fallback={null}>
            <MeritStanding lang={lang} dict={dict} entryRoutes={programme.entryRoutes} averageMerit={programme.averageMerit} />
          </Suspense>
          <Suspense fallback={<Requirements requirements={requirements} dict={dict} lang={lang} subjectNames={subjectNames} isSample={isSample} studyLevel={programme.studyLevel} student={null} />}>
            <RequirementsForStudent requirements={requirements} dict={dict} lang={lang} subjectNames={subjectNames} isSample={isSample} studyLevel={programme.studyLevel} />
          </Suspense>
        </div>

        <aside className="flex flex-col gap-6">
          <Card title={t.info.title}>
            <dl className="flex flex-col">
              {info
                .filter(([, v]) => v)
                .map(([label, value]) => (
                  <div key={label} className="flex flex-col gap-0.5 border-b border-line py-2.5 first:pt-0 last:border-0 last:pb-0">
                    <dt className="text-[13px] text-muted">{label}</dt>
                    <dd className="break-words text-[15px] font-medium">{value}</dd>
                  </div>
                ))}
            </dl>
          </Card>
          {d.careers.length > 0 && (
            <Card title={t.careers}>
              <ul className="flex flex-wrap gap-1.5">
                {d.careers.map((c) => (
                  <li key={c} className="rounded-full bg-bg px-3 py-1 text-[13px]">
                    {c}
                  </li>
                ))}
              </ul>
            </Card>
          )}
          {d.fees && (
            <Card title={t.fees}>
              <p className="text-sm">{d.fees}</p>
            </Card>
          )}
          {d.note && (
            <Card title={t.note}>
              <p className="whitespace-pre-line text-sm">{d.note}</p>
            </Card>
          )}
          <Card title={t.sourceTitle}>
            <p className="text-sm text-muted">{isSample ? t.sourceSample : t.sourcePublished}</p>
            {d.sourceUrl && (
              <a href={d.sourceUrl} target="_blank" rel="noreferrer" className="break-all text-sm font-semibold underline underline-offset-2">
                {t.openSource} ↗
              </a>
            )}
          </Card>
        </aside>
      </div>
    </>
  );
}

type Student = { educationLevel: string | null; higherQualification: string | null };

/** The signed-in student's level, to show their own route's requirements first. */
async function RequirementsForStudent(props: Omit<Parameters<typeof Requirements>[0], 'student'>) {
  const token = await getAccessToken();
  const me = token ? await getMe(token).catch(() => null) : null;
  return <Requirements {...props} student={me ? { educationLevel: me.educationLevel, higherQualification: me.higherQualification } : null} />;
}

/**
 * Requirements by entry route, the student's own route first ("Syarat untuk anda"), the others folded under "Laluan
 * lain". Each published requirement (one per candidate category when they differ) is shown with its Syarat Am and
 * Syarat Khas as the official source writes them. The route is the one the eligibility check uses (routesFor):
 * Form 4–5 students see the SPM route as their target; Form 1–3 students see it as a guide (no SPM yet); a student
 * whose route the programme does not take is told so, with the way in.
 */
function Requirements({
  requirements,
  dict,
  lang,
  subjectNames,
  isSample,
  studyLevel,
  student,
}: {
  requirements: PublishedRequirement[];
  dict: Dictionary;
  lang: Locale;
  subjectNames: ReadonlyMap<string, string>;
  isSample: boolean;
  studyLevel: string;
  student: Student | null;
}) {
  const t = dict.detail;
  const f = t.forYou;
  const routes: Record<string, string> = dict.requirements.routes;
  const categories = dict.admin.institutions.import.categories as Record<string, string>;
  const level = student?.educationLevel ?? null;
  // Form 1–3 apply to Form 4 streams through Form 3; for anything else, SPM is the route ahead of them.
  const candidates = !student ? [] : level === 'form1_3' && studyLevel !== 'form4_stream' ? ['spm'] : routesFor(student);
  const route = candidates.find((c) => requirements.some((r) => r.entryRoute === c)) ?? null;
  const mine = route ? requirements.filter((r) => r.entryRoute === route) : [];
  const others = requirements.filter((r) => !mine.includes(r));
  const offered = [...new Set(requirements.map((r) => routes[r.entryRoute] ?? r.entryRoute))].join(', ');
  const yours = candidates[0] ? (routes[candidates[0]] ?? candidates[0]) : null;
  const note =
    !route || !student
      ? null
      : level === 'form1_3' && route === 'spm'
        ? f.early
        : level === 'form4_5'
          ? f.target
          : candidates[0] !== route
            ? format(f.closest, { route: routes[route] ?? route, yours: yours ?? '' })
            : null;

  const block = (r: PublishedRequirement) => (
    <div key={r.requirementId} className="flex flex-col gap-2">
      <h3 className="flex flex-wrap items-baseline gap-x-2 text-[15px] font-semibold">
        {routes[r.entryRoute] ?? r.entryRoute}
        {r.sourceCategory && categories[r.sourceCategory] && <span className="text-[13px] font-normal text-muted">{categories[r.sourceCategory]}</span>}
      </h3>
      <RequirementLinesView rules={r.rules} subjectNames={subjectNames} t={dict.admin.requirement} />
    </div>
  );

  return (
    <Card title={t.requirementsTitle} id="requirements-title">
      {isSample && <p className="rounded-[12px] bg-cream px-4 py-2.5 text-[13px] font-medium text-[#8a6100]">{t.sourceSample}</p>}
      {requirements.length === 0 ? (
        <p className="text-sm text-muted">{t.noRequirement}</p>
      ) : !student ? (
        <div className="flex flex-col gap-5">{requirements.map(block)}</div>
      ) : (
        <>
          {route ? (
            <div className="flex flex-col gap-3 rounded-[16px] bg-blue/50 p-4">
              <p className="text-[13px] font-semibold text-navy/70">{f.title}</p>
              {note && <p className="text-sm">{note}</p>}
              <div className="flex flex-col gap-5">{mine.map(block)}</div>
            </div>
          ) : (
            <div className="flex flex-col gap-2 rounded-[16px] bg-cream p-4 text-sm">
              <p className="font-semibold">{yours ? format(f.notOffered, { route: yours }) : f.noLevel}</p>
              <p>{format(f.offered, { routes: offered })}</p>
              {(level === 'after_spm' || level === 'form4_5') && (
                <>
                  <p>{f.wayIn}</p>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {(['foundation', 'matriculation', 'diploma'] as const).map((l) => (
                      <Link key={l} href={`/${lang}/teroka?studyLevel=${l}`} className="rounded-full border border-line bg-white px-3 py-1.5 text-[13px] font-semibold hover:bg-bg">
                        {dict.levels[l]} →
                      </Link>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
          {others.length > 0 && (
            <details className="group rounded-[16px] border border-line" open={!route}>
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-semibold marker:hidden">
                {format(f.otherRoutes, { count: new Set(others.map((r) => r.entryRoute)).size })}
                <span aria-hidden className="text-muted transition-transform group-open:rotate-180">⌄</span>
              </summary>
              <div className="flex flex-col gap-5 border-t border-line p-4">{others.map(block)}</div>
            </details>
          )}
        </>
      )}
    </Card>
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
        <h2 id="merit-title" className="text-[17px] font-semibold leading-tight">
          {t.title}
        </h2>
        <p className="text-sm">{sentence}</p>
        {merit !== null && inputs.basis === 'target' && <p className="text-[13px] font-medium">{t.targetNote}</p>}
        {comparison?.status === 'comparable' && <p className="text-[13px] text-muted">{t.note}</p>}
      </div>
      <Link href={`/${lang}/merit-lab`} className="shrink-0 self-start text-sm font-semibold text-navy underline underline-offset-2 sm:self-center">
        {merit === null ? t.openLabEmpty : t.openLab}
      </Link>
    </section>
  );
}
