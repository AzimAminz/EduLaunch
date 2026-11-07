import Link from 'next/link';
import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { lang as rootLang } from 'next/root-params';
import { z } from 'zod';
import { EntryRoutes } from '@edulaunch/contracts';
import { FoundDetailsBody } from '@/components/admin/epanduan-details';
import { ProgrammeChanges, ProgrammeDetails, type DetailNames } from '@/components/admin/programme-details';
import { ProgrammeWorkflowPanel } from '@/components/admin/programme-workflow-panel';
import { RouteTabs, type RouteTab } from '@/components/admin/route-tabs';
import { AdminIcon } from '@/components/admin/icons';
import { AdminHeading, AdminTabs, Card, IconText, LoadError, StatusChip, buttonClass, who } from '@/components/admin/ui';
import { AdminApiError, getProgrammeDetail, listFoundProgrammes, listInstitutions, listNecFields, listSpecialRequirements, type PendingDetails, type ProgrammeDetail } from '@/lib/admin/api';
import { differencesFromEpanduan, draftFromFound, type EpanduanFormField } from '@/lib/admin/epanduan-import';
import { requirementSlots } from '@/lib/admin/requirement-slots';
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
  programCode: p.programCode,
  internalCode: p.internalCode,
  faculty: p.faculty,
  necCode: p.necCode,
  studyMode: p.studyMode,
  campuses: p.campuses,
  hasInterview: p.hasInterview,
  isStem: p.isStem,
  isTvet: p.isTvet,
  bumiputeraOnly: p.bumiputeraOnly,
  jointDegree: p.jointDegree,
  feeder: p.feeder,
  careers: p.careers,
  fees: p.fees,
  note: p.note,
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
  const done = sp.selesai === 'draf' ? 'draft' : sp.selesai === 'hantar' ? 'sent' : sp.selesai === 'dari-epanduan' ? 'drafted' : null;
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
            <span>{[programme.institutionName, dict.levels[programme.studyLevel], programme.programCode].filter(Boolean).join(' · ')}</span>
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
          {workflow.canEdit && programme.programCode && (
            <Suspense fallback={null}>
              <EpanduanDifferences locale={locale} dict={dict} programme={programme} details={programme.pendingChanges ?? live} />
            </Suspense>
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
 * The requirements tab in one card: the programme's facts from ePanduan, then a tab per route with where its
 * requirements stand and the ePanduan text it is written from (see RouteTabs).
 */
async function Requirements({ locale, dict, programme, me }: { locale: Locale; dict: Dictionary; programme: ProgrammeDetail; me: string }) {
  const t = dict.admin;
  const r = t.programme.requirements;
  const m = t.institutions.import;
  const routes: Record<string, string> = dict.requirements.routes;
  let found = null;
  let special: Awaited<ReturnType<typeof listSpecialRequirements>> = [];
  if (programme.programCode) {
    try {
      const token = (await getAccessToken())!;
      [[found], special] = await Promise.all([listFoundProgrammes(token, [programme.programCode]), listSpecialRequirements(token, [programme.programCode])]);
    } catch {
      // ePanduan is a help, not part of the programme: without the content service requirements are still added.
      found = null;
    }
  }
  // Only the programme's routes (a removed route's categories are hidden); programmes from before routes were kept show all.
  const kept = new Set(programme.entryRoutes);
  const categories = (found?.categories ?? []).filter((c) => c.route && (kept.size === 0 || kept.has(c.route)));
  const labels = m.categories as Record<string, string>;
  // A tab per requirement: per route (in route order), one per group of ePanduan categories with the same text.
  const slots = requirementSlots(EntryRoutes, categories, special, programme.requirements);
  const tabs: RouteTab[] = slots.map((slot) => {
    const published = slot.versions.find((v) => v.status === 'published');
    const open = slot.versions.find((v) => OPEN.has(v.status));
    const target = open ?? published;
    const name = routes[slot.route] ?? slot.route;
    const several = slots.filter((x) => x.route === slot.route).length > 1;
    const detail = !several ? null : slot.categories.length ? slot.categories.map((c) => labels[c] ?? c).join(' · ') : r.ownSlot;
    return {
      key: slot.key,
      route: slot.route,
      name,
      detail,
      status: open ? (open.status as RouteTab['status']) : published ? 'published' : null,
      statusText:
        published && open
          ? format(r.tabChange, { version: published.versionNo, status: t.status[open.status].toLowerCase() })
          : open
            ? format(r.tabOpen, { status: t.status[open.status], who: who(open.preparedBy, me, t) })
            : published
              ? format(r.chipPublished, { version: published.versionNo })
              : slot.group
                ? r.readyFromEpanduan
                : r.none,
      href: target ? `/${locale}/admin/syarat/${target.id}` : null,
      startHref: `/${locale}/admin/program/${programme.id}/tambah-syarat?laluan=${slot.route}${slot.category ? `&kategori=${encodeURIComponent(slot.category)}` : ''}`,
      groups: slot.group ? [slot.group] : [],
      ready: !!slot.group && slot.versions.length === 0,
      removable:
        !published && (!open || (open.status !== 'in_review' && open.preparedBy === me))
          ? { draftId: open?.id ?? null, programId: programme.id, entryRoute: slot.route, categories: slot.categories, name: detail ? `${name} (${detail})` : name }
          : null,
    };
  });
  const byRoute = (
    <RouteTabs locale={locale} programId={programme.id} tabs={tabs} addHref={`/${locale}/admin/program/${programme.id}/tambah-syarat`} t={r} m={m} errors={t.errors} />
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
      {found ? <FoundDetailsBody programme={found} special={special} m={m} requirements={byRoute} /> : byRoute}
    </Card>
  );
}

/**
 * Where the catalogue's details differ from the last ePanduan reading (careers, fees, campuses…), with the way to
 * take ePanduan's values: the edit form shows each difference by its field.
 */
async function EpanduanDifferences({ locale, dict, programme, details }: { locale: Locale; dict: Dictionary; programme: ProgrammeDetail; details: PendingDetails }) {
  let found;
  let nec;
  try {
    const token = (await getAccessToken())!;
    [[found], nec] = await Promise.all([listFoundProgrammes(token, [programme.programCode!]), listNecFields(token)]);
  } catch {
    return null;
  }
  if (!found?.level) return null;
  const draft = draftFromFound(found, new Map(nec.map((n) => [n.code, n.fieldId])));
  const fields = differencesFromEpanduan(details as unknown as Record<EpanduanFormField, unknown>, draft as unknown as Record<EpanduanFormField, unknown>);
  if (fields.length === 0) return null;
  const f = dict.admin.programmeForm;
  const label: Record<EpanduanFormField, string> = {
    name: f.name,
    durationSemesters: f.duration,
    necCode: f.nec,
    studyMode: f.studyMode,
    campuses: f.campuses,
    hasInterview: f.interview,
    bumiputeraOnly: f.bumiputera,
    isStem: f.stem,
    isTvet: f.tvet,
    jointDegree: f.jointDegree,
    feeder: f.feeder,
    careers: f.careers,
    fees: f.fees,
    note: f.note,
  };
  return (
    <div role="status" className="flex flex-wrap items-center gap-3 rounded-[14px] border border-[#e0a800]/50 bg-cream px-4 py-3 text-sm">
      <AdminIcon name="info" size={18} className="shrink-0" />
      <span className="flex-1">
        {format(f.fill.summary, { count: fields.length, year: found.year ?? '' })} <span className="font-semibold">{fields.map((k) => label[k]).join(', ')}</span>
      </span>
      <Link href={`/${locale}/admin/program/${programme.id}/sunting`} className={buttonClass('secondary', 'sm')}>
        <IconText icon="pencil">{f.fill.review}</IconText>
      </Link>
    </div>
  );
}

