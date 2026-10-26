import Link from 'next/link';
import { Suspense } from 'react';
import { notFound, redirect } from 'next/navigation';
import { lang as rootLang } from 'next/root-params';
import { z } from 'zod';
import { InstitutionDangerZone } from '@/components/admin/institution-danger-zone';
import { InstitutionForm } from '@/components/admin/institution-form';
import { InstitutionSources } from '@/components/admin/institution-sources';
import { AdminIcon, type AdminIconName } from '@/components/admin/icons';
import { ProgrammeTable } from '@/components/admin/programme-table';
import { AdminHeading, AdminTabs, ButtonLink, Card, LoadError, Pagination } from '@/components/admin/ui';
import { AdminApiError, ProgrammeSorts, getInstitutionDetail, listProgrammes, type InstitutionDetail } from '@/lib/admin/api';
import { listParamEntries, readListParams, type ListParams } from '@/lib/admin/list-params';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { format, isLocale, type Dictionary, type Locale } from '@/lib/i18n/locale';
import { getAccessToken, requireRole } from '@/lib/supabase/server';

const TABS = ['ringkasan', 'program', 'sumber', 'tetapan'] as const;
type Tab = (typeof TABS)[number];
type Props = PageProps<'/[lang]/admin/institusi/[id]'>;
type Sort = (typeof ProgrammeSorts)[number];
const TAB_ICON: Record<Tab, AdminIconName> = { ringkasan: 'dashboard', program: 'programme', sumber: 'link', tetapan: 'sliders' };
const PAGE_SIZE = 20;

/**
 * An institution's profile, the home of its data: summary, programmes (added by hand now, found from its sources
 * later), official sources, and settings with the delete.
 */
export default async function InstitutionPage({ params, searchParams }: Props) {
  const lang = await rootLang();
  if (!isLocale(lang)) notFound();
  const dict = await getDictionary(lang);
  return (
    <Suspense fallback={<p className="text-sm text-muted">…</p>}>
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
  const t = dict.admin;
  const i = t.institutions;

  let institution: InstitutionDetail;
  let programmes;
  try {
    const token = (await getAccessToken())!;
    [institution, programmes] = await Promise.all([
      getInstitutionDetail(token, id),
      tab === 'program' ? listProgrammes(token, { institutionId: id, sort: list.sort, direction: list.direction, page: list.page, pageSize: PAGE_SIZE }) : null,
    ]);
  } catch (err) {
    if (err instanceof AdminApiError && err.status === 404) notFound();
    return <LoadError text={t.errors.generic} />;
  }
  const base = `/${locale}/admin/institusi/${id}`;
  const types: Record<string, string> = i.types;
  const tabLabel: Record<Tab, string> = { ringkasan: i.tabs.summary, program: i.tabs.programmes, sumber: i.tabs.sources, tetapan: i.tabs.settings };
  const tabCount: Partial<Record<Tab, number>> = { program: institution.programmes, sumber: institution.sources.length };
  /** The programme tab's address with a sort or page; the defaults are left out. */
  const programmeHref = (p: ListParams<Sort>) => `${base}?${new URLSearchParams([['tab', 'program'], ...listParamEntries(p, 'name')])}`;
  // A page past the end goes to the last page.
  if (programmes && list.page > 1 && programmes.items.length === 0) redirect(programmeHref({ ...list, page: Math.max(1, Math.ceil(programmes.total / programmes.pageSize)) }));

  return (
    <>
      <AdminHeading
        back={{ href: `/${locale}/admin/institusi`, label: i.detailBack }}
        title={institution.name}
        intro={[institution.shortName, types[institution.type] ?? institution.type, institution.state, format(i.programmeCount, { count: institution.programmes })].filter(Boolean).join(' · ')}
        actions={
          <ButtonLink href={`/${locale}/admin/program/baharu?institusi=${id}`} primary icon="plus">
            {i.addHere}
          </ButtonLink>
        }
      />
      {institution.deletionRequestedBy && tab !== 'tetapan' && (
        <Link href={`${base}?tab=tetapan`} className="flex items-center gap-2 rounded-[14px] bg-red/10 px-4 py-3 text-sm font-medium hover:underline">
          <AdminIcon name="alert" size={18} className="text-[#b33a35]" />
          <span className="flex-1">{institution.deletionRequestedBy === account.id ? i.danger.requestedByYou : i.danger.requestedByOther}</span>
          <AdminIcon name="arrowRight" size={16} />
        </Link>
      )}

      <AdminTabs
        label={institution.name}
        items={TABS.map((key) => ({ href: key === 'ringkasan' ? base : `${base}?tab=${key}`, label: tabLabel[key], icon: TAB_ICON[key], current: key === tab, count: tabCount[key] }))}
      />

      {tab === 'ringkasan' && <Summary locale={locale} institution={institution} t={t} />}
      {tab === 'program' && programmes && (
        <>
          <ProgrammeTable
            rows={programmes.items}
            locale={locale}
            dict={dict}
            now={new Date().getTime()}
            showInstitution={false}
            sort={{ sort: list.sort, direction: list.direction, href: (sort, direction) => programmeHref({ sort, direction, page: 1 }) }}
          />
          <Pagination page={programmes.page} pageSize={programmes.pageSize} total={programmes.total} href={(page) => programmeHref({ ...list, page })} t={t.pagination} />
        </>
      )}
      {tab === 'sumber' && (
        <Card>
          <div className="flex flex-col gap-1">
            <h2 className="text-lg font-semibold">{i.sourcesTitle}</h2>
            <p className="text-sm text-muted">{i.sourcesIntro}</p>
          </div>
          <InstitutionSources locale={locale} institution={institution} t={t} noMatches={dict.directory.noMatches} />
          <p className="rounded-[12px] bg-blue px-4 py-3 text-[13px]">{i.sourcesHint}</p>
        </Card>
      )}
      {tab === 'tetapan' && (
        <>
          <Card className="max-w-[760px]">
            <h2 className="text-lg font-semibold">{i.settingsTitle}</h2>
            <InstitutionForm locale={locale} t={t} noMatches={dict.directory.noMatches} values={institution} />
          </Card>
          <div className="max-w-[760px]">
            <InstitutionDangerZone locale={locale} institution={institution} confirmationText={institution.shortName ?? institution.name} me={account.id} t={t} />
          </div>
        </>
      )}
    </>
  );
}

/** Counts that lead to the matching programme list, and the one next step that matters most. */
function Summary({ locale, institution, t }: { locale: Locale; institution: InstitutionDetail; t: Dictionary['admin'] }) {
  const s = t.institutions.summary;
  const list = `/${locale}/admin/program?institusi=${institution.id}`;
  const stats = [
    { label: s.published, value: institution.published, href: `${list}&status=published`, icon: 'checkCircle' as const },
    { label: s.open, value: institution.open, href: list, icon: 'draft' as const },
    { label: s.withoutRequirements, value: institution.withoutRequirements, href: `${list}&syarat=tiada`, icon: 'alert' as const, warn: institution.withoutRequirements > 0 },
    { label: s.archived, value: institution.archived, href: `${list}&status=archived`, icon: 'archive' as const },
  ];
  const noSources = !institution.websiteUrl && institution.sources.length === 0;
  const next =
    institution.programmes === 0
      ? { text: s.nextNoProgrammes, href: `/${locale}/admin/program/baharu?institusi=${institution.id}` }
      : noSources
        ? { text: s.nextNoSources, href: `/${locale}/admin/institusi/${institution.id}?tab=sumber` }
        : institution.withoutRequirements > 0
          ? { text: s.nextRequirements, href: `${list}&syarat=tiada` }
          : { text: s.nextDone, href: null };
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((x) => (
          <Link
            key={x.label}
            href={x.href}
            className="group flex items-center gap-3 rounded-[14px] border border-line bg-white p-4 transition-colors duration-150 hover:border-navy/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy/40"
          >
            <span className={`flex size-10 shrink-0 items-center justify-center rounded-[10px] ${x.warn ? 'bg-red/10 text-[#b33a35]' : 'bg-bg text-navy'}`}>
              <AdminIcon name={x.icon} size={20} />
            </span>
            <span className="flex min-w-0 flex-1 flex-col gap-1">
              <span className={`text-[26px] font-bold leading-none ${x.warn ? 'text-[#b33a35]' : ''}`}>{x.value}</span>
              <span className="text-[13px] text-muted">{x.label}</span>
            </span>
            <AdminIcon name="chevronRight" size={16} className="text-muted transition-transform duration-150 group-hover:translate-x-0.5 motion-reduce:transition-none" />
          </Link>
        ))}
      </div>
      <Card>
        <h2 className="font-semibold">{s.next}</h2>
        {next.href ? (
          <Link href={next.href} className="inline-flex items-center gap-1.5 self-start text-sm font-semibold text-[#2f5bd3] hover:underline">
            {next.text}
            <AdminIcon name="arrowRight" size={16} />
          </Link>
        ) : (
          <p className="flex items-center gap-2 text-sm text-muted">
            <AdminIcon name="checkCircle" size={16} className="text-[#1f6b47]" />
            {next.text}
          </p>
        )}
      </Card>
    </>
  );
}
