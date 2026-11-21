import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { lang as rootLang } from 'next/root-params';
import { RefreshButton } from '@/components/recommendations/refresh-button';
import { Icon } from '@/components/ui/icon';
import { Pending } from '@/components/ui/pending';
import { fieldName, getReferenceData } from '@/lib/catalogue/api';
import { explainRule } from '@/lib/eligibility/explain';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { format, isLocale, type Dictionary, type Locale } from '@/lib/i18n/locale';
import { getInterestTest, type InterestTest, type RiasecType } from '@/lib/interests/api';
import { compareMerit } from '@/lib/merit/compare';
import { loadMeritInputs, studentMerit, type MeritInputs } from '@/lib/merit/student';
import { recalculateRecommendations } from '@/lib/recommendation/actions';
import { getRecommendations, type Recommendation, type Recommendations } from '@/lib/recommendation/api';
import { getAccessToken } from '@/lib/supabase/server';
import { listSavedProgrammes } from '@/lib/profile/api';
import { SaveButton } from '@/components/saved/save-button';
import { CHANCE_LEVEL, MATCH_STYLE, matchOf, type Level } from '@/lib/recommendation/present';

type Status = Recommendation['eligibility'];
const PAGE_SIZE = 8;
const STATUSES: Status[] = ['eligible', 'almost', 'not_yet'];

const STATUS_STYLE: Record<Status, string> = { eligible: 'bg-mint', almost: 'bg-cream', not_yet: 'bg-red/10' };

const SORTS = ['match', 'continuity', 'interest', 'chance', 'name'] as const;
type Sort = (typeof SORTS)[number];

/**
 * "Cadangan saya" (Figma: W / Cadangan program): the student's programmes, eligible first, then almost and not yet
 * eligible, each ordered by fit. Every card says why it is recommended, what needs attention, the offer chance from the
 * student's merit against the programme's average, and links to the full requirements. Eligibility is never mixed
 * with fit: a better fit does not move a programme into another group.
 */
export default async function RecommendationsPage({ searchParams }: PageProps<'/[lang]/cadangan'>) {
  const lang = await rootLang();
  if (!isLocale(lang)) notFound();
  const dict = await getDictionary(lang);
  const t = dict.recommendations;
  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">{t.eyebrow}</p>
        <h1 className="text-[28px] font-bold leading-tight lg:text-[40px]">{t.title}</h1>
        <p className="text-[15px] text-muted">{t.intro}</p>
      </header>
      {/* The list is the student's own, worked out at request time. */}
      <Pending label={dict.directory.loading} variant="panels">
        <RecommendationsView lang={lang} dict={dict} searchParams={searchParams} />
      </Pending>
    </div>
  );
}

async function RecommendationsView({ lang, dict, searchParams }: { lang: Locale; dict: Dictionary; searchParams: PageProps<'/[lang]/cadangan'>['searchParams'] }) {
  const t = dict.recommendations;
  const [sp, token] = await Promise.all([searchParams, getAccessToken()]);
  if (!token) notFound();

  let list: Recommendations;
  let interest: InterestTest | null;
  let merit: MeritInputs;
  let reference: Awaited<ReturnType<typeof getReferenceData>>;
  let savedIds: Set<string> | null = null;
  try {
    [list, interest, merit, reference] = await Promise.all([
      getRecommendations(token),
      // The interest chip and prompt are extras: the page still works without them.
      getInterestTest(token).catch(() => null),
      loadMeritInputs(token, lang),
      getReferenceData(),
    ]);
    savedIds = await listSavedProgrammes(token)
      .then((list) => new Set(list.map((s) => s.programId)))
      .catch(() => null);
  } catch {
    return (
      <p role="alert" className="rounded-[18px] border border-line bg-white p-6 text-sm">
        {t.unavailable}
      </p>
    );
  }

  const counts = Object.fromEntries(STATUSES.map((s) => [s, list.items.filter((i) => i.eligibility === s).length])) as Record<Status, number>;
  const asked = STATUSES.find((s) => s === sp.status);
  const status = asked ?? STATUSES.find((s) => counts[s] > 0) ?? 'eligible';
  const sort: Sort = SORTS.find((x) => x === sp.sort) ?? 'match';
  const myMerit = studentMerit(merit);
  const meritFor = myMerit === null ? null : { mode: merit.mode, merit: myMerit };
  const inStatus = sortItems(list.items.filter((i) => i.eligibility === status), sort, meritFor, lang);
  // A few cards per page, so a phone screen stays short.
  const totalPages = Math.max(1, Math.ceil(inStatus.length / PAGE_SIZE));
  const page = Math.min(totalPages, Math.max(1, Number.parseInt(String(sp.page ?? ''), 10) || 1));
  const shown = inStatus.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const query = (next: { status?: Status; sort?: Sort; page?: number }) => {
    const q = new URLSearchParams({ status: next.status ?? status });
    const nextSort = next.sort ?? sort;
    if (nextSort !== 'match') q.set('sort', nextSort);
    if (next.page && next.page > 1) q.set('page', String(next.page));
    return `/${lang}/cadangan?${q.toString()}`;
  };
  const code = (interest?.result?.code.split('') ?? []) as RiasecType[];
  const typeNames = (types: RiasecType[]) => types.map((x) => dict.interest.types[x].name).join(' · ');
  const noResults = merit.basis === 'none';

  return (
    <>
      <BasedOn lang={lang} dict={dict} merit={merit} interestTypes={code.length ? typeNames(code.slice(0, 2)) : null} generatedAt={list.generatedAt} />

      {!interest?.result && (
        <Prompt title={t.noInterest.title} body={t.noInterest.body} href={`/${lang}/penilaian-minat`} action={t.noInterest.action} />
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
        <div className="flex flex-col gap-4">
          {noResults && list.items.length === 0 ? (
            <Prompt title={t.noResults.title} body={t.noResults.body} href={`/${lang}/dokumen`} action={t.noResults.action} />
          ) : list.items.length === 0 ? (
            <Prompt title={t.empty.title} body={t.empty.body} href={`/${lang}/teroka`} action={t.explore} />
          ) : (
            <>
              <nav aria-label={t.tabsLabel} className="flex flex-wrap gap-2">
                {STATUSES.map((s) => (
                  <Link
                    key={s}
                    href={query({ status: s })}
                    aria-current={s === status ? 'page' : undefined}
                    className={`rounded-full px-3.5 py-1.5 text-sm font-semibold ${s === status ? 'bg-navy text-white' : 'bg-white text-navy hover:bg-white/70'}`}
                  >
                    {format(t.tabs[s], { n: counts[s] })}
                  </Link>
                ))}
              </nav>
              {inStatus.length > 1 && <SortBar t={t} sort={sort} href={(x) => query({ sort: x })} />}
              {shown.length === 0 ? (
                <p className="rounded-[22px] bg-white p-6 text-sm text-muted">{t.emptyTab}</p>
              ) : (
                <ol className="flex flex-col gap-4">
                  {shown.map((item) => (
                    <li key={item.programId}>
                      <Card lang={lang} dict={dict} item={item} reference={reference} merit={meritFor} typeNames={typeNames} saved={savedIds ? savedIds.has(item.programId) : null} />
                    </li>
                  ))}
                </ol>
              )}
              {totalPages > 1 && <Pagination dict={dict} page={page} totalPages={totalPages} href={(n) => query({ page: n })} />}
            </>
          )}
        </div>
        <HowItWorks t={t} />
      </div>
    </>
  );
}

/** "Dikira daripada": what the list was worked out from, with a way to check that data and to work it out again. */
function BasedOn({ lang, dict, merit, interestTypes, generatedAt }: { lang: Locale; dict: Dictionary; merit: MeritInputs; interestTypes: string | null; generatedAt: Date | null }) {
  const t = dict.recommendations;
  const level = merit.level ? (dict.onboarding.levels as Record<string, { title: string }>)[merit.level]?.title : null;
  const basis =
    merit.basis === 'none'
      ? t.basis.none
      : merit.mode === 'spm'
        ? format(merit.basis === 'target' ? t.basis.target : t.basis.actual, { n: merit.subjects.length })
        : format(t.basis.cgpa, { cgpa: merit.cgpa?.toFixed(2) ?? '' });
  const chips = [level, basis, merit.priorName ? format(t.priorChip, { name: merit.priorName }) : null, interestTypes ? format(t.interestChip, { types: interestTypes }) : t.noInterestChip];
  if (generatedAt) chips.push(format(t.updated, { date: generatedAt.toLocaleDateString(lang === 'ms' ? 'ms-MY' : 'en-MY', { day: 'numeric', month: 'short', year: 'numeric' }) }));
  return (
    <section aria-label={t.basedOn} className="flex flex-wrap items-center gap-2 rounded-[18px] bg-white p-4">
      <span className="text-sm font-semibold">{t.basedOn}</span>
      {chips.filter(Boolean).map((c) => (
        <span key={c} className="rounded-full bg-bg px-3 py-1.5 text-[13px] font-medium">
          {c}
        </span>
      ))}
      <span className="flex flex-wrap gap-2 sm:ml-auto">
        <Link href={`/${lang}/profil`} className="rounded-full border border-line px-3 py-1.5 text-[13px] font-semibold hover:bg-bg">
          {t.checkData} →
        </Link>
        <form action={recalculateRecommendations}>
          <input type="hidden" name="locale" value={lang} />
          <RefreshButton label={t.refresh} busyLabel={t.refreshing} />
        </form>
      </span>
    </section>
  );
}

/** The order of the current tab, chosen by the student, then each match level's colour and range. */
function SortBar({ t, sort, href }: { t: Dictionary['recommendations']; sort: Sort; href: (sort: Sort) => string }) {
  return (
    <div className="flex flex-col gap-2 rounded-[18px] bg-white p-3">
      <nav aria-label={t.sort.label} className="flex flex-wrap items-center gap-1.5">
        <span className="px-1 text-[13px] font-semibold text-muted">{t.sort.label}:</span>
        {SORTS.map((x) => (
          <Link
            key={x}
            href={href(x)}
            scroll={false}
            aria-current={x === sort ? 'true' : undefined}
            className={`whitespace-nowrap rounded-full px-3 py-1 text-[13px] font-semibold ${x === sort ? 'bg-navy text-white' : 'bg-bg text-navy hover:bg-line'}`}
          >
            {t.sort[x]}
          </Link>
        ))}
      </nav>
      <p className="flex flex-wrap gap-x-4 gap-y-1 px-1 text-xs text-muted">
        {(['strong', 'fair', 'weak'] as const).map((m) => (
          <span key={m} className="inline-flex items-center gap-1.5">
            <span aria-hidden="true" className={`size-2 rounded-full ${MATCH_STYLE[m].dot}`} />
            {t.match[m]} {t.matchRange[m]}
          </span>
        ))}
      </p>
    </div>
  );
}

/** Orders a tab's programmes; ties keep the overall score's order. */
function sortItems(items: Recommendation[], sort: Sort, merit: { mode: MeritInputs['mode']; merit: number } | null, lang: Locale): Recommendation[] {
  const byScore = (a: Recommendation, b: Recommendation) => b.score - a.score;
  const gap = (i: Recommendation) => {
    const c = merit ? compareMerit(merit, { entryRoutes: i.details.entryRoutes, averageMerit: i.details.averageMerit }) : null;
    return c?.status === 'comparable' ? c.gap : Number.NEGATIVE_INFINITY;
  };
  const key: Record<Sort, (a: Recommendation, b: Recommendation) => number> = {
    match: byScore,
    continuity: (a, b) => (b.details.continuity?.score ?? -1) - (a.details.continuity?.score ?? -1) || byScore(a, b),
    interest: (a, b) => (b.details.interest?.fit ?? -1) - (a.details.interest?.fit ?? -1) || byScore(a, b),
    chance: (a, b) => {
      const [x, y] = [gap(a), gap(b)];
      return x === y ? byScore(a, b) : y > x ? 1 : -1;
    },
    name: (a, b) => a.programName.localeCompare(b.programName, lang),
  };
  return [...items].sort(key[sort]);
}

/** Pages of the current tab: previous, numbered, next. */
function Pagination({ dict, page, totalPages, href }: { dict: Dictionary; page: number; totalPages: number; href: (page: number) => string }) {
  const t = dict.recommendations.pagination;
  const pill = 'inline-flex h-9 min-w-9 items-center justify-center rounded-full px-3 text-sm font-semibold';
  const edge = (n: number, label: string, enabled: boolean) =>
    enabled ? (
      <Link href={href(n)} className={`${pill} bg-white text-navy hover:bg-white/70`}>
        {label}
      </Link>
    ) : (
      <span aria-disabled="true" className={`${pill} text-muted`}>
        {label}
      </span>
    );
  return (
    <nav aria-label={t.label} className="flex flex-wrap items-center justify-center gap-2">
      {edge(page - 1, `← ${t.prev}`, page > 1)}
      {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
        <Link key={n} href={href(n)} aria-current={n === page ? 'page' : undefined} className={`${pill} ${n === page ? 'bg-navy text-white' : 'bg-white text-navy hover:bg-white/70'}`}>
          {n}
        </Link>
      ))}
      {edge(page + 1, `${t.next} →`, page < totalPages)}
      <span className="sr-only">{format(t.page, { n: page, total: totalPages })}</span>
    </nav>
  );
}

function Prompt({ title, body, href, action }: { title: string; body: string; href: string; action: string }) {
  return (
    <section className="flex flex-col gap-3 rounded-[18px] bg-cream p-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-col gap-1">
        <h2 className="text-[17px] font-semibold">{title}</h2>
        <p className="text-sm">{body}</p>
      </div>
      <Link href={href} className="inline-flex h-10 shrink-0 items-center self-start rounded-[10px] bg-navy px-4 text-sm font-semibold text-white hover:bg-navy/90 sm:self-center">
        {action} →
      </Link>
    </section>
  );
}

function Card({
  lang,
  dict,
  item,
  reference,
  merit,
  typeNames,
  saved,
}: {
  lang: Locale;
  dict: Dictionary;
  item: Recommendation;
  reference: Awaited<ReturnType<typeof getReferenceData>>;
  merit: { mode: MeritInputs['mode']; merit: number } | null;
  typeNames: (types: RiasecType[]) => string;
  /** Whether the student saved it; null when the saved list could not be read (no button then). */
  saved: boolean | null;
}) {
  const t = dict.recommendations;
  const d = item.details;
  const subjectNames = new Map(reference.subjects.map((s) => [s.id, lang === 'en' && s.nameEn ? s.nameEn : s.name]));
  const institution = reference.institutions.find((i) => i.id === d.institutionId);
  const field = d.interest?.fieldId ? reference.fields.find((f) => f.id === d.interest!.fieldId) : undefined;
  const fieldLabel = field ? fieldName(field, lang) : null;
  const years = d.durationSemesters ? format(t.years, { n: d.durationSemesters / 2 }) : null;
  const subtitle = [institution?.name ?? t.streamProvider, (dict.levels as Record<string, string>)[d.studyLevel] ?? d.studyLevel, years].filter(Boolean).join(' · ');
  type Rule = Recommendation['details']['met'][number];
  // Chips say it in a few words; the full sentence is the chip's tooltip and what screen readers hear.
  const say = (rule: Rule, texts: Parameters<typeof explainRule>[2]) => explainRule(rule, subjectNames, texts);

  // Interests: the level, and what it rests on (the specialisation, or the shared types).
  const interest = d.interest;
  const special = interest?.specialisation ? (t.specialisations as Record<string, string>)[interest.specialisation] : undefined;
  const specialShort = interest?.specialisation ? (t.specialisationShort as Record<string, string>)[interest.specialisation] : undefined;
  const types = interest?.sharedTypes.length ? typeNames(interest.sharedTypes.slice(0, 2)) : null;
  const interestSentence = !interest
    ? undefined
    : interest.level === 'low'
      ? fieldLabel
        ? format(t.interestWeak, { field: fieldLabel })
        : t.interestWeakNoField
      : special && types
        ? format(t.interestMatchSpecialisation, { types, name: special })
        : types && fieldLabel
          ? format(t.interestMatch, { types, field: fieldLabel })
          : types
            ? format(t.interestMatchNoField, { types })
            : undefined;

  // Earlier study: the same field, a related one, or another.
  const continuity = d.continuity;
  const priorName = continuity ? (continuity.name ?? (dict.levels as Record<string, string>)[continuity.qualification] ?? continuity.qualification) : null;
  const closeName = (continuity?.textSimilarity ?? 0) >= 0.7;
  const fieldMatch = continuity ? (continuity.fieldMatch ?? (closeName ? 'related' : 'none')) : null;
  const continuitySentence =
    fieldMatch && priorName
      ? format(fieldMatch === 'same' ? t.continuitySame : fieldMatch === 'related' ? (continuity!.fieldMatch ? t.continuityRelated : t.continuityText) : t.continuityNone, { name: priorName })
      : undefined;

  // Offer chance: the student's merit against the programme's average, only when both are from the same candidates.
  const comparison = merit ? compareMerit(merit, { entryRoutes: d.entryRoutes, averageMerit: d.averageMerit }) : null;
  const chance = comparison?.status === 'comparable' ? CHANCE_LEVEL[comparison.band] : null;
  const chanceSentence =
    comparison?.status === 'comparable'
      ? format(dict.meritStanding.bands[comparison.band], {
          merit: (comparison.average + comparison.gap).toFixed(2),
          average: comparison.average.toFixed(2),
          year: comparison.year,
          gap: Math.abs(comparison.gap).toFixed(2),
        })
      : merit
        ? t.chance.noData
        : t.chance.noMerit;

  // Requirements: what is still missing first, then what is met.
  const unmet = d.unmet.map((group) =>
    group.length > 1
      ? { label: group.map((r) => say(r, t.rules.chipUnmet)).join(t.oneOfJoin), title: format(t.oneOf, { rules: group.map((r) => say(r, dict.eligibility)).join(t.oneOfJoin) }) }
      : { label: say(group[0]!, t.rules.chipUnmet), title: say(group[0]!, t.rules.unmet) },
  );
  const met = d.met.map((r) => ({ label: say(r, t.rules.chipMet), title: say(r, t.rules.met) }));
  const shownMet = met.slice(0, MET_CHIPS);

  const titleId = `rec-${item.programId}`;
  const match = matchOf(item.score);

  return (
    <article aria-labelledby={titleId} className="flex flex-col gap-4 rounded-[22px] bg-white p-5 sm:p-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-1">
          {item.isTopMatch && <p className="text-xs font-semibold uppercase tracking-wide text-muted">{t.topMatch}</p>}
          <h2 id={titleId} className="text-[20px] font-semibold leading-tight">
            {item.programName}
          </h2>
          <p className="text-sm text-muted">{subtitle}</p>
        </div>
        <div className="flex flex-wrap gap-2 sm:flex-col sm:items-end">
          <span className={`whitespace-nowrap rounded-full px-3 py-1 text-[13px] font-semibold ${STATUS_STYLE[item.eligibility]}`}>
            {t.status[item.eligibility]}
            {item.isTargetBased && t.targetSuffix}
          </span>
          <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1 text-[13px] font-semibold ${MATCH_STYLE[match].badge}`}>
            <span aria-hidden="true" className={`size-2 rounded-full ${MATCH_STYLE[match].dot}`} />
            {t.match[match]} · {item.score}
          </span>
        </div>
      </header>

      <div className={`grid gap-2 ${continuity ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}`}>
        <Tile
          icon="/icons/compass.svg"
          label={t.tiles.interest}
          level={interest?.level ?? null}
          value={interest ? t.levels[interest.level] : t.tiles.noInterest}
          hint={specialShort ?? types ?? fieldLabel}
          title={interestSentence}
        />
        {continuity && fieldMatch && (
          <Tile icon="/icons/route.svg" label={t.tiles.continuity} level={FIELD_LEVEL[fieldMatch]} value={t.continuityShort[fieldMatch]} hint={priorName} title={continuitySentence} />
        )}
        <Tile
          icon="/icons/calc.svg"
          label={t.chance.label}
          level={chance}
          value={chance ? t.chance[chance] : t.chance.none}
          hint={comparison?.status === 'comparable' ? format(t.chance.vs, { merit: (comparison.average + comparison.gap).toFixed(1), average: comparison.average.toFixed(1) }) : null}
          title={chanceSentence}
        />
      </div>

      {(unmet.length > 0 || met.length > 0 || d.toConfirm.length > 0) && (
        <section className="flex flex-col gap-2">
          <h3 className="text-[13px] font-semibold text-muted">{t.requirements}</h3>
          <ul className="flex flex-wrap gap-1.5">
            {unmet.map((c) => (
              <Chip key={c.label} kind="unmet" {...c} />
            ))}
            {shownMet.map((c) => (
              <Chip key={c.label} kind="met" {...c} />
            ))}
            {met.length > shownMet.length && (
              <Chip kind="more" label={format(t.moreMet, { n: met.length - shownMet.length })} title={met.slice(MET_CHIPS).map((c) => c.title).join('\n')} />
            )}
            {d.toConfirm.length > 0 && <Chip kind="check" label={format(t.toConfirmChip, { n: d.toConfirm.length })} title={format(t.toConfirm, { n: d.toConfirm.length })} />}
          </ul>
        </section>
      )}

      <footer className="flex flex-col gap-3 border-t border-line pt-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="flex items-center gap-1.5 text-xs text-muted" title={t.source}>
          <Icon src="/icons/check.svg" size={14} />
          {t.sourceShort}
        </p>
        <div className="flex flex-wrap gap-2">
          {saved !== null && <SaveButton locale={lang} programId={item.programId} initialSaved={saved} t={dict.saved.button} tone="outline" />}
          <Link
            href={`/${lang}/teroka/${item.programId}`}
            className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-[10px] bg-navy px-5 text-sm font-semibold text-white hover:bg-navy/90"
          >
            {t.viewRequirements} →
          </Link>
        </div>
      </footer>
    </article>
  );
}

/** Met requirements shown as chips; the rest are summed up in a "+n" chip. */
const MET_CHIPS = 4;
const LEVEL_STYLE: Record<Level, { bars: number; fill: string; text: string }> = {
  high: { bars: 3, fill: 'bg-[#1f8a5b]', text: 'text-[#145c3b]' },
  medium: { bars: 2, fill: 'bg-[#d49a1f]', text: 'text-[#7a4f06]' },
  low: { bars: 1, fill: 'bg-[#8a94a6]', text: 'text-[#4a5568]' },
};
const FIELD_LEVEL: Record<'same' | 'related' | 'none', Level> = { same: 'high', related: 'medium', none: 'low' };

/** One signal at a glance: an icon, a three-step meter and a word or two; the full sentence is its tooltip. */
function Tile({ icon, label, level, value, hint, title }: { icon: string; label: string; level: Level | null; value: string; hint: string | null; title?: string }) {
  return (
    <div title={title} className="flex items-center gap-3 rounded-[14px] bg-bg px-3 py-2.5 sm:flex-col sm:items-start sm:gap-1.5">
      <span className="flex w-[118px] shrink-0 items-center gap-1.5 text-xs font-semibold text-muted sm:w-auto">
        <Icon src={icon} size={15} />
        {label}
      </span>
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className={`flex items-center gap-2 text-sm font-semibold ${level ? LEVEL_STYLE[level].text : 'text-muted'}`}>
          {level && (
            <span aria-hidden="true" className="flex gap-0.5">
              {[1, 2, 3].map((n) => (
                <span key={n} className={`h-1.5 w-3.5 rounded-full ${n <= LEVEL_STYLE[level].bars ? LEVEL_STYLE[level].fill : 'bg-line'}`} />
              ))}
            </span>
          )}
          {value}
        </span>
        {hint && <span className="truncate text-xs text-muted">{hint}</span>}
        {title && <span className="sr-only">{title}</span>}
      </span>
    </div>
  );
}

// Marks drawn in the chip's own text colour (currentColor), so one icon serves every chip colour.
const MARK_PATHS = {
  met: 'M16.6667 5L7.5 14.1667L3.33333 10',
  unmet: 'M15 5L5 15M5 5L15 15',
  check: 'M10 13.3333V10M10 6.66667H10.0083M18.3333 10C18.3333 14.6024 14.6024 18.3333 10 18.3333C5.39763 18.3333 1.66667 14.6024 1.66667 10C1.66667 5.39763 5.39763 1.66667 10 1.66667C14.6024 1.66667 18.3333 5.39763 18.3333 10Z',
} as const;

const CHIP_STYLE = {
  met: { box: 'bg-[#e8f6ee] text-[#145c3b]', mark: MARK_PATHS.met },
  unmet: { box: 'bg-[#fdecea] text-[#9b2c2c]', mark: MARK_PATHS.unmet },
  check: { box: 'bg-cream text-navy', mark: MARK_PATHS.check },
  more: { box: 'bg-bg text-muted', mark: null },
} as const;

/** A requirement in a few words, ticked or crossed; the full sentence is its tooltip and what screen readers hear. */
function Chip({ kind, label, title }: { kind: keyof typeof CHIP_STYLE; label: string; title: string }) {
  const style = CHIP_STYLE[kind];
  return (
    <li title={title} className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[13px] font-medium ${style.box}`}>
      {style.mark && (
        <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className="size-3.5 shrink-0">
          <path d={style.mark} stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
      <span aria-hidden="true">{label}</span>
      <span className="sr-only">{title}</span>
    </li>
  );
}

const BADGES = [
  { key: 'verified', icon: '/icons/check.svg' },
  { key: 'local', icon: '/icons/lock.svg' },
  { key: 'guide', icon: '/icons/info.svg' },
] as const;

/** How the list is made, as a compact picture: the gate, the weights, the match levels and the offer chance. */
function HowItWorks({ t }: { t: Dictionary['recommendations'] }) {
  const h = t.how;
  const weights = [
    { key: 'interest', pct: 40, icon: '/icons/compass.svg', fill: 'bg-navy text-white' },
    { key: 'subjects', pct: 35, icon: '/icons/calc.svg', fill: 'bg-[#4f6fc9] text-white' },
    { key: 'continuity', pct: 25, icon: '/icons/route.svg', fill: 'bg-[#a9bdf0] text-navy' },
  ] as const;
  const heading = (n: number, title: string, hint: string) => (
    <h3 title={hint} className="flex items-center gap-2 text-[13px] font-semibold">
      <span aria-hidden="true" className="flex size-5 shrink-0 items-center justify-center rounded-full bg-navy text-[11px] text-white">
        {n}
      </span>
      {title}
      <span className="sr-only">{hint}</span>
    </h3>
  );
  return (
    <aside aria-labelledby="how-title" className="flex flex-col gap-3 rounded-[22px] bg-blue p-4 lg:sticky lg:top-6">
      <div className="flex items-center gap-2.5">
        <Image src="/illustrations/rimau-waving.png" alt="" width={44} height={44} className="shrink-0" />
        <h2 id="how-title" className="text-[17px] font-semibold leading-tight">
          {h.title}
        </h2>
      </div>

      <div className="flex flex-col divide-y divide-line rounded-[14px] bg-white px-3.5">
        <section className="flex flex-col gap-2 py-3">
          {heading(1, h.filter.title, h.filter.caption)}
          <div className="flex flex-wrap gap-1">
            {STATUSES.map((s) => (
              <span key={s} className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATUS_STYLE[s]}`}>
                {t.status[s]}
              </span>
            ))}
          </div>
        </section>

        <section className="flex flex-col gap-2 py-3">
          {heading(2, h.weigh.title, h.weigh.noPrior)}
          <div className="flex h-5 overflow-hidden rounded-full text-[10px] font-bold">
            {weights.map((w) => (
              <span key={w.key} style={{ width: `${w.pct}%` }} className={`flex items-center justify-center ${w.fill}`}>
                {w.pct}%
              </span>
            ))}
          </div>
          <ul className="flex flex-wrap gap-x-3 gap-y-1">
            {weights.map((w) => (
              <li key={w.key} className="inline-flex items-center gap-1 text-[11px] font-medium">
                <span aria-hidden="true" className={`size-2 shrink-0 rounded-full ${w.fill.split(' ')[0]}`} />
                <Icon src={w.icon} size={12} />
                {h.weigh[w.key]}
              </li>
            ))}
          </ul>
        </section>

        <div className="grid grid-cols-2 gap-3 py-3">
          <section className="flex flex-col gap-1.5">
            {heading(3, h.levels.title, h.levels.caption)}
            <ul className="flex flex-col gap-1">
              {(['strong', 'fair', 'weak'] as const).map((m) => (
                <li key={m} className="flex items-center gap-1.5 text-[11px]">
                  <span aria-hidden="true" className={`size-2 shrink-0 rounded-full ${MATCH_STYLE[m].dot}`} />
                  <span className="font-semibold">{h.levels.range[m]}</span>
                  <span className="sr-only">{t.match[m]}</span>
                </li>
              ))}
            </ul>
          </section>
          <section className="flex flex-col gap-1.5">
            {heading(4, h.chance.title, h.chance.caption)}
            <ul className="flex flex-col gap-1">
              {(['high', 'medium', 'low'] as const).map((level) => (
                <li key={level} className="flex items-center gap-1.5 text-[11px]">
                  <span aria-hidden="true" className="flex gap-0.5">
                    {[1, 2, 3].map((n) => (
                      <span key={n} className={`h-1.5 w-2.5 rounded-full ${n <= LEVEL_STYLE[level].bars ? LEVEL_STYLE[level].fill : 'bg-line'}`} />
                    ))}
                  </span>
                  <span className="font-semibold">{h.chance.range[level]}</span>
                  <span className="sr-only">{t.levels[level]}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>

      <ul className="flex flex-wrap gap-x-3 gap-y-1 px-1">
        {BADGES.map(({ key, icon }) => (
          <li key={key} className="inline-flex items-center gap-1 text-[11px] font-semibold">
            <Icon src={icon} size={12} />
            {h.badges[key]}
          </li>
        ))}
      </ul>
    </aside>
  );
}
