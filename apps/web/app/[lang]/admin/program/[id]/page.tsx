import Link from 'next/link';
import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { lang as rootLang } from 'next/root-params';
import { z } from 'zod';
import { EntryRoutes, EntryRoutesByLevel } from '@edulaunch/contracts';
import { FoundDetailsBody } from '@/components/admin/epanduan-details';
import { ProgrammeChanges, ProgrammeDetails, type DetailNames } from '@/components/admin/programme-details';
import { ProgrammeWorkflowPanel } from '@/components/admin/programme-workflow-panel';
import { RequirementLinesView } from '@/components/admin/requirement-lines-view';
import { RemoveFromRoute, RouteStarter, StartRequirement } from '@/components/admin/start-requirement';
import { AdminIcon } from '@/components/admin/icons';
import { AdminHeading, AdminTabs, Card, EmptyState, IconText, LoadError, StatusChip, buttonClass, who } from '@/components/admin/ui';
import { AdminApiError, getProgrammeDetail, getRequirementDetail, listFoundProgrammes, listInstitutions, listNecFields, listSpecialRequirements, type PendingDetails, type ProgrammeDetail, type RequirementVersion } from '@/lib/admin/api';
import { programmeWorkflow } from '@/lib/admin/programme-workflow';
import { fieldName, getReferenceData, localName } from '@/lib/catalogue/api';
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
  const sp = await searchParams;
  const tab: Tab = TABS.find((x) => x === sp.tab) ?? 'maklumat';
  // Set by the requirement editor after saving: what was just done.
  const done = sp.selesai === 'draf' ? 'draft' : sp.selesai === 'hantar' ? 'sent' : null;
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
  const workflow = programmeWorkflow(programme, me, account.superAdmin);
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
            {programme.entryRoutes.length > 0 && (
              <span className="flex w-full flex-wrap items-center gap-1 text-[13px]">
                <span className="text-muted">{t.programme.entryRoutes}:</span>
                {programme.entryRoutes.map((r) => (
                  <span key={r} className="rounded-full bg-blue px-2 py-0.5 text-xs font-semibold text-navy">
                    {(dict.requirements.routes as Record<string, string>)[r] ?? r}
                  </span>
                ))}
              </span>
            )}
          </span>
        }
      />

      <ProgrammeWorkflowPanel
        // A new status starts the panel afresh (no question box left open from before).
        key={`${programme.status}:${programme.pendingStatus ?? ''}`}
        locale={locale}
        programmeId={programme.id}
        workflow={workflow}
        message={message}
        requirementCount={programme.requirements.length}
        backHref={programme.institutionId ? `/${locale}/admin/institusi/${programme.institutionId}?tab=program` : `/${locale}/admin/program`}
        t={t}
      />

      {done && tab === 'syarat' && (
        <p role="status" className="flex items-center gap-2 rounded-[14px] bg-mint px-4 py-3 text-sm font-medium text-[#1f6b47]">
          <AdminIcon name="checkCircle" size={18} />
          {t.programme.requirements.done[done]}
        </p>
      )}
      <AdminTabs
        label={programme.name}
        items={[
          { href: base, label: t.programme.tabs.details, icon: 'info', current: tab === 'maklumat' },
          { href: `${base}?tab=syarat`, label: t.programme.tabs.requirements, icon: 'listChecks', current: tab === 'syarat', count: routeCount },
        ]}
      />

      {tab === 'maklumat' ? (
        <>
          {programme.pendingChanges && (
            <ProgrammeChanges live={live} proposed={programme.pendingChanges} dict={dict} names={names} by={who(programme.pendingPreparedBy, me, t)} />
          )}
          <Card>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="flex items-center gap-2 text-lg font-semibold">
                <AdminIcon name="info" size={20} />
                {t.programme.details}
              </h2>
              {programme.preparedBy && <span className="text-[13px] text-muted">{format(t.programme.preparedBy, { who: who(programme.preparedBy, me, t) })}</span>}
            </div>
            <ProgrammeDetails details={live} dict={dict} names={names} />
          </Card>
        </>
      ) : (
        <>
          <Requirements locale={locale} dict={dict} programme={programme} me={me} chosen={typeof sp.laluan === 'string' ? sp.laluan : undefined} />
          {programme.upuCode && (
            <Suspense fallback={null}>
              <EpanduanReference code={programme.upuCode} dict={dict} />
            </Suspense>
          )}
        </>
      )}
    </>
  );
}

/**
 * Entry requirements by route, laid out like the ePanduan reference: a tab per route (the routes the programme
 * takes from its source, and any with requirements), then for the chosen route its status, the next action, and
 * the lines as Syarat Am and Syarat Khas.
 */
async function Requirements({ locale, dict, programme, me, chosen }: { locale: Locale; dict: Dictionary; programme: ProgrammeDetail; me: string; chosen: string | undefined }) {
  const t = dict.admin;
  const r = t.programme.requirements;
  const routes: Record<string, string> = dict.requirements.routes;
  const withVersions = [...new Set(programme.requirements.map((v) => v.entryRoute))];
  const shown = [...new Set([...programme.entryRoutes, ...withVersions])].filter((x) => (EntryRoutes as readonly string[]).includes(x));
  const route = shown.find((x) => x === chosen) ?? shown[0];
  const suggested = EntryRoutesByLevel[programme.studyLevel] as readonly string[];
  // Routes not shown yet: the usual ones for this level first, marked as such.
  const others = [...suggested, ...EntryRoutes.filter((x) => !suggested.includes(x))]
    .filter((x) => !shown.includes(x))
    .map((x) => ({ value: x, label: suggested.includes(x) ? `${routes[x] ?? x} ${r.suggestedSuffix}` : (routes[x] ?? x) }));
  const base = `/${locale}/admin/program/${programme.id}?tab=syarat`;

  const versions = programme.requirements.filter((v) => v.entryRoute === route);
  const published = versions.find((v) => v.status === 'published');
  const open = versions.find((v) => OPEN.has(v.status));
  const older = versions.filter((v) => v !== published && v !== open);
  // The lines shown: the draft being worked on, else the published version.
  const showing = open ?? published;
  let detail = null;
  let subjectNames = new Map<string, string>();
  if (showing) {
    try {
      const token = (await getAccessToken())!;
      const [d, reference] = await Promise.all([getRequirementDetail(token, showing.id), getReferenceData()]);
      detail = d;
      subjectNames = new Map(reference.subjects.map((s) => [s.id, localName(s, locale)]));
    } catch {
      detail = null;
    }
  }

  return (
    <Card>
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold">{r.title}</h2>
        <p className="text-sm text-muted">{r.intro}</p>
      </div>
      {shown.length === 0 ? (
        <EmptyState icon="listChecks" text={r.empty} />
      ) : (
        <>
          <nav aria-label={r.title} className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1">
            {shown.map((x) => {
              const done = programme.requirements.some((v) => v.entryRoute === x && v.status === 'published');
              return (
                <Link
                  key={x}
                  href={`${base}&laluan=${x}`}
                  aria-current={x === route ? 'page' : undefined}
                  className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[13px] font-semibold transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy/40 ${
                    x === route ? 'border-navy bg-navy text-white' : 'border-line bg-white text-navy hover:bg-bg'
                  }`}
                >
                  <AdminIcon name={done ? 'checkCircle' : 'alert'} size={13} className={x === route ? '' : done ? 'text-[#1f6b47]' : 'text-[#b33a35]'} />
                  {routes[x] ?? x}
                </Link>
              );
            })}
          </nav>
          {route && (
            <section className="flex flex-col gap-3 rounded-[14px] border border-line bg-bg/40 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex min-w-0 flex-col gap-0.5">
                  <p className="font-semibold">{routes[route] ?? route}</p>
                  <p className={`inline-flex items-center gap-1.5 text-[13px] ${published ? 'text-[#1f6b47]' : 'text-[#b33a35]'}`}>
                    <AdminIcon name={published ? 'checkCircle' : 'alert'} size={14} />
                    {published ? format(r.published, { version: published.versionNo }) : r.none}
                  </p>
                  {open && <p className="text-[13px]">{format(r.draftBy, { status: t.status[open.status], version: open.versionNo, who: who(open.preparedBy, me, t) })}</p>}
                  {detail?.sourceCategory && <p className="text-[12px] text-muted">{format(r.fromCategory, { category: (t.institutions.import.categories as Record<string, string>)[detail.sourceCategory] ?? detail.sourceCategory })}</p>}
                </div>
                <div className="flex flex-wrap items-start gap-2">
                  {published && open && (
                    <Link href={`/${locale}/admin/syarat/${published.id}`} className={buttonClass('ghost', 'sm')}>
                      <IconText icon="eye">{r.view}</IconText>
                    </Link>
                  )}
                  {open ? (
                    <Link href={`/${locale}/admin/syarat/${open.id}`} className={buttonClass('primary', 'sm')}>
                      <IconText icon="pencil">{r.openDraft}</IconText>
                    </Link>
                  ) : (
                    <StartRequirement locale={locale} programId={programme.id} entryRoute={route} label={published ? r.update : r.start} primary={!published} errors={t.errors} />
                  )}
                  {open && open.status !== 'in_review' && open.preparedBy === me && (
                    <RemoveFromRoute
                      locale={locale}
                      programId={programme.id}
                      entryRoute={route}
                      draftId={open.id}
                      texts={{ label: r.discardDraft, confirm: r.discardDraftConfirm, yes: r.removeYes, cancel: r.cancel }}
                      errors={t.errors}
                    />
                  )}
                  {!open && !published && (
                    <RemoveFromRoute
                      locale={locale}
                      programId={programme.id}
                      entryRoute={route}
                      texts={{ label: r.removeRoute, confirm: r.removeRouteConfirm, yes: r.removeYes, cancel: r.cancel }}
                      errors={t.errors}
                    />
                  )}
                </div>
              </div>
              {detail ? (
                detail.rules.length ? (
                  <RequirementLinesView rules={detail.rules} subjectNames={subjectNames} t={t.requirement} />
                ) : (
                  <p className="rounded-[12px] bg-white px-4 py-3 text-sm text-muted">{r.noLines}</p>
                )
              ) : (
                <p className="rounded-[12px] bg-white px-4 py-3 text-sm text-muted">{r.notStarted}</p>
              )}
              {older.length > 0 && <OlderVersions locale={locale} versions={older} label={r.history} />}
            </section>
          )}
        </>
      )}
      {others.length > 0 && (
        <RouteStarter
          locale={locale}
          programId={programme.id}
          routes={others}
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

/** What ePanduan lists for this programme (each category's Syarat Am and Syarat Khas), to quote while writing rules. */
async function EpanduanReference({ code, dict }: { code: string; dict: Dictionary }) {
  const m = dict.admin.institutions.import;
  let found, special;
  try {
    const token = (await getAccessToken())!;
    [[found], special] = await Promise.all([listFoundProgrammes(token, [code]), listSpecialRequirements(token, [code])]);
  } catch {
    // The reference is a help, not part of the programme: without the content service the page still works.
    return null;
  }
  if (!found) return null;
  return (
    <Card>
      <div className="flex flex-col gap-1">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <AdminIcon name="external" size={20} />
          {m.referenceTitle}
        </h2>
        <p className="text-sm text-muted">{m.referenceIntro}</p>
      </div>
      <FoundDetailsBody programme={found} special={special} m={m} />
    </Card>
  );
}
