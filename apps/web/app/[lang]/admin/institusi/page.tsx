import Link from 'next/link';
import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { InstitutionForm } from '@/components/admin/institution-form';
import { AdminHeading, Card, EmptyState, IconText, ListToolbar, LoadError, Pagination, RowArrow, RowLink, SortHeader, buttonClass, tableStyle as ts } from '@/components/admin/ui';
import { withFrom } from '@/lib/admin/trail';
import { listAdminInstitutions, type AdminInstitution } from '@/lib/admin/api';
import { listParamEntries, pageOf, readListParams, type ListParams } from '@/lib/admin/list-params';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { format, isLocale, type Dictionary, type Locale } from '@/lib/i18n/locale';
import { getAccessToken, requireRole } from '@/lib/supabase/server';
import { PageSkeleton } from '@/components/ui/skeleton';

type Search = Promise<Record<string, string | string[] | undefined>>;
const SORTS = ['name', 'programmes', 'state'] as const;
type Sort = (typeof SORTS)[number];
const DEFAULT_SIZE = 10;

/** Institutions: reference data that admins add and correct directly (no review step). */
export default async function InstitutionsPage({ params, searchParams }: PageProps<'/[lang]/admin/institusi'>) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const dict = await getDictionary(lang);
  return (
    <Suspense fallback={<PageSkeleton label={dict.meta.loading} />}>
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
  const list = readListParams<Sort>(sp, SORTS, 'name', DEFAULT_SIZE);
  const base = `/${locale}/admin/institusi`;

  let rows;
  try {
    rows = await listAdminInstitutions((await getAccessToken())!);
  } catch {
    return <LoadError text={t.errors.generic} />;
  }
  const needle = query.toLocaleLowerCase(locale);
  const found = needle ? rows.filter((r) => [r.name, r.shortName, r.state].some((x) => x?.toLocaleLowerCase(locale).includes(needle))) : rows;
  const shown = pageOf(sortInstitutions(found, list, locale), list.page, list.pageSize);

  const href = (next: ListParams<Sort>, extra: Array<[string, string]> = []) => {
    const qs = new URLSearchParams([...(query ? [['q', query] as [string, string]] : []), ...listParamEntries(next, 'name', DEFAULT_SIZE), ...extra]).toString();
    return qs ? `${base}?${qs}` : base;
  };
  const here = href(list);
  const adding = first(sp.tambah) === '1';
  const types: Record<string, string> = i.types;
  // Pressing the current column flips it; a new column starts with its natural order (most programmes first).
  const header = (key: Sort, label: string, className = '') => (
    <SortHeader
      label={label}
      active={list.sort === key}
      direction={list.direction}
      className={className}
      href={href({ ...list, sort: key, direction: list.sort === key ? (list.direction === 'asc' ? 'desc' : 'asc') : key === 'programmes' ? 'desc' : 'asc', page: 1 })}
    />
  );
  const num = `${ts.td} text-right tabular-nums`;

  return (
    <>
      <AdminHeading
        title={i.title}
        intro={i.intro}
        actions={
          !adding && (
            <Link href={href(list, [['tambah', '1']])} className={buttonClass('primary')}>
              <IconText icon="plus">{i.add}</IconText>
            </Link>
          )
        }
      />
      {adding && (
        <Card>
          <h2 className="text-base font-semibold">{i.add}</h2>
          <InstitutionForm locale={locale} t={t} noMatches={dict.directory.noMatches} cancelHref={here} />
        </Card>
      )}

      <ListToolbar action={base} query={query} placeholder={i.search} keep={listParamEntries({ ...list, page: 1 }, 'name', DEFAULT_SIZE)} />

      <div className="flex flex-col gap-3">
        {shown.items.length === 0 ? (
          <EmptyState text={query ? format(i.noResults, { query }) : i.empty} />
        ) : (
          <div className={ts.shell}>
            <table className={`${ts.table} min-w-[640px]`}>
              <thead className={ts.head}>
                <tr>
                  <th className={ts.numTh}>#</th>
                  {header('name', i.columns.name, 'w-[46%]')}
                  {header('state', i.columns.state)}
                  {header('programmes', i.columns.programmes, 'text-right [&>a]:flex-row-reverse')}
                  <th className={`${ts.th} text-right`}>{i.columns.published}</th>
                  <th className={`${ts.th} text-right`}>{i.columns.open}</th>
                  <th aria-hidden className="w-10" />
                </tr>
              </thead>
              <tbody>
                {shown.items.map((row, n) => (
                  <tr key={row.id} className={ts.row}>
                    <td className={ts.numTd}>{(shown.page - 1) * list.pageSize + n + 1}</td>
                    <td className={ts.td}>
                      <RowLink href={withFrom(`${base}/${row.id}`, here)}>{row.name}</RowLink>
                      <p className={ts.sub}>
                        {[row.shortName, types[row.type] ?? row.type].filter(Boolean).join(' · ')}
                        {row.deletionRequestedBy && <span className="ml-2 font-medium text-[#831c1e]">{i.deletionPending}</span>}
                      </p>
                    </td>
                    <td className={`${ts.td} text-[13px]`}>{row.state ?? <span className="text-muted">—</span>}</td>
                    <td className={`${num} ${row.programmes ? "font-medium" : "text-muted"}`}>{row.programmes}</td>
                    <td className={`${num} ${row.published ? '' : 'text-muted'}`}>{row.published}</td>
                    <td className={`${num} ${row.open ? '' : 'text-muted'}`}>{row.open}</td>
                    <RowArrow />
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination
          page={shown.page}
          pageSize={list.pageSize}
          total={found.length}
          href={(page) => href({ ...list, page })}
          sizeHref={(pageSize) => href({ ...list, pageSize, page: 1 })}
          sizes={[10, 20, 50]}
          t={t.pagination}
        />
      </div>
    </>
  );
}
