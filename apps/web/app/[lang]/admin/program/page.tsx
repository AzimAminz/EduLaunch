import Link from 'next/link';
import { Suspense } from 'react';
import { notFound, redirect } from 'next/navigation';
import { z } from 'zod';
import { AdminIcon } from '@/components/admin/icons';
import { ProgrammeTable } from '@/components/admin/programme-table';
import { FilterSelect } from '@/components/admin/filter-select';
import { AdminHeading, ButtonLink, ListToolbar, LoadError, Pagination } from '@/components/admin/ui';
import { ProgrammeSorts, ReviewStatus, listAdminInstitutions, listProgrammes } from '@/lib/admin/api';
import { listParamEntries, readListParams, type ListParams } from '@/lib/admin/list-params';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { format, isLocale, type Dictionary, type Locale } from '@/lib/i18n/locale';
import { getAccessToken, requireRole } from '@/lib/supabase/server';
import { PageSkeleton } from '@/components/ui/skeleton';

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
    <Suspense fallback={<PageSkeleton label={dict.meta.loading} />}>
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
  const here = href({}, list);
  const filtered = !!(query || status || institutionId || missing);
  const statusValue = missing ? 'tiada' : (status ?? '');

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

      <ListToolbar
        action={base}
        query={query}
        placeholder={t.programmes.search}
        keep={[...Object.entries({ status, institusi: institutionId, syarat: missing ? 'tiada' : undefined }).filter((e): e is [string, string] => !!e[1]), ...listParamEntries({ ...list, page: 1 }, 'name')]}
      >
        <FilterSelect
          label={t.programmes.columns.institution}
          value={institutionId ?? ''}
          options={[
            { value: '', label: t.programmes.allInstitutions, href: href({ institusi: undefined }) },
            ...institutions.map((i) => ({ value: i.id, label: i.shortName ? `${i.shortName} · ${i.name}` : i.name, href: href({ institusi: i.id }) })),
          ]}
        />
        <FilterSelect
          label={t.programmes.columns.status}
          value={statusValue}
          options={[
            { value: '', label: t.programmes.allStatus, href: href({ status: undefined, syarat: undefined }) },
            { value: 'tiada', label: t.programmes.missingRequirements, href: href({ status: undefined, syarat: 'tiada' }) },
            ...ReviewStatus.options.map((s) => ({ value: s, label: t.status[s], href: href({ status: s, syarat: undefined }) })),
          ]}
        />
        {filtered && (
          <Link href={base} className="inline-flex h-9 items-center gap-1 rounded-[6px] px-2 text-[13px] text-muted hover:text-navy hover:underline">
            <AdminIcon name="x" size={14} />
            {t.programmes.clearFilters}
          </Link>
        )}
      </ListToolbar>

      <div className="flex flex-col gap-3">
        <ProgrammeTable
          rows={page.items}
          locale={locale}
          dict={dict}
          now={new Date().getTime()}
          from={here}
          showInstitution={!institutionId}
          offset={(page.page - 1) * page.pageSize}
          empty={filtered ? t.programmes.noMatches : t.programmes.empty}
          sort={{ sort: list.sort, direction: list.direction, href: (sort, direction) => href({}, { ...list, sort, direction, page: 1 }) }}
        />
        <Pagination page={page.page} pageSize={page.pageSize} total={page.total} href={(p) => href({}, { ...list, page: p })} sizeHref={(pageSize) => href({}, { ...list, pageSize, page: 1 })} t={t.pagination} />
      </div>
    </>
  );
}
