import Link from 'next/link';
import { Suspense, type ReactNode } from 'react';
import { notFound, redirect } from 'next/navigation';
import { lang as rootLang } from 'next/root-params';
import { z } from 'zod';
import { EpanduanCategories, SharedEpanduanCodes } from '@edulaunch/contracts';
import { EpanduanImport } from '@/components/admin/epanduan-import';
import { InstitutionDangerZone } from '@/components/admin/institution-danger-zone';
import { InstitutionForm } from '@/components/admin/institution-form';
import { InstitutionSources } from '@/components/admin/institution-sources';
import { AdminIcon, type AdminIconName } from '@/components/admin/icons';
import { FilterSelect } from '@/components/admin/filter-select';
import { ProgrammeTable } from '@/components/admin/programme-table';
import { AdminHeading, AdminTabs, ButtonLink, Card, ListToolbar, LoadError, Pagination, timeAgo } from '@/components/admin/ui';
import { readFrom, withFrom } from '@/lib/admin/trail';
import { AdminApiError, ProgrammeSorts, ReviewStatus, getInstitutionDetail, latestEpanduanRun, listInstitutionProgrammes, listNecFields, listProgrammes, listSpecialRequirements, type InstitutionDetail } from '@/lib/admin/api';
import { compareFound } from '@/lib/admin/epanduan-import';
import { listParamEntries, readListParams, type ListParams } from '@/lib/admin/list-params';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { format, isLocale, type Dictionary, type Locale } from '@/lib/i18n/locale';
import { getAccessToken, requireRole } from '@/lib/supabase/server';
import { PageSkeleton } from '@/components/ui/skeleton';

const TABS = ['ringkasan', 'program', 'import', 'sumber', 'tetapan'] as const;
type Tab = (typeof TABS)[number];
type Props = PageProps<'/[lang]/admin/institusi/[id]'>;
type Sort = (typeof ProgrammeSorts)[number];
const TAB_ICON: Record<Tab, AdminIconName> = { ringkasan: 'dashboard', program: 'programme', import: 'search', sumber: 'link', tetapan: 'sliders' };

/**
 * An institution's profile, the home of its data: summary, programmes (added by hand now, found from its sources
 * later), official sources, and settings with the delete.
 */
export default async function InstitutionPage({ params, searchParams }: Props) {
  const lang = await rootLang();
  if (!isLocale(lang)) notFound();
  const dict = await getDictionary(lang);
  return (
    <Suspense fallback={<PageSkeleton label={dict.meta.loading} />}>
      {/* The institution id and the tab are only known at request time. */}
      <Institution locale={lang} dict={dict} params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function Institution({ locale, dict, params, searchParams }: { locale: Locale; dict: Dictionary; params: Props['params']; searchParams: Props['searchParams'] }) {
  const { id } = await params;
  // A malformed link is treated like an institution that does not exist.
  if (!z.uuid().safeParse(id).success) notFound();
  const account = await requireRole(locale, 'admin');
  const sp = await searchParams;
  const tab: Tab = TABS.find((x) => x === sp.tab) ?? 'ringkasan';
  const list = readListParams<Sort>(sp, ProgrammeSorts, 'name');
  const query = (Array.isArray(sp.q) ? sp.q[0] : sp.q)?.trim().slice(0, 100) ?? '';
  const status = ReviewStatus.safeParse(Array.isArray(sp.status) ? sp.status[0] : sp.status).data;
  const from = readFrom(sp.dari, locale);
  const t = dict.admin;
  const i = t.institutions;

  let institution: InstitutionDetail;
  let programmes;
  try {
    const token = (await getAccessToken())!;
    [institution, programmes] = await Promise.all([
      getInstitutionDetail(token, id),
      tab === 'program' ? listProgrammes(token, { institutionId: id, query, status, sort: list.sort, direction: list.direction, page: list.page, pageSize: list.pageSize }) : null,
    ]);
  } catch (err) {
    if (err instanceof AdminApiError && err.status === 404) notFound();
    return <LoadError text={t.errors.generic} />;
  }
  const base = `/${locale}/admin/institusi/${id}`;
  const types: Record<string, string> = i.types;
  const tabLabel: Record<Tab, string> = { ringkasan: i.tabs.summary, program: i.tabs.programmes, import: i.tabs.import, sumber: i.tabs.sources, tetapan: i.tabs.settings };
  const tabCount: Partial<Record<Tab, number>> = { program: institution.programmes, sumber: institution.sources.length };
  /** A tab's address; `dari` stays so the breadcrumb still returns to the list the admin came from. */
  const tabHref = (key: Tab, extra: Array<[string, string]> = []) => {
    const qs = new URLSearchParams([...(key === 'ringkasan' ? [] : [['tab', key] as [string, string]]), ...extra, ...(from ? [['dari', from] as [string, string]] : [])]).toString();
    return qs ? `${base}?${qs}` : base;
  };
  /** The programme tab's address with a search, filter, sort or page; the defaults are left out. */
  const programmeHref = (p: ListParams<Sort>, change: { q?: string; status?: string } = {}) => {
    const q = 'q' in change ? change.q : query;
    const st = 'status' in change ? change.status : status;
    return tabHref('program', [...(q ? [['q', q] as [string, string]] : []), ...(st ? [['status', st] as [string, string]] : []), ...listParamEntries(p, 'name')]);
  };
  // A page past the end goes to the last page.
  if (programmes && list.page > 1 && programmes.items.length === 0) redirect(programmeHref({ ...list, page: Math.max(1, Math.ceil(programmes.total / programmes.pageSize)) }));
  const here = tab === 'program' ? programmeHref(list) : tabHref(tab);
  const crumbs = [{ label: t.nav.institutions, href: from && from.split('?')[0] === `/${locale}/admin/institusi` ? from : `/${locale}/admin/institusi` }];

  return (
    <>
      <AdminHeading
        crumbs={crumbs}
        current={institution.shortName ?? institution.name}
        title={institution.name}
        intro={[institution.shortName, types[institution.type] ?? institution.type, institution.state].filter(Boolean).join(' · ')}
        actions={
          <ButtonLink href={`/${locale}/admin/program/baharu?institusi=${id}`} primary icon="plus">
            {i.addHere}
          </ButtonLink>
        }
      />
      {institution.deletionRequestedBy && tab !== 'tetapan' && (
        <Link href={tabHref('tetapan')} className="flex items-center gap-2 rounded-[8px] border border-[#f3c2bd] bg-[#ffedea] px-4 py-3 text-sm text-[#831c1e] hover:underline">
          <AdminIcon name="alert" size={16} />
          <span className="flex-1">{institution.deletionRequestedBy === account.id ? i.danger.requestedByYou : i.danger.requestedByOther}</span>
          <AdminIcon name="arrowRight" size={16} />
        </Link>
      )}

      <AdminTabs label={institution.name} items={TABS.map((key) => ({ href: tabHref(key), label: tabLabel[key], icon: TAB_ICON[key], current: key === tab, count: tabCount[key] }))} />

      {tab === 'ringkasan' && <Summary locale={locale} dict={dict} institution={institution} here={here} tabHref={tabHref} />}
      {tab === 'program' && programmes && (
        <>
          <ListToolbar
            action={base}
            query={query}
            placeholder={t.programmes.searchHere}
            keep={[['tab', 'program'], ...(status ? [['status', status] as [string, string]] : []), ...(from ? [['dari', from] as [string, string]] : []), ...listParamEntries({ ...list, page: 1 }, 'name')]}
          >
            <FilterSelect
              label={t.programmes.columns.status}
              value={status ?? ''}
              options={[
                { value: '', label: t.programmes.allStatus, href: programmeHref({ ...list, page: 1 }, { status: undefined }) },
                ...ReviewStatus.options.map((s) => ({ value: s, label: t.status[s], href: programmeHref({ ...list, page: 1 }, { status: s }) })),
              ]}
            />
          </ListToolbar>
          <div className="flex flex-col gap-3">
            <ProgrammeTable
              rows={programmes.items}
              locale={locale}
              dict={dict}
              now={new Date().getTime()}
              from={here}
              showInstitution={false}
              offset={(programmes.page - 1) * programmes.pageSize}
              empty={query || status ? t.programmes.noMatches : i.noProgrammesYet}
              sort={{ sort: list.sort, direction: list.direction, href: (sort, direction) => programmeHref({ ...list, sort, direction, page: 1 }) }}
            />
            <Pagination page={programmes.page} pageSize={programmes.pageSize} total={programmes.total} href={(page) => programmeHref({ ...list, page })} sizeHref={(pageSize) => programmeHref({ ...list, pageSize, page: 1 })} t={t.pagination} />
          </div>
        </>
      )}
      {tab === 'import' && <ImportTab locale={locale} dict={dict} institution={institution} />}
      {tab === 'sumber' && (
        <Card>
          <div className="flex flex-col gap-1">
            <h2 className="text-base font-semibold">{i.sourcesTitle}</h2>
            <p className="text-sm text-muted">{i.sourcesIntro}</p>
          </div>
          <InstitutionSources locale={locale} institution={institution} t={t} noMatches={dict.directory.noMatches} />
          <p className="text-[13px] text-muted">{i.sourcesHint}</p>
        </Card>
      )}
      {tab === 'tetapan' && (
        <>
          <Card className="max-w-[760px]">
            <h2 className="text-base font-semibold">{i.settingsTitle}</h2>
            {/* Keyed on the stored values, so a change saved elsewhere shows when the tab opens again. */}
            <InstitutionForm
              key={JSON.stringify([institution.name, institution.shortName, institution.type, institution.state, institution.websiteUrl])}
              locale={locale}
              t={t}
              noMatches={dict.directory.noMatches}
              values={institution}
            />
          </Card>
          <div className="max-w-[760px]">
            <InstitutionDangerZone key={institution.deletionRequestedBy ?? 'none'} locale={locale} institution={institution} confirmationText={institution.shortName ?? institution.name} me={account.id} superAdmin={account.superAdmin} t={t} />
          </div>
        </>
      )}
    </>
  );
}

/**
 * The institution at a glance: its programme counts (each opens the matching list), what needs doing here (drafts
 * waiting for review, drafts sent back, published programmes students cannot yet check against), and the facts
 * an admin checks the data against: the institution itself, its last ePanduan read and its official sources.
 */
async function Summary({ locale, dict, institution, here, tabHref }: { locale: Locale; dict: Dictionary; institution: InstitutionDetail; here: string; tabHref: (key: Tab) => string }) {
  const t = dict.admin;
  const s = t.institutions.summary;
  const i = t.institutions;
  const types: Record<string, string> = i.types;
  const programmesTab = (status?: string, missing?: boolean) =>
    missing ? `/${locale}/admin/program?institusi=${institution.id}&syarat=tiada` : tabHref('program') + (status ? `&status=${status}` : '');

  let waiting, returned, missing, run;
  try {
    const token = (await getAccessToken())!;
    const few = { institutionId: institution.id, sort: 'updated' as const, direction: 'desc' as const, page: 1, pageSize: 5 };
    [waiting, returned, missing, run] = await Promise.all([
      listProgrammes(token, { ...few, status: 'in_review' }),
      listProgrammes(token, { ...few, status: 'returned' }),
      listProgrammes(token, { ...few, missingRequirements: true }),
      institution.epanduanCode ? latestEpanduanRun(token, institution.epanduanCode).then((r) => r.run).catch(() => null) : Promise.resolve(null),
    ]);
  } catch {
    return <LoadError text={t.errors.generic} />;
  }
  const now = new Date().getTime();
  const counts = [
    { label: s.programmes, value: institution.programmes, href: tabHref('program') },
    { label: s.published, value: institution.published, href: programmesTab('published') },
    { label: s.open, value: institution.open, href: programmesTab('draft') },
    { label: s.withoutRequirements, value: institution.withoutRequirements, href: programmesTab(undefined, true), warn: institution.withoutRequirements > 0 },
    { label: s.archived, value: institution.archived, href: programmesTab('archived') },
  ];
  const groups = [
    { title: s.waiting, rows: waiting.items, total: waiting.total, href: programmesTab('in_review') },
    { title: s.returned, rows: returned.items, total: returned.total, href: programmesTab('returned') },
    { title: s.missing, rows: missing.items, total: missing.total, href: programmesTab(undefined, true) },
  ].filter((g) => g.total > 0);
  const facts: Array<[string, ReactNode]> = [
    [i.type, types[institution.type] ?? institution.type],
    [i.state, institution.state ?? <span className="text-muted">—</span>],
    [
      i.website,
      institution.websiteUrl ? (
        <a href={institution.websiteUrl} target="_blank" rel="noreferrer" className="break-all text-navy underline-offset-2 hover:underline">
          {institution.websiteUrl.replace(/^https?:\/\//, '').replace(/\/$/, '')}
        </a>
      ) : (
        <span className="text-muted">—</span>
      ),
    ],
    [i.epanduanCode, institution.epanduanCode ?? <span className="text-muted">—</span>],
  ];

  return (
    <>
      {/* One strip, split by rules: each count opens the matching list. */}
      <div className="grid grid-cols-2 overflow-hidden rounded-[8px] border border-line bg-white sm:grid-cols-5">
        {counts.map((c, n) => (
          <Link
            key={c.label}
            href={c.href}
            className={`flex flex-col gap-1 px-4 py-3.5 transition-colors duration-150 hover:bg-[#fafbfc] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-navy/40 ${n > 0 ? 'sm:border-l sm:border-line' : ''} ${n > 1 ? 'border-t border-line sm:border-t-0' : n === 1 ? 'border-l border-line' : ''} ${n === 4 ? 'col-span-2 sm:col-span-1' : ''}`}
          >
            <span className="text-[13px] text-muted">{c.label}</span>
            <span className={`text-[22px] font-semibold tabular-nums leading-none ${c.warn ? 'text-[#b33a35]' : ''}`}>{c.value}</span>
          </Link>
        ))}
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <section className="flex flex-col rounded-[8px] border border-line bg-white">
          <h2 className="px-5 pb-2 pt-4 text-base font-semibold">{s.todo}</h2>
          {groups.length === 0 ? (
            <p className="flex items-center gap-2 px-5 pb-5 text-sm text-muted">
              <AdminIcon name="checkCircle" size={16} className="text-[#247b50]" />
              {institution.programmes === 0 ? s.nothingYet : s.allDone}
            </p>
          ) : (
            groups.map((g) => (
              <div key={g.title} className="border-t border-[#f0f1f3] px-5 py-3">
                <div className="mb-1 flex items-baseline justify-between gap-3">
                  <h3 className="text-[13px] font-semibold">
                    {g.title} <span className="font-normal text-muted">{g.total}</span>
                  </h3>
                  {g.total > g.rows.length && (
                    <Link href={g.href} className="text-[13px] text-muted hover:text-navy hover:underline">
                      {format(s.viewAll, { count: g.total })}
                    </Link>
                  )}
                </div>
                <ul>
                  {g.rows.map((p) => (
                    <li key={p.id} className="flex items-center justify-between gap-3 py-1.5 text-sm">
                      <Link href={withFrom(`/${locale}/admin/program/${p.id}`, here)} className="min-w-0 truncate hover:underline">
                        {p.name}
                      </Link>
                      <span className="flex-none text-[13px] tabular-nums text-muted">{timeAgo(p.updatedAt, now, t)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))
          )}
        </section>

        <div className="flex flex-col gap-4">
          <section className="rounded-[8px] border border-line bg-white px-5 py-4">
            <div className="mb-2 flex items-baseline justify-between gap-3">
              <h2 className="text-base font-semibold">{s.about}</h2>
              <Link href={tabHref('tetapan')} className="text-[13px] text-muted hover:text-navy hover:underline">
                {s.edit}
              </Link>
            </div>
            <dl className="flex flex-col">
              {facts.map(([label, value]) => (
                <div key={label} className="flex items-baseline justify-between gap-4 py-1.5 text-sm">
                  <dt className="flex-none text-muted">{label}</dt>
                  <dd className="min-w-0 text-right">{value}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section className="rounded-[8px] border border-line bg-white px-5 py-4">
            <div className="mb-1 flex items-baseline justify-between gap-3">
              <h2 className="text-base font-semibold">{s.lastImport}</h2>
              <Link href={tabHref('import')} className="text-[13px] text-muted hover:text-navy hover:underline">
                {s.openImport}
              </Link>
            </div>
            <p className="text-sm text-muted">
              {!institution.epanduanCode
                ? s.noCode
                : !run
                  ? s.neverImported
                  : run.status === 'running'
                    ? s.importRunning
                    : run.status === 'failed'
                      ? format(s.importFailed, { when: timeAgo(run.finishedAt ?? run.startedAt, now, t) })
                      : format(s.importDone, { found: run.found, when: timeAgo(run.finishedAt ?? run.startedAt, now, t) })}
            </p>
          </section>

          <section className="rounded-[8px] border border-line bg-white px-5 py-4">
            <div className="mb-1 flex items-baseline justify-between gap-3">
              <h2 className="text-base font-semibold">{i.tabs.sources}</h2>
              <Link href={tabHref('sumber')} className="text-[13px] text-muted hover:text-navy hover:underline">
                {institution.sources.length ? s.manage : s.add}
              </Link>
            </div>
            {institution.sources.length === 0 ? (
              <p className="text-sm text-muted">{s.noSources}</p>
            ) : (
              <ul className="flex flex-col gap-1 text-sm">
                {institution.sources.slice(0, 4).map((src) => (
                  <li key={src.id} className="truncate">
                    <a href={src.url} target="_blank" rel="noreferrer" className="hover:underline">
                      {src.label ?? src.url.replace(/^https?:\/\//, '')}
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </>
  );
}

/** "Import ePanduan": the latest read of this institution's programmes on ePanduan, compared with the catalogue. */
async function ImportTab({ locale, dict, institution }: { locale: Locale; dict: Dictionary; institution: InstitutionDetail }) {
  const t = dict.admin;
  const m = t.institutions.import;
  const code = institution.epanduanCode;
  if (!code) {
    return (
      <Card>
        <p className="flex items-start gap-2 text-sm">
          <AdminIcon name="info" size={18} />
          {m.noCode}
        </p>
        <ButtonLink href={`/${locale}/admin/institusi/${institution.id}?tab=tetapan`} icon="sliders">
          {m.setCode}
        </ButtonLink>
      </Card>
    );
  }
  let data;
  try {
    const token = (await getAccessToken())!;
    const [{ run }, existing, nec] = await Promise.all([latestEpanduanRun(token, code), listInstitutionProgrammes(token, institution.id), listNecFields(token)]);
    // Syarat Khas is read only for accepted programmes, so only catalogue codes are asked for.
    const special = await listSpecialRequirements(token, existing.flatMap((p) => (p.programCode ? [p.programCode] : [])).slice(0, 200));
    data = { run, existing, nec, special };
  } catch {
    return <LoadError text={t.errors.generic} />;
  }
  const { run, existing, nec, special } = data;
  const comparison = compareFound(run?.status === 'done' ? run.programmes : [], existing, new Set(nec.map((n) => n.code)));
  const now = new Date().getTime();
  return (
    <EpanduanImport
      // A newer read (or the end of one) starts the choice afresh.
      key={run ? `${run.id}:${run.status}` : 'none'}
      locale={locale}
      institutionId={institution.id}
      code={code}
      shared={SharedEpanduanCodes.includes(code)}
      run={
        run
          ? {
              status: run.status,
              pagesRead: run.pagesRead,
              currentCategory: run.currentCategory,
              categoryIndex: Math.max(1, (EpanduanCategories as readonly string[]).indexOf(run.currentCategory ?? '') + 1),
              categoryCount: EpanduanCategories.length,
              found: run.found,
              error: run.error,
              when: timeAgo(run.finishedAt ?? run.startedAt, now, t),
            }
          : null
      }
      rows={comparison.rows}
      special={special}
      missing={comparison.missing}
      counts={comparison.counts}
      t={t}
      levels={dict.levels}
    />
  );
}
