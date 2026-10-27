import Link from 'next/link';
import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { lang as rootLang } from 'next/root-params';
import { z } from 'zod';
import { EntryRoutes } from '@edulaunch/contracts';
import { FoundDetailsBody } from '@/components/admin/epanduan-details';
import { ProgrammeChanges, ProgrammeDetails, type DetailNames } from '@/components/admin/programme-details';
import { ProgrammeWorkflowPanel } from '@/components/admin/programme-workflow-panel';
import { RemoveFromRoute } from '@/components/admin/start-requirement';
import { AdminIcon } from '@/components/admin/icons';
import { AdminHeading, AdminTabs, Card, IconText, LoadError, StatusChip, buttonClass, who } from '@/components/admin/ui';
import { AdminApiError, getProgrammeDetail, listFoundProgrammes, listInstitutions, listNecFields, listSpecialRequirements, type PendingDetails, type ProgrammeDetail } from '@/lib/admin/api';
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
              <div className="flex flex-wrap items-center gap-3">
                {programme.preparedBy && <span className="text-[13px] text-muted">{format(t.programme.preparedBy, { who: who(programme.preparedBy, me, t) })}</span>}
                {workflow.actions.includes('edit') && (
                  <Link href={`/${locale}/admin/program/${programme.id}/sunting`} className={buttonClass('secondary', 'sm')}>
                    <IconText icon="pencil">{workflow.track === 'change' ? t.programme.act.editChange : t.programme.act.edit}</IconText>
                  </Link>
                )}
              </div>
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

/**
 * Entry requirements by route, laid out like the ePanduan reference: a tab per route (the routes the programme
 * takes from its source, and any with requirements), then for the chosen route its status, the next action, and
 * the lines as Syarat Am and Syarat Khas.
 */
/**
 * The requirements tab in one card: what ePanduan lists for the programme (facts, then each candidate category's
 * Syarat Am and Syarat Khas). Right under the category tabs: one "add requirements" action (which asks the route
 * first) and the requirements already written, each with its state and next action.
 */
async function Requirements({ locale, dict, programme, me }: { locale: Locale; dict: Dictionary; programme: ProgrammeDetail; me: string }) {
  const t = dict.admin;
  const r = t.programme.requirements;
  const m = t.institutions.import;
  let found = null;
  let special: Awaited<ReturnType<typeof listSpecialRequirements>> = [];
  if (programme.upuCode) {
    try {
      const token = (await getAccessToken())!;
      [[found], special] = await Promise.all([listFoundProgrammes(token, [programme.upuCode]), listSpecialRequirements(token, [programme.upuCode])]);
    } catch {
      // ePanduan is a help, not part of the programme: without the content service requirements are still added.
      found = null;
    }
  }
  const written = [...new Set(programme.requirements.map((v) => v.entryRoute))].filter((x) => (EntryRoutes as readonly string[]).includes(x));
  const actions = (
    <section aria-label={r.writtenTitle} className="rounded-[14px] border border-line bg-white">
      <div className="flex items-center justify-between gap-3 rounded-t-[14px] border-b border-line bg-bg/40 px-4 py-2.5">
        <h3 className="text-[12px] font-bold uppercase tracking-wide text-muted">
          {r.writtenTitle}
          {written.length > 0 && <span className="ml-1.5 rounded-full bg-white px-1.5 py-0.5 text-[11px] text-navy">{written.length}</span>}
        </h3>
        <Link href={`/${locale}/admin/program/${programme.id}/tambah-syarat`} className={buttonClass('accent', 'sm')}>
          <IconText icon="plus">{r.add}</IconText>
        </Link>
      </div>
      {written.length === 0 ? (
        <p className="px-4 py-4 text-sm text-muted">{r.writtenNone}</p>
      ) : (
        <ul className="divide-y divide-line">
          {written.map((route) => (
            <RouteRow key={route} locale={locale} dict={dict} programme={programme} me={me} route={route} />
          ))}
        </ul>
      )}
    </section>
  );

  return (
    <Card>
      <div className="flex flex-col gap-1">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <AdminIcon name="listChecks" size={20} />
          {r.title}
        </h2>
        <p className="text-sm text-muted">{found ? r.intro : r.introManual}</p>
      </div>
      {found ? <FoundDetailsBody programme={found} special={special} m={m} below={actions} empty={m.noRequirementText} /> : actions}
    </Card>
  );
}

/**
 * One route in the list of written requirements: its name, one status per version in play (the published one, and
 * the draft or change being worked on), and the whole row opens it. Removing the admin's own draft is a small icon.
 */
function RouteRow({ locale, dict, programme, me, route }: { locale: Locale; dict: Dictionary; programme: ProgrammeDetail; me: string; route: string }) {
  const t = dict.admin;
  const r = t.programme.requirements;
  const routes: Record<string, string> = dict.requirements.routes;
  const versions = programme.requirements.filter((v) => v.entryRoute === route);
  const published = versions.find((v) => v.status === 'published');
  const open = versions.find((v) => OPEN.has(v.status));
  const target = open ?? published ?? versions[0];
  const mine = open && open.status !== 'in_review' && open.preparedBy === me;
  return (
    <li className="group relative flex items-center gap-3 px-4 py-3 transition-colors duration-150 hover:bg-bg/60">
      <div className="flex min-w-0 flex-1 flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-3">
        <p className="min-w-0 font-semibold sm:w-48 sm:shrink-0">
          {target ? (
            // The link covers the row; the remove button sits above it.
            <Link href={`/${locale}/admin/syarat/${target.id}`} className="after:absolute after:inset-0 focus-visible:outline-none focus-visible:after:rounded-none focus-visible:after:ring-2 focus-visible:after:ring-inset focus-visible:after:ring-navy/40">
              {routes[route] ?? route}
            </Link>
          ) : (
            (routes[route] ?? route)
          )}
        </p>
        <div className="flex flex-wrap items-center gap-1.5 text-[12px]">
          {published && (
            <span className="inline-flex items-center gap-1 rounded-full bg-mint px-2 py-0.5 font-semibold text-[#1f6b47]">
              <AdminIcon name="checkCircle" size={12} />
              {format(r.chipPublished, { version: published.versionNo })}
            </span>
          )}
          {open && (
            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-semibold ${open.status === 'returned' ? 'bg-red/10 text-[#b33a35]' : open.status === 'in_review' ? 'bg-blue text-navy' : 'bg-cream text-navy'}`}>
              <AdminIcon name={open.status === 'in_review' ? 'clock' : open.status === 'returned' ? 'alert' : 'pencil'} size={12} />
              {format(published ? r.chipChange : r.chipOpen, { status: t.status[open.status], who: who(open.preparedBy, me, t) })}
            </span>
          )}
        </div>
      </div>
      <span className="relative flex shrink-0 items-center gap-1">
        {mine && (
          <RemoveFromRoute
            locale={locale}
            programId={programme.id}
            entryRoute={route}
            draftId={open.id}
            compact
            texts={{ label: r.discardDraft, confirm: r.discardDraftConfirm, yes: r.removeYes, cancel: r.cancel }}
            errors={t.errors}
          />
        )}
        <AdminIcon name="chevronRight" size={18} className="text-muted transition-transform duration-150 group-hover:translate-x-0.5 motion-reduce:transition-none" />
      </span>
    </li>
  );
}

