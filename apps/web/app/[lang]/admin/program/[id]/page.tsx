import Link from 'next/link';
import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { lang as rootLang } from 'next/root-params';
import { z } from 'zod';
import { EntryRoutes, EntryRoutesByLevel } from '@edulaunch/contracts';
import { ProgrammeChanges, ProgrammeDetails, type DetailNames } from '@/components/admin/programme-details';
import { ProgrammeWorkflowPanel } from '@/components/admin/programme-workflow-panel';
import { RouteStarter, StartRequirement } from '@/components/admin/start-requirement';
import { AdminHeading, Card, LoadError, StatusChip, who } from '@/components/admin/ui';
import { AdminApiError, getProgrammeDetail, listInstitutions, listNecFields, type PendingDetails, type ProgrammeDetail, type RequirementVersion } from '@/lib/admin/api';
import { programmeWorkflow } from '@/lib/admin/programme-workflow';
import { fieldName, getReferenceData } from '@/lib/catalogue/api';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { format, isLocale, type Dictionary, type Locale } from '@/lib/i18n/locale';
import { getAccessToken, requireRole } from '@/lib/supabase/server';

type Props = PageProps<'/[lang]/admin/program/[id]'>;
const TABS = ['maklumat', 'syarat'] as const;
type Tab = (typeof TABS)[number];

/**
 * One programme, read only: where it stands and the next action (status panel), a proposed change next to the
 * current version when there is one, and two tabs: details and entry requirements by route. Editing happens on its
 * own page (`/sunting`).
 */
export default async function AdminProgrammePage({ params, searchParams }: Props) {
  const lang = await rootLang();
  if (!isLocale(lang)) notFound();
  const dict = await getDictionary(lang);
  return (
    <Suspense fallback={<p className="text-sm text-muted">…</p>}>
      {/* The programme id and the tab are only known at request time. */}
      <Programme locale={lang} dict={dict} params={params} searchParams={searchParams} />
    </Suspense>
  );
}

const OPEN = new Set(['draft', 'returned', 'in_review']);

/** The programme's current details in the shape of a proposed change, so both can be shown and compared alike. */
const liveDetails = (p: ProgrammeDetail): PendingDetails => ({
  institutionId: p.institutionId,
  name: p.name,
  studyLevel: p.studyLevel,
  durationSemesters: p.durationSemesters,
  fieldIds: p.fieldIds,
  upuCode: p.upuCode,
  internalCode: p.internalCode,
  faculty: p.faculty,
  necCode: p.necCode,
  studyMode: p.studyMode,
  campus: p.campus,
  hasInterview: p.hasInterview,
  isStem: p.isStem,
  isTvet: p.isTvet,
  bumiputeraOnly: p.bumiputeraOnly,
  sourceUrl: p.sourceUrl,
});

async function Programme({ locale, dict, params, searchParams }: { locale: Locale; dict: Dictionary; params: Props['params']; searchParams: Props['searchParams'] }) {
  const { id } = await params;
  // A malformed link is treated like a programme that does not exist.
  if (!z.uuid().safeParse(id).success) notFound();
  const account = await requireRole(locale, 'admin');
  const asked = (await searchParams).tab;
  const tab: Tab = TABS.find((x) => x === asked) ?? 'maklumat';
  const t = dict.admin;

  let programme: ProgrammeDetail;
  let names: DetailNames;
  try {
    const token = (await getAccessToken())!;
    const [p, reference, nec, institutions] = await Promise.all([getProgrammeDetail(token, id), getReferenceData(), listNecFields(token), listInstitutions(token)]);
    programme = p;
    names = {
      institutions: new Map(institutions.map((i) => [i.id, i.name])),
      fields: new Map(reference.fields.map((f) => [f.id, fieldName(f, locale)])),
      nec: new Map(nec.map((n) => [n.code, n.name])),
    };
  } catch (err) {
    if (err instanceof AdminApiError && (err.status === 404 || err.status === 400)) notFound();
    return <LoadError text={t.errors.generic} />;
  }

  const me = account.id;
  const workflow = programmeWorkflow(programme, me);
  const w = t.programme.workflow;
  const message =
    workflow.message === 'returned'
      ? format(w.returned, { reason: programme.returnReason ?? '' })
      : workflow.message === 'changeReturned'
        ? format(w.changeReturned, { reason: programme.pendingReturnReason ?? '' })
        : w[workflow.message];
  const live = liveDetails(programme);
  const base = `/${locale}/admin/program/${id}`;
  const routeCount = new Set(programme.requirements.map((r) => r.entryRoute)).size;

  return (
    <>
      <AdminHeading
        // Back to where the programme belongs: its institution (Form 4 streams have none).
        back={
          programme.institutionId
            ? { href: `/${locale}/admin/institusi/${programme.institutionId}?tab=program`, label: `← ${programme.institutionName ?? t.institutions.title}` }
            : { href: `/${locale}/admin/program`, label: t.programme.back }
        }
        title={programme.name}
        intro={
          <span className="flex flex-wrap items-center gap-2">
            <span>{[programme.institutionName, dict.levels[programme.studyLevel], programme.upuCode].filter(Boolean).join(' · ')}</span>
            <StatusChip status={programme.status} t={t} />
            {programme.pendingStatus && <span className="rounded-full bg-yellow px-2.5 py-1 text-xs font-semibold">{t.programmes.changeBadge}</span>}
          </span>
        }
      />

      <ProgrammeWorkflowPanel locale={locale} programmeId={programme.id} workflow={workflow} message={message} t={t} />

      <nav aria-label={programme.name} className="flex flex-wrap gap-1 self-start rounded-[12px] bg-white p-1">
        {TABS.map((key) => (
          <Link
            key={key}
            href={key === 'maklumat' ? base : `${base}?tab=${key}`}
            aria-current={key === tab ? 'page' : undefined}
            className={`rounded-[9px] px-4 py-2 text-sm font-semibold ${key === tab ? 'bg-navy text-white' : 'hover:bg-bg'}`}
          >
            {key === 'maklumat' ? t.programme.tabs.details : `${t.programme.tabs.requirements} (${routeCount})`}
          </Link>
        ))}
      </nav>

      {tab === 'maklumat' ? (
        <>
          {programme.pendingChanges && (
            <ProgrammeChanges live={live} proposed={programme.pendingChanges} dict={dict} names={names} by={who(programme.pendingPreparedBy, me, t)} />
          )}
          <Card>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-semibold">{t.programme.details}</h2>
              {programme.preparedBy && <span className="text-[13px] text-muted">{format(t.programme.preparedBy, { who: who(programme.preparedBy, me, t) })}</span>}
            </div>
            <ProgrammeDetails details={live} dict={dict} names={names} />
          </Card>
        </>
      ) : (
        <Requirements locale={locale} dict={dict} programme={programme} me={me} />
      )}
    </>
  );
}

function Requirements({ locale, dict, programme, me }: { locale: Locale; dict: Dictionary; programme: ProgrammeDetail; me: string }) {
  const t = dict.admin;
  const r = t.programme.requirements;
  const routes: Record<string, string> = dict.requirements.routes;
  const used = [...new Set(programme.requirements.map((v) => v.entryRoute))];
  const suggested = EntryRoutesByLevel[programme.studyLevel] as readonly string[];
  // Routes not used yet: the usual ones for this level first, marked as such.
  const unused = [...suggested, ...EntryRoutes.filter((x) => !suggested.includes(x))]
    .filter((x) => !used.includes(x))
    .map((x) => ({ value: x, label: suggested.includes(x) ? `${routes[x] ?? x} ${r.suggestedSuffix}` : (routes[x] ?? x) }));

  return (
    <Card>
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold">{r.title}</h2>
        <p className="text-sm text-muted">{r.intro}</p>
      </div>
      {used.length === 0 ? (
        <p className="rounded-[12px] bg-bg px-4 py-3 text-sm text-muted">{r.empty}</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {used.map((route) => {
            const versions = programme.requirements.filter((v) => v.entryRoute === route);
            const published = versions.find((v) => v.status === 'published');
            const open = versions.find((v) => OPEN.has(v.status));
            const older = versions.filter((v) => v !== published && v !== open);
            return (
              <li key={route} className="flex flex-col gap-2 rounded-[14px] border border-line p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <p className="font-semibold">{routes[route] ?? route}</p>
                    <p className={`text-[13px] ${published ? 'text-muted' : 'text-[#b33a35]'}`}>{published ? format(r.published, { version: published.versionNo }) : r.none}</p>
                    {open && <p className="text-[13px]">{format(r.draftBy, { status: t.status[open.status], version: open.versionNo, who: who(open.preparedBy, me, t) })}</p>}
                  </div>
                  <div className="flex flex-wrap items-start gap-2">
                    {published && (
                      <Link href={`/${locale}/admin/syarat/${published.id}`} className="rounded-[10px] px-3 py-2 text-sm font-semibold hover:bg-bg">
                        {r.view}
                      </Link>
                    )}
                    {open ? (
                      <Link href={`/${locale}/admin/syarat/${open.id}`} className="rounded-[10px] bg-navy px-3.5 py-2 text-sm font-semibold text-white hover:bg-navy/90">
                        {r.openDraft}
                      </Link>
                    ) : (
                      <StartRequirement locale={locale} programId={programme.id} entryRoute={route} label={r.update} errors={t.errors} />
                    )}
                  </div>
                </div>
                {older.length > 0 && <OlderVersions locale={locale} versions={older} label={r.history} />}
              </li>
            );
          })}
        </ul>
      )}
      {unused.length > 0 && (
        <RouteStarter
          locale={locale}
          programId={programme.id}
          routes={unused}
          label={r.addTitle}
          placeholder={r.routePlaceholder}
          button={r.addButton}
          noMatches={dict.directory.noMatches}
          errors={t.errors}
        />
      )}
    </Card>
  );
}

function OlderVersions({ locale, versions, label }: { locale: Locale; versions: RequirementVersion[]; label: string }) {
  return (
    <p className="flex flex-wrap gap-2 text-[13px] text-muted">
      {label}:
      {versions.map((v) => (
        <Link key={v.id} href={`/${locale}/admin/syarat/${v.id}`} className="underline hover:text-navy">
          v{v.versionNo}
        </Link>
      ))}
    </p>
  );
}
