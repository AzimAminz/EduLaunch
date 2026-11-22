import Link from 'next/link';
import { notFound } from 'next/navigation';
import { lang as rootLang } from 'next/root-params';
import { Pending } from '@/components/ui/pending';
import { getProgramme, getReferenceData } from '@/lib/catalogue/api';
import type { ProgramDetail } from '@edulaunch/contracts';
import { differs, MAX_COMPARED, pickCompared } from '@/lib/compare/selection';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { format, isLocale, type Dictionary, type Locale } from '@/lib/i18n/locale';
import { compareMerit } from '@/lib/merit/compare';
import { loadMeritInputs, studentMerit } from '@/lib/merit/student';
import { listSavedProgrammes } from '@/lib/profile/api';
import { getEligibility, getRecommendations, type Recommendation } from '@/lib/recommendation/api';
import { CHANCE_LEVEL } from '@/lib/recommendation/present';
import { getAccessToken } from '@/lib/supabase/server';

/**
 * "Banding" (Figma: Portal / Compare selected programs): up to three saved programmes side by side, with the rows
 * where they differ marked. Only facts the catalogue holds and what the student's own results say; a row nobody
 * has data for is left out rather than filled with "not available".
 */
export default async function ComparePage({ searchParams }: PageProps<'/[lang]/banding'>) {
  const lang = await rootLang();
  if (!isLocale(lang)) notFound();
  const dict = await getDictionary(lang);
  const t = dict.compare;
  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-[28px] font-bold leading-tight lg:text-[36px]">{t.title}</h1>
        <p className="text-[15px] text-muted">{t.intro}</p>
      </header>
      <Pending label={t.loading} variant="panels">
        <Compare lang={lang} dict={dict} searchParams={searchParams} />
      </Pending>
    </div>
  );
}

type Status = 'eligible' | 'almost' | 'not_yet' | null;

async function Compare({ lang, dict, searchParams }: { lang: Locale; dict: Dictionary; searchParams: PageProps<'/[lang]/banding'>['searchParams'] }) {
  const t = dict.compare;
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
  const newest = [...saved].sort((a, b) => (b.savedAt?.getTime() ?? 0) - (a.savedAt?.getTime() ?? 0)).map((s) => s.programId);
  if (newest.length < 2)
    return (
      <section className="flex flex-col items-start gap-3 rounded-[22px] bg-white p-6 sm:p-8">
        <h2 className="text-[20px] font-bold">{t.needTwoTitle}</h2>
        <p className="text-sm text-muted">{format(t.needTwoBody, { count: newest.length })}</p>
        <Link href={`/${lang}/cadangan`} className="inline-flex h-11 items-center rounded-[12px] bg-navy px-5 text-sm font-semibold text-white hover:bg-navy/90">
          {dict.nav.recommendations}
        </Link>
      </section>
    );

  const { ids, tooMany } = pickCompared(sp.p, newest);
  const [programmes, reference, recs, merit] = await Promise.all([
    Promise.all(newest.map((id) => getProgramme(id).catch(() => null))),
    getReferenceData().catch(() => null),
    getRecommendations(token).catch(() => null),
    loadMeritInputs(token, lang).catch(() => null),
  ]);
  const byId = new Map(programmes.filter((p): p is ProgramDetail => p !== null).map((p) => [p.id, p]));
  const chosen = ids.map((id) => byId.get(id)).filter((p): p is ProgramDetail => Boolean(p));
  const inList = new Map((recs?.items ?? []).map((i) => [i.programId, i]));
  // Where the student stands on each: their list, or checked on the spot.
  const statuses: Status[] = await Promise.all(
    chosen.map(async (p) => {
      const rec = inList.get(p.id);
      if (rec) return rec.eligibility;
      const answer = await getEligibility(token, p.id).catch(() => null);
      return answer?.state === 'checked' ? answer.status : null;
    }),
  );
  const myMerit = merit ? studentMerit(merit) : null;
  const institution = (p: ProgramDetail) => reference?.institutions.find((i) => i.id === p.institutionId)?.name ?? dict.recommendations.streamProvider;
  const yes = (on: boolean) => (on ? t.yes : t.no);
  const rec = (p: ProgramDetail): Recommendation | undefined => inList.get(p.id);

  const rows: Array<{ label: string; values: Array<string | null> }> = [
    { label: dict.detail.info.institution, values: chosen.map(institution) },
    { label: dict.detail.facts.level, values: chosen.map((p) => (dict.levels as Record<string, string>)[p.studyLevel] ?? p.studyLevel) },
    { label: dict.detail.facts.duration, values: chosen.map((p) => (p.durationSemesters ? format(t.semesters, { n: p.durationSemesters, years: p.durationSemesters / 2 }) : null)) },
    { label: dict.detail.facts.mode, values: chosen.map((p) => (p.details.studyMode ? ((dict.detail.modes as Record<string, string>)[p.details.studyMode] ?? p.details.studyMode) : null)) },
    { label: dict.detail.info.campuses, values: chosen.map((p) => (p.details.campuses.length ? p.details.campuses.join(', ') : null)) },
    { label: t.averageMerit, values: chosen.map((p) => (p.averageMerit ? `${p.averageMerit.value.toFixed(2)} (${p.averageMerit.intakeYear})` : null)) },
    { label: t.yourStatus, values: statuses.map((s) => (s ? dict.recommendations.status[s] : null)) },
    {
      label: dict.recommendations.chance.label,
      values: chosen.map((p) => {
        if (!merit || myMerit === null) return null;
        const c = compareMerit({ mode: merit.mode, merit: myMerit }, { entryRoutes: p.entryRoutes, averageMerit: p.averageMerit });
        return c.status === 'comparable' ? dict.recommendations.chance[CHANCE_LEVEL[c.band]] : null;
      }),
    },
    { label: t.interestFit, values: chosen.map((p) => (rec(p)?.details.interest ? dict.recommendations.levels[rec(p)!.details.interest!.level] : null)) },
    { label: dict.detail.flags.interview, values: chosen.map((p) => yes(p.details.hasInterview)) },
    { label: dict.detail.flags.bumiputera, values: chosen.map((p) => yes(p.details.bumiputeraOnly)) },
    { label: t.category, values: chosen.map((p) => [p.details.isStem && dict.detail.flags.stem, p.details.isTvet && dict.detail.flags.tvet].filter(Boolean).join(' · ') || null) },
    { label: dict.detail.careers, values: chosen.map((p) => (p.details.careers.length ? p.details.careers.slice(0, 3).join(', ') : null)) },
    { label: dict.detail.fees, values: chosen.map((p) => p.details.fees) },
  ].filter((r) => r.values.some((v) => v !== null && v !== ''));
  const without = (id: string) => `/${lang}/banding?p=${chosen.filter((p) => p.id !== id).map((p) => p.id).join(',')}`;
  const anyDiff = rows.some((r) => differs(r.values));

  return (
    <>
      {tooMany && <p className="rounded-[12px] bg-cream px-4 py-3 text-sm">{format(t.tooMany, { max: MAX_COMPARED })}</p>}

      {chosen.length >= 2 ? (
        <div className="overflow-x-auto rounded-[18px] border border-line bg-white">
          <table className="w-full min-w-[640px] border-collapse text-left text-sm">
            <caption className="sr-only">{t.title}</caption>
            <thead>
              <tr className="bg-navy text-white">
                <th scope="col" className="sticky left-0 z-10 w-[120px] bg-navy px-3 py-4 sm:w-[180px] sm:px-4 align-bottom text-[12px] font-semibold uppercase tracking-wide text-white/70">
                  {t.item}
                </th>
                {chosen.map((p) => (
                  <th key={p.id} scope="col" className="px-4 py-4 align-top font-normal">
                    <p className="text-[12px] font-semibold text-yellow">{institution(p)}</p>
                    <Link href={`/${lang}/teroka/${p.id}`} className="mt-1 block text-[16px] font-bold leading-snug hover:underline">
                      {p.name}
                    </Link>
                    <Link href={without(p.id)} className="mt-2 inline-block text-[12px] text-white/70 underline underline-offset-2 hover:text-white">
                      {t.remove}
                    </Link>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const diff = differs(r.values);
                return (
                  <tr key={r.label} className="border-t border-line">
                    <th scope="row" className="sticky left-0 z-10 bg-blue px-3 py-3 font-semibold sm:px-4">
                      {r.label}
                      {diff && <span className="sr-only"> ({t.differs})</span>}
                    </th>
                    {r.values.map((v, i) => (
                      <td key={chosen[i]!.id} className={`px-4 py-3 ${diff ? 'bg-cream font-semibold' : ''}`}>
                        {v ?? <span className="text-muted">—</span>}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="rounded-[12px] bg-cream px-4 py-3 text-sm">{t.pickTwo}</p>
      )}
      {anyDiff && (
        <p className="flex items-center gap-2 text-[13px] text-muted">
          <span aria-hidden className="size-4 rounded-[4px] border border-[#e8c96a] bg-cream" />
          {t.legend}
        </p>
      )}

      {/* Pick from the saved programmes; a plain form, so it works without JavaScript. */}
      <form action={`/${lang}/banding`} className="flex flex-col gap-3 rounded-[18px] bg-white p-5 sm:p-6">
        <fieldset className="flex min-w-0 flex-col gap-2">
          <legend className="pb-2 text-[17px] font-semibold">{format(t.pick, { max: MAX_COMPARED })}</legend>
          {newest.map((id) => {
            const p = byId.get(id);
            if (!p) return null;
            return (
              <label key={id} className="flex cursor-pointer items-center gap-3 rounded-[12px] px-3 py-2.5 hover:bg-bg">
                <input type="checkbox" name="p" value={id} defaultChecked={ids.includes(id)} className="size-5 shrink-0 accent-[#142747]" />
                <span className="flex min-w-0 flex-col">
                  <span className="truncate font-semibold">{p.name}</span>
                  <span className="truncate text-[13px] text-muted">{institution(p)}</span>
                </span>
              </label>
            );
          })}
        </fieldset>
        <button type="submit" className="inline-flex h-11 items-center self-start rounded-[12px] bg-navy px-5 text-sm font-semibold text-white hover:bg-navy/90">
          {t.update}
        </button>
      </form>
    </>
  );
}
