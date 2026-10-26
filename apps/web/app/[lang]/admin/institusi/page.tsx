import Link from 'next/link';
import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { AdminIcon } from '@/components/admin/icons';
import { InstitutionManager } from '@/components/admin/institution-manager';
import { HowItWorks, IconText, LoadError, Pagination, buttonClass } from '@/components/admin/ui';
import { listAdminInstitutions, type AdminInstitution } from '@/lib/admin/api';
import { listParamEntries, pageOf, readListParams, type ListParams } from '@/lib/admin/list-params';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { format, isLocale, type Dictionary, type Locale } from '@/lib/i18n/locale';
import { getAccessToken, requireRole } from '@/lib/supabase/server';

type Search = Promise<Record<string, string | string[] | undefined>>;
const SORTS = ['name', 'programmes', 'state'] as const;
type Sort = (typeof SORTS)[number];
const PAGE_SIZE = 15;

/** Institutions: reference data that admins add and correct directly (no review step). */
export default async function InstitutionsPage({ params, searchParams }: PageProps<'/[lang]/admin/institusi'>) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const dict = await getDictionary(lang);
  return (
    <Suspense fallback={<p className="text-sm text-muted">…</p>}>
      <Institutions locale={lang} dict={dict} searchParams={searchParams} />
    </Suspense>
  );
}

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

/** The list is short (tens of institutions), so it is searched, sorted and paged here rather than by the service. */
function sortInstitutions(rows: AdminInstitution[], { sort, direction }: ListParams<Sort>, locale: Locale): AdminInstitution[] {
  const byName = (a: AdminInstitution, b: AdminInstitution) => a.name.localeCompare(b.name, locale);
  const compare: Record<Sort, (a: AdminInstitution, b: AdminInstitution) => number> = {
    name: byName,
    programmes: (a, b) => a.programmes - b.programmes || byName(a, b),
    state: (a, b) => (a.state ?? '').localeCompare(b.state ?? '', locale) || byName(a, b),
  };
  const sorted = [...rows].sort(compare[sort]);
  return direction === 'desc' ? sorted.reverse() : sorted;
}

async function Institutions({ locale, dict, searchParams }: { locale: Locale; dict: Dictionary; searchParams: Search }) {
  await requireRole(locale, 'admin');
  const t = dict.admin;
  const i = t.institutions;
  const sp = await searchParams;
  const query = first(sp.q)?.trim().slice(0, 100) ?? '';
  const list = readListParams<Sort>(sp, SORTS, 'name');
  const base = `/${locale}/admin/institusi`;

  let rows;
  try {
    rows = await listAdminInstitutions((await getAccessToken())!);
  } catch {
    return <LoadError text={t.errors.generic} />;
  }
  const needle = query.toLocaleLowerCase(locale);
  const found = needle ? rows.filter((r) => [r.name, r.shortName, r.state].some((x) => x?.toLocaleLowerCase(locale).includes(needle))) : rows;
  const shown = pageOf(sortInstitutions(found, list, locale), list.page, PAGE_SIZE);

  const href = (next: ListParams<Sort>) => {
    const qs = new URLSearchParams([...(query ? [['q', query] as [string, string]] : []), ...listParamEntries(next, 'name')]).toString();
    return qs ? `${base}?${qs}` : base;
  };
  // Pressing the current sort flips it; a new sort starts with the natural order (most programmes first).
  const sortLink = (key: Sort) => {
    const active = list.sort === key;
    const direction = active ? (list.direction === 'asc' ? 'desc' : 'asc') : key === 'programmes' ? 'desc' : 'asc';
    return (
      <Link
        key={key}
        href={href({ sort: key, direction, page: 1 })}
        aria-current={active ? 'true' : undefined}
        className={`inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-[13px] font-semibold transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy/40 ${
          active ? 'border-navy bg-navy text-white' : 'border-line bg-white hover:border-navy/30 hover:bg-bg'
        }`}
      >
        {i.sorts[key]}
        {active && <span aria-label={list.direction === 'asc' ? t.sort.ascending : t.sort.descending}>{list.direction === 'asc' ? '▲' : '▼'}</span>}
      </Link>
    );
  };

  const toolbar = (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <form action={base} className="flex min-w-0 gap-2 lg:w-[460px]">
        {list.sort !== 'name' && <input type="hidden" name="susun" value={list.sort} />}
        {list.direction === 'desc' && <input type="hidden" name="arah" value="desc" />}
        <label className="flex min-w-0 flex-1 items-center gap-2 rounded-[10px] border border-line bg-white px-3 text-muted transition-colors focus-within:border-navy/50 focus-within:ring-2 focus-within:ring-navy/15">
          <AdminIcon name="search" size={18} />
          <span className="sr-only">{i.search}</span>
          <input name="q" defaultValue={query} placeholder={i.search} className="min-w-0 flex-1 bg-transparent py-2.5 text-[15px] text-navy outline-none" />
        </label>
        <button type="submit" className={buttonClass('primary')}>
          <IconText icon="search">{t.programmes.searchButton}</IconText>
        </button>
      </form>
      <nav aria-label={t.sort.label} className="flex flex-wrap items-center gap-2">
        <span className="text-[13px] text-muted">{t.sort.label}:</span>
        {SORTS.map(sortLink)}
      </nav>
    </div>
  );

  return (
    <>
      <InstitutionManager
        locale={locale}
        rows={shown.items}
        t={t}
        noMatches={dict.directory.noMatches}
        toolbar={toolbar}
        empty={query ? format(i.noResults, { query }) : i.empty}
        footer={<Pagination page={shown.page} pageSize={PAGE_SIZE} total={found.length} href={(page) => href({ ...list, page })} t={t.pagination} />}
      />
      <HowItWorks title={i.how.title} steps={i.how.steps} />
    </>
  );
}
