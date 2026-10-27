import Link from 'next/link';
import { Suspense } from 'react';
import { notFound, redirect } from 'next/navigation';
import { z } from 'zod';
import { AdminIcon } from '@/components/admin/icons';
import { ProgrammeTable } from '@/components/admin/programme-table';
import { AdminHeading, ButtonLink, HowItWorks, IconText, LoadError, Pagination, buttonClass } from '@/components/admin/ui';
import { ProgrammeSorts, ReviewStatus, listAdminInstitutions, listProgrammes } from '@/lib/admin/api';
import { listParamEntries, readListParams, type ListParams } from '@/lib/admin/list-params';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { format, isLocale, type Dictionary, type Locale } from '@/lib/i18n/locale';
import { getAccessToken, requireRole } from '@/lib/supabase/server';

type Search = Promise<Record<string, string | string[] | undefined>>;

/**
 * Programme list (Figma A5): search, filter by institution, status or "no published requirements", sort by a column,
 * page through, open a programme. Everything lives in the address (`?institusi=…&status=…&syarat=tiada&q=…&susun=…`),
 * so a filtered, sorted page can be linked to.
 */
export default async function AdminProgrammesPage({ params, searchParams }: PageProps<'/[lang]/admin/program'>) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const dict = await getDictionary(lang);
  return (
    <Suspense fallback={<p className="text-sm text-muted">…</p>}>
      <Programmes locale={lang} dict={dict} searchParams={searchParams} />
    </Suspense>
  );
}

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
type Filters = Partial<Record<'q' | 'status' | 'institusi' | 'syarat', string>>;
type Sort = (typeof ProgrammeSorts)[number];

async function Programmes({ locale, dict, searchParams }: { locale: Locale; dict: Dictionary; searchParams: Search }) {
  await requireRole(locale, 'admin');
  const t = dict.admin;
  const sp = await searchParams;
  const query = first(sp.q)?.trim().slice(0, 100) ?? '';
  const status = ReviewStatus.safeParse(first(sp.status)).data;
  const institutionId = z.uuid().safeParse(first(sp.institusi)).data;
  const missing = first(sp.syarat) === 'tiada';
  const list = readListParams<Sort>(sp, ProgrammeSorts, 'name');
  const base = `/${locale}/admin/program`;

  let page, institutions;
  try {
    const token = (await getAccessToken())!;
    [page, institutions] = await Promise.all([
      listProgrammes(token, { query, status, institutionId, missingRequirements: missing, sort: list.sort, direction: list.direction, page: list.page, pageSize: list.pageSize }),
      listAdminInstitutions(token),
    ]);
  } catch {
    return <LoadError text={t.errors.generic} />;
  }
  const institution = institutions.find((i) => i.id === institutionId);
  const filters: Filters = { q: query || undefined, status, institusi: institutionId, syarat: missing ? 'tiada' : undefined };

  /** The current address with some filters or the sort changed; a new filter or sort goes back to page 1. */
  const href = (change: Filters, next: ListParams<Sort> = { ...list, page: 1 }) => {
    const entries = Object.entries({ ...filters, ...change }).filter((e): e is [string, string] => !!e[1]);
    const qs = new URLSearchParams([...entries, ...listParamEntries(next, 'name')]).toString();
    return qs ? `${base}?${qs}` : base;
  };
  // A page past the end (for example after a filter shrank the list) goes to the last page.
  const last = Math.max(1, Math.ceil(page.total / page.pageSize));
  if (list.page > last) redirect(href({}, { ...list, page: last }));
  const chip = (active: boolean) =>
    `inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[13px] font-semibold transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy/40 ${
      active ? 'border-navy bg-navy text-white' : 'border-line bg-white hover:border-navy/30 hover:bg-bg'
    }`;
  const filtered = !!(query || status || institutionId || missing);

  return (
    <>
      <AdminHeading
        title={t.programmes.title}
        intro={format(t.programmes.intro, { total: page.total })}
        actions={
          <ButtonLink href={institutionId ? `${base}/baharu?institusi=${institutionId}` : `${base}/baharu`} primary icon="plus">
            {t.programmes.add}
          </ButtonLink>
        }
      />

      <div className="flex flex-col gap-3">
        <form action={base} className="flex gap-2">
          {status && <input type="hidden" name="status" value={status} />}
          {institutionId && <input type="hidden" name="institusi" value={institutionId} />}
          {missing && <input type="hidden" name="syarat" value="tiada" />}
          {list.sort !== 'name' && <input type="hidden" name="susun" value={list.sort} />}
          {list.direction === 'desc' && <input type="hidden" name="arah" value="desc" />}
          {list.pageSize !== 20 && <input type="hidden" name="saiz" value={list.pageSize} />}
          <label className="flex min-w-0 flex-1 items-center gap-2 rounded-[10px] border border-line bg-white px-3 text-muted transition-colors focus-within:border-navy/50 focus-within:ring-2 focus-within:ring-navy/15">
            <AdminIcon name="search" size={18} />
            <span className="sr-only">{t.programmes.search}</span>
            <input name="q" defaultValue={query} placeholder={t.programmes.search} className="min-w-0 flex-1 bg-transparent py-2.5 text-[15px] text-navy outline-none" />
          </label>
          <button type="submit" className={buttonClass('primary')}>
            <IconText icon="search">{t.programmes.searchButton}</IconText>
          </button>
        </form>

        {/* Institution: the catalogue's first level. */}
        <nav aria-label={t.programmes.columns.institution} className="flex flex-wrap gap-2">
          <Link href={href({ institusi: undefined })} aria-current={!institutionId ? 'page' : undefined} className={chip(!institutionId)}>
            {t.programmes.allInstitutions}
          </Link>
          {institutions.map((i) => (
            <Link key={i.id} href={href({ institusi: i.id })} aria-current={i.id === institutionId ? 'page' : undefined} className={chip(i.id === institutionId)} title={i.name}>
              <AdminIcon name="building" size={14} />
              {i.shortName ?? i.name}
            </Link>
          ))}
        </nav>

        <nav aria-label={t.programmes.columns.status} className="flex flex-wrap gap-2">
          <Link href={href({ status: undefined, syarat: undefined })} aria-current={!status && !missing ? 'page' : undefined} className={chip(!status && !missing)}>
            {t.programmes.allStatus}
          </Link>
          <Link href={href({ status: undefined, syarat: missing ? undefined : 'tiada' })} aria-current={missing ? 'page' : undefined} className={chip(missing)}>
            <AdminIcon name="alert" size={14} />
            {t.programmes.missingRequirements}
          </Link>
          {ReviewStatus.options.map((s) => (
            <Link key={s} href={href({ status: s, syarat: undefined })} aria-current={s === status ? 'page' : undefined} className={chip(s === status)}>
              {t.status[s]}
            </Link>
          ))}
        </nav>
        {(institution || filtered) && (
          <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
            {institution && (
              <Link href={`/${locale}/admin/institusi/${institution.id}`} className="inline-flex items-center gap-1 font-semibold hover:underline">
                {institution.name}
                <AdminIcon name="arrowRight" size={14} />
              </Link>
            )}
            {filtered && (
              <Link href={href({ q: undefined, status: undefined, institusi: undefined, syarat: undefined })} className="inline-flex items-center gap-1 text-muted hover:text-navy hover:underline">
                <AdminIcon name="x" size={14} />
                {t.programmes.clearFilters}
              </Link>
            )}
          </p>
        )}
      </div>

      <ProgrammeTable
        rows={page.items}
        locale={locale}
        dict={dict}
        now={new Date().getTime()}
        showInstitution={!institutionId}
        sort={{ sort: list.sort, direction: list.direction, href: (sort, direction) => href({}, { ...list, sort, direction, page: 1 }) }}
      />
      <Pagination page={page.page} pageSize={page.pageSize} total={page.total} href={(p) => href({}, { ...list, page: p })} sizeHref={(pageSize) => href({}, { ...list, pageSize, page: 1 })} t={t.pagination} />

      <HowItWorks title={t.programmes.how.title} steps={t.programmes.how.steps} />
    </>
  );
}
