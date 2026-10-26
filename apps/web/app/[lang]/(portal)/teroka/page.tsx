import { Suspense } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { SearchPanel } from '@/components/catalogue/search-panel';
import { ProgrammeCard, type RequirementStatus } from '@/components/catalogue/programme-card';
import { fieldName, getPublishedRequirements, getReferenceData, searchProgrammes } from '@/lib/catalogue/api';
import { programmeMeta } from '@/lib/catalogue/presentation';
import { filtersToQuery, parseFilters } from '@/lib/catalogue/search-params';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { format, isLocale, type Dictionary, type Locale } from '@/lib/i18n/locale';

type SearchParams = PageProps<'/[lang]/teroka'>['searchParams'];

export default async function DirectoryPage({ params, searchParams }: PageProps<'/[lang]/teroka'>) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const dict = await getDictionary(lang);
  const t = dict.directory;

  return (
    <>
      <header className="flex flex-col gap-[22px]">
        <p className="text-xs font-semibold leading-tight text-muted">{t.eyebrow}</p>
        <h1 className="text-[32px] font-bold leading-tight lg:text-[44px]">{t.title}</h1>
        <p className="text-[15px] leading-tight text-muted">{t.intro}</p>
      </header>
      <Suspense fallback={<div className="h-[164px] rounded-[18px] bg-navy" />}>
        <Search lang={lang} dict={dict} searchParams={searchParams} />
      </Suspense>
      <Suspense fallback={<p className="text-sm text-muted">{t.loading}</p>}>
        <Results lang={lang} dict={dict} searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function Search({ lang, dict, searchParams }: { lang: Locale; dict: Dictionary; searchParams: SearchParams }) {
  const filters = parseFilters(await searchParams);
  const { institutions, fields } = await getReferenceData();
  return (
    <SearchPanel
      action={`/${lang}/teroka`}
      filters={filters}
      institutions={institutions.map((i) => ({ value: i.id, label: i.name }))}
      fields={fields.map((f) => ({ value: f.id, label: fieldName(f, lang) })).sort((a, b) => a.label.localeCompare(b.label, lang))}
      dict={dict}
    />
  );
}

async function Results({ lang, dict, searchParams }: { lang: Locale; dict: Dictionary; searchParams: SearchParams }) {
  const t = dict.directory;
  const filters = parseFilters(await searchParams);

  let page: Awaited<ReturnType<typeof searchProgrammes>>;
  let reference: Awaited<ReturnType<typeof getReferenceData>>;
  let requirements: Awaited<ReturnType<typeof getPublishedRequirements>>;
  try {
    [page, reference] = await Promise.all([searchProgrammes(filters), getReferenceData()]);
    requirements = await getPublishedRequirements(page.items.map((p) => p.id));
  } catch {
    return (
      <div role="alert" className="rounded-[18px] border border-line bg-white p-6">
        <p className="text-lg font-semibold">{t.errorTitle}</p>
        <p className="text-sm text-muted">{t.errorBody}</p>
      </div>
    );
  }

  if (page.items.length === 0) {
    return (
      <div className="flex flex-col items-start gap-3 rounded-[22px] bg-white p-8">
        <p className="text-xl font-semibold">{t.emptyTitle}</p>
        <p className="text-sm text-muted">{t.emptyBody}</p>
        <Link href={`/${lang}/teroka`} className="rounded-[10px] bg-navy px-4 py-3 text-sm font-semibold text-white">
          {t.clearFilters}
        </Link>
      </div>
    );
  }

  const institutionName = new Map(reference.institutions.map((i) => [i.id, i.name]));
  const fieldsById = new Map(reference.fields.map((f) => [f.id, f]));
  const statusFor = (programId: string): RequirementStatus => {
    const req = requirements.find((r) => r.programId === programId);
    if (!req) return 'missing';
    return req.rules.some((r) => r.evidenceQuote?.startsWith('[Contoh]')) ? 'sample' : 'published';
  };
  const hasSample = page.items.some((p) => statusFor(p.id) === 'sample');
  const pages = Math.max(1, Math.ceil(page.total / page.pageSize));
  const pageHref = (n: number) => `/${lang}/teroka?${filtersToQuery({ ...filters, page: n })}`;

  return (
    <section aria-label={t.title} className="flex flex-col gap-[22px]">
      <p className="text-sm leading-tight text-muted">
        {format(t.resultCount, { count: page.total })}
        {hasSample && ` • ${t.sampleNote}`}
      </p>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
        {page.items.map((p) => {
          const fields = p.fieldIds.map((id) => fieldsById.get(id)).filter((f) => f !== undefined);
          return (
            <ProgrammeCard
              key={p.id}
              id={p.id}
              href={`/${lang}/teroka/${p.id}`}
              programmeName={p.name}
              institutionName={p.institutionId ? (institutionName.get(p.institutionId) ?? '') : dict.card.streamProvider}
              meta={programmeMeta(p.studyLevel, p.durationSemesters, dict)}
              fields={fields.map((f) => fieldName(f, lang))}
              requirementStatus={statusFor(p.id)}
              labels={dict.card}
            />
          );
        })}
      </div>
      {pages > 1 && (
        <nav aria-label={format(t.pageOf, { page: page.page, pages })} className="flex items-center justify-between gap-3">
          {page.page > 1 ? (
            <Link href={pageHref(page.page - 1)} className="rounded-2xl border border-line bg-white px-5 py-3 font-semibold">
              ← {t.previous}
            </Link>
          ) : (
            <span />
          )}
          <span className="text-sm text-muted">{format(t.pageOf, { page: page.page, pages })}</span>
          {page.page < pages ? (
            <Link href={pageHref(page.page + 1)} className="rounded-2xl border border-line bg-white px-5 py-3 font-semibold">
              {t.next} →
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}
    </section>
  );
}
