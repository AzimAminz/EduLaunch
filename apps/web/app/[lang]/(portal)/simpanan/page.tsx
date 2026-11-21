import Link from 'next/link';
import { notFound } from 'next/navigation';
import { lang as rootLang } from 'next/root-params';
import { SaveButton } from '@/components/saved/save-button';
import { Pending } from '@/components/ui/pending';
import { getProgramme, getReferenceData } from '@/lib/catalogue/api';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { format, isLocale, type Dictionary, type Locale } from '@/lib/i18n/locale';
import { listSavedProgrammes } from '@/lib/profile/api';
import { getEligibility, getRecommendations, type EligibilityAnswer } from '@/lib/recommendation/api';
import { getAccessToken } from '@/lib/supabase/server';

const PAGE_SIZE = 12;
/** Where the student stands; when it cannot be checked, why (the programme's routes, missing results, no requirements yet). */
type Status = 'eligible' | 'almost' | 'not_yet' | 'no_route' | 'no_results' | 'no_requirement';
const STATUS_STYLE: Record<Status, string> = {
  eligible: 'bg-mint text-[#145c3b]',
  almost: 'bg-cream text-[#7a4f06]',
  not_yet: 'bg-red/10 text-[#9c302b]',
  no_route: 'bg-bg text-muted',
  no_results: 'bg-bg text-muted',
  no_requirement: 'bg-bg text-muted',
};

/**
 * "Pilihan disimpan": the programmes the student is following, newest first, each with where they stand (from their
 * recommendations, or checked on the spot for a programme outside that list). Saved programmes are the ones whose
 * requirement changes the student is told about.
 */
export default async function SavedPage({ searchParams }: PageProps<'/[lang]/simpanan'>) {
  const lang = await rootLang();
  if (!isLocale(lang)) notFound();
  const dict = await getDictionary(lang);
  const t = dict.saved;
  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-[28px] font-bold leading-tight lg:text-[36px]">{t.title}</h1>
        <p className="text-[15px] text-muted">{t.intro}</p>
      </header>
      <Pending label={t.loading} variant="panels">
        <SavedList lang={lang} dict={dict} searchParams={searchParams} />
      </Pending>
    </div>
  );
}

const statusOf = (answer: EligibilityAnswer | null): Status => (!answer ? 'no_requirement' : answer.state === 'checked' ? answer.status : answer.state);

async function SavedList({ lang, dict, searchParams }: { lang: Locale; dict: Dictionary; searchParams: PageProps<'/[lang]/simpanan'>['searchParams'] }) {
  const t = dict.saved;
  const [sp, token] = await Promise.all([searchParams, getAccessToken()]);
  if (!token) notFound();
  let saved: Awaited<ReturnType<typeof listSavedProgrammes>>;
  try {
    saved = await listSavedProgrammes(token);
  } catch {
    return (
      <p role="alert" className="rounded-[18px] border border-line bg-white p-6 text-sm">
        {t.unavailable}
      </p>
    );
  }
  if (saved.length === 0)
    return (
      <section className="flex flex-col items-start gap-3 rounded-[22px] bg-white p-6 sm:p-8">
        <h2 className="text-[20px] font-bold">{t.emptyTitle}</h2>
        <p className="text-sm text-muted">{t.emptyBody}</p>
        <div className="flex flex-wrap gap-2">
          <Link href={`/${lang}/cadangan`} className="inline-flex h-11 items-center rounded-[12px] bg-navy px-5 text-sm font-semibold text-white hover:bg-navy/90">
            {dict.nav.recommendations}
          </Link>
          <Link href={`/${lang}/teroka`} className="inline-flex h-11 items-center rounded-[12px] border border-line bg-white px-5 text-sm font-semibold hover:bg-bg">
            {dict.nav.explore}
          </Link>
        </div>
      </section>
    );

  const newest = [...saved].sort((a, b) => (b.savedAt?.getTime() ?? 0) - (a.savedAt?.getTime() ?? 0));
  const totalPages = Math.max(1, Math.ceil(newest.length / PAGE_SIZE));
  const page = Math.min(totalPages, Math.max(1, Number.parseInt(String(sp.page ?? ''), 10) || 1));
  const shown = newest.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const [recs, reference] = await Promise.all([getRecommendations(token).catch(() => null), getReferenceData().catch(() => null)]);
  const inList = new Map((recs?.items ?? []).map((i) => [i.programId, i]));
  // Each saved programme: its facts from the catalogue, and where the student stands.
  const rows = await Promise.all(
    shown.map(async (s) => {
      const rec = inList.get(s.programId);
      const [programme, answer] = await Promise.all([getProgramme(s.programId).catch(() => null), rec ? Promise.resolve(null) : getEligibility(token, s.programId).catch(() => null)]);
      return { saved: s, programme, status: rec ? (rec.eligibility as Status) : statusOf(answer), name: programme?.name ?? rec?.programName ?? null };
    }),
  );

  return (
    <>
      <p className="text-sm text-muted">{format(t.count, { count: saved.length })}</p>
      <ul className="flex flex-col gap-3">
        {rows.map(({ saved: s, programme, status, name }) => {
          const institution = reference?.institutions.find((i) => i.id === programme?.institutionId)?.name ?? dict.recommendations.streamProvider;
          const years = programme?.durationSemesters ? format(dict.recommendations.years, { n: programme.durationSemesters / 2 }) : null;
          const level = programme ? ((dict.levels as Record<string, string>)[programme.studyLevel] ?? programme.studyLevel) : null;
          return (
            <li key={s.programId} className="flex flex-col gap-3 rounded-[18px] bg-white p-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 flex-col gap-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-full px-2.5 py-1 text-[12px] font-semibold ${STATUS_STYLE[status]}`}>{status === 'eligible' || status === 'almost' || status === 'not_yet' ? dict.recommendations.status[status] : t.cannotCheck[status]}</span>
                  {s.savedAt && <span className="text-[12px] text-muted">{format(t.savedOn, { date: s.savedAt.toLocaleDateString(lang === 'ms' ? 'ms-MY' : 'en-MY', { day: 'numeric', month: 'short', year: 'numeric' }) })}</span>}
                </div>
                {name ? (
                  <Link href={`/${lang}/teroka/${s.programId}`} className="text-[17px] font-semibold leading-snug hover:text-[#2f5bd3]">
                    {name}
                  </Link>
                ) : (
                  <p className="text-[17px] font-semibold text-muted">{t.gone}</p>
                )}
                {programme && <p className="text-sm text-muted">{[institution, level, years].filter(Boolean).join(' · ')}</p>}
              </div>
              <div className="flex shrink-0 flex-wrap gap-2">
                {name && (
                  <Link href={`/${lang}/teroka/${s.programId}`} className="inline-flex h-11 items-center rounded-[12px] border border-line bg-white px-4 text-sm font-semibold hover:bg-bg">
                    {t.view}
                  </Link>
                )}
                <SaveButton locale={lang} programId={s.programId} initialSaved t={t.button} tone="outline" />
              </div>
            </li>
          );
        })}
      </ul>
      {totalPages > 1 && (
        <nav aria-label={t.pages} className="flex items-center justify-between gap-3 text-sm">
          {page > 1 ? (
            <Link href={`/${lang}/simpanan?page=${page - 1}`} className="inline-flex h-11 items-center rounded-[12px] border border-line bg-white px-4 font-semibold hover:bg-bg">
              ← {t.previous}
            </Link>
          ) : (
            <span />
          )}
          <span className="text-muted">{format(t.pageOf, { page, total: totalPages })}</span>
          {page < totalPages ? (
            <Link href={`/${lang}/simpanan?page=${page + 1}`} className="inline-flex h-11 items-center rounded-[12px] border border-line bg-white px-4 font-semibold hover:bg-bg">
              {t.next} →
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}
      <p className="text-[13px] text-muted">{t.followNote}</p>
    </>
  );
}
