import Link from 'next/link';
import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { lang as rootLang } from 'next/root-params';
import { z } from 'zod';
import { InstitutionDangerZone } from '@/components/admin/institution-danger-zone';
import { InstitutionForm } from '@/components/admin/institution-form';
import { InstitutionSources } from '@/components/admin/institution-sources';
import { ProgrammeTable } from '@/components/admin/programme-table';
import { AdminHeading, ButtonLink, Card, LoadError } from '@/components/admin/ui';
import { AdminApiError, getInstitutionDetail, listProgrammes, type InstitutionDetail } from '@/lib/admin/api';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { format, isLocale, type Dictionary, type Locale } from '@/lib/i18n/locale';
import { getAccessToken, requireRole } from '@/lib/supabase/server';

const TABS = ['ringkasan', 'program', 'sumber', 'tetapan'] as const;
type Tab = (typeof TABS)[number];
type Props = PageProps<'/[lang]/admin/institusi/[id]'>;

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
  const asked = (await searchParams).tab;
  const tab: Tab = TABS.find((x) => x === asked) ?? 'ringkasan';
  const t = dict.admin;
  const i = t.institutions;

  let institution: InstitutionDetail;
  let programmes;
  try {
    const token = (await getAccessToken())!;
    [institution, programmes] = await Promise.all([getInstitutionDetail(token, id), tab === 'program' ? listProgrammes(token, { institutionId: id }) : null]);
  } catch (err) {
    if (err instanceof AdminApiError && err.status === 404) notFound();
    return <LoadError text={t.errors.generic} />;
  }
  const base = `/${locale}/admin/institusi/${id}`;
  const types: Record<string, string> = i.types;
  const tabLabel: Record<Tab, string> = { ringkasan: i.tabs.summary, program: `${i.tabs.programmes} (${institution.programmes})`, sumber: i.tabs.sources, tetapan: i.tabs.settings };

  return (
    <>
      <AdminHeading
        back={{ href: `/${locale}/admin/institusi`, label: i.detailBack }}
        title={institution.name}
        intro={[institution.shortName, types[institution.type] ?? institution.type, institution.state, format(i.programmeCount, { count: institution.programmes })].filter(Boolean).join(' · ')}
        actions={
          <ButtonLink href={`/${locale}/admin/program/baharu?institusi=${id}`} primary>
            {i.addHere}
          </ButtonLink>
        }
      />
      {institution.deletionRequestedBy && tab !== 'tetapan' && (
        <Link href={`${base}?tab=tetapan`} className="rounded-[14px] bg-red/10 px-4 py-3 text-sm font-medium hover:underline">
          {institution.deletionRequestedBy === account.id ? i.danger.requestedByYou : i.danger.requestedByOther} →
        </Link>
      )}

      <nav aria-label={institution.name} className="flex flex-wrap gap-1 self-start rounded-[12px] bg-white p-1">
        {TABS.map((key) => (
          <Link
            key={key}
            href={key === 'ringkasan' ? base : `${base}?tab=${key}`}
            aria-current={key === tab ? 'page' : undefined}
            className={`rounded-[9px] px-4 py-2 text-sm font-semibold ${key === tab ? 'bg-navy text-white' : 'hover:bg-bg'}`}
          >
            {tabLabel[key]}
          </Link>
        ))}
      </nav>

      {tab === 'ringkasan' && <Summary locale={locale} institution={institution} t={t} />}
      {tab === 'program' && programmes && <ProgrammeTable rows={programmes.items} locale={locale} dict={dict} showInstitution={false} />}
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
    { label: s.published, value: institution.published, href: `${list}&status=published` },
    { label: s.open, value: institution.open, href: list },
    { label: s.withoutRequirements, value: institution.withoutRequirements, href: `${list}&syarat=tiada`, warn: institution.withoutRequirements > 0 },
    { label: s.archived, value: institution.archived, href: `${list}&status=archived` },
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
          <Link key={x.label} href={x.href} className="flex flex-col gap-1 rounded-[14px] border border-line bg-white p-4 hover:border-navy/40">
            <span className={`text-[28px] font-bold leading-none ${x.warn ? 'text-[#b33a35]' : ''}`}>{x.value}</span>
            <span className="text-[13px] text-muted">{x.label}</span>
          </Link>
        ))}
      </div>
      <Card>
        <h2 className="font-semibold">{s.next}</h2>
        {next.href ? (
          <Link href={next.href} className="self-start text-sm font-semibold text-[#2f5bd3] hover:underline">
            {next.text} →
          </Link>
        ) : (
          <p className="text-sm text-muted">{next.text}</p>
        )}
      </Card>
    </>
  );
}
