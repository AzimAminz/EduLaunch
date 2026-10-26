import Link from 'next/link';
import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { lang as rootLang } from 'next/root-params';
import { z } from 'zod';
import { EntryRoutes, EntryRoutesByLevel } from '@edulaunch/contracts';
import { ProgrammeForm } from '@/components/admin/programme-form';
import { ReviewActions } from '@/components/admin/review-actions';
import { OtherRoute, StartRequirement } from '@/components/admin/start-requirement';
import { AdminHeading, Card, LoadError, StatusChip, who } from '@/components/admin/ui';
import { AdminApiError, getProgrammeDetail, listNecFields, type ProgrammeDetail, type RequirementVersion } from '@/lib/admin/api';
import { necOptions } from '@/lib/admin/nec';
import { fieldName, getReferenceData } from '@/lib/catalogue/api';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { format, isLocale, type Dictionary, type Locale } from '@/lib/i18n/locale';
import { getAccessToken, requireRole } from '@/lib/supabase/server';

/** One programme: its details and publishing status, and its entry requirements route by route. */
export default async function AdminProgrammePage({ params }: PageProps<'/[lang]/admin/program/[id]'>) {
  const lang = await rootLang();
  if (!isLocale(lang)) notFound();
  const dict = await getDictionary(lang);
  return (
    <Suspense fallback={<p className="text-sm text-muted">…</p>}>
      {/* The record id is only known at request time. */}
      <Programme locale={lang} dict={dict} params={params} />
    </Suspense>
  );
}

const OPEN = new Set(['draft', 'returned', 'in_review']);

async function Programme({ locale, dict, params }: { locale: Locale; dict: Dictionary; params: PageProps<'/[lang]/admin/program/[id]'>['params'] }) {
  const { id } = await params;
  // A malformed link is treated like a record that does not exist.
  if (!z.uuid().safeParse(id).success) notFound();
  const account = await requireRole(locale, 'admin');
  const t = dict.admin;
  let programme: ProgrammeDetail;
  let reference, nec;
  try {
    const token = (await getAccessToken())!;
    [programme, reference, nec] = await Promise.all([getProgrammeDetail(token, id), getReferenceData(), listNecFields(token)]);
  } catch (err) {
    if (err instanceof AdminApiError && (err.status === 404 || err.status === 400)) notFound();
    return <LoadError text={t.errors.generic} />;
  }

  const me = account.id;
  const mine = programme.preparedBy === me || programme.preparedBy === null;
  const isDraft = programme.status === 'draft' || programme.status === 'returned';
  const editable = (isDraft && mine) || programme.status === 'published';
  const allowed = [
    ...(isDraft && mine ? (['submit'] as const) : []),
    ...(programme.status === 'in_review' && programme.preparedBy !== me ? (['approve', 'return'] as const) : []),
    ...(programme.status === 'published' ? (['archive'] as const) : []),
    ...(programme.status === 'archived' ? (['reopen'] as const) : []),
  ];
  const n = t.programme.notes;
  const note =
    programme.status === 'returned'
      ? format(n.returned, { reason: programme.returnReason ?? '' })
      : programme.status === 'draft'
        ? mine
          ? n.ownDraft
          : n.otherDraft
        : programme.status === 'in_review'
          ? programme.preparedBy === me
            ? n.ownReview
            : n.review
          : n[programme.status];

  return (
    <>
      <AdminHeading
        // Back to where the programme belongs: its institution (Form 4 streams have none).
        back={
          programme.institutionId
            ? { href: `/${locale}/admin/institusi/${programme.institutionId}`, label: `← ${programme.institutionName ?? t.institutions.title}` }
            : { href: `/${locale}/admin/program`, label: t.programme.back }
        }
        title={programme.name}
        intro={
          <span className="flex flex-wrap items-center gap-2">
            {programme.institutionName && <span>{programme.institutionName} ·</span>}
            <span>{dict.levels[programme.studyLevel]}</span>
            <StatusChip status={programme.status} t={t} />
          </span>
        }
      />

      <p className={`rounded-[14px] px-4 py-3 text-sm ${programme.status === 'returned' ? 'bg-red/10' : programme.status === 'published' ? 'bg-mint' : 'bg-cream'}`}>
        {note}
        {programme.preparedBy && <span className="text-muted"> · {format(t.programme.preparedBy, { who: who(programme.preparedBy, me, t) })}</span>}
      </p>

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Card>
          <h2 className="text-lg font-semibold">{t.programme.details}</h2>
          <ProgrammeForm
            // A new form after each status change, so it shows what was saved.
            key={`${programme.status}:${programme.updatedAt.getTime()}`}
            locale={locale}
            t={t}
            levels={dict.levels}
            noMatches={dict.directory.noMatches}
            institutions={[]}
            fields={reference.fields.map((f) => ({ value: f.id, label: fieldName(f, locale) })).sort((a, b) => a.label.localeCompare(b.label, locale))}
            necFields={necOptions(nec)}
            programme={programme}
            editable={editable}
          />
          <ReviewActions locale={locale} kind="programme" id={programme.id} allowed={[...allowed]} t={t} />
        </Card>

        <Requirements locale={locale} dict={dict} programme={programme} me={me} />
      </div>
    </>
  );
}

function Requirements({ locale, dict, programme, me }: { locale: Locale; dict: Dictionary; programme: ProgrammeDetail; me: string }) {
  const t = dict.admin;
  const r = t.programme.requirements;
  const routes: Record<string, string> = dict.requirements.routes;
  const suggested = EntryRoutesByLevel[programme.studyLevel];
  const used = [...new Set(programme.requirements.map((v) => v.entryRoute))];
  const shown = [...suggested, ...used.filter((x) => !(suggested as readonly string[]).includes(x))];
  const others = EntryRoutes.filter((x) => !shown.includes(x)).map((x) => ({ value: x, label: routes[x] ?? x }));

  return (
    <Card>
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold">{r.title}</h2>
        <p className="text-sm text-muted">{r.intro}</p>
      </div>
      <ul className="flex flex-col gap-3">
        {shown.map((route) => {
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
                    <Link href={`/${locale}/admin/syarat/${open.id}`} className="rounded-[10px] bg-yellow px-3.5 py-2 text-sm font-semibold hover:bg-yellow/85">
                      {r.openDraft}
                    </Link>
                  ) : (
                    <StartRequirement locale={locale} programId={programme.id} entryRoute={route} label={published ? r.update : r.add} primary={!published} errors={t.errors} />
                  )}
                </div>
              </div>
              {older.length > 0 && <OlderVersions locale={locale} versions={older} label={r.history} />}
            </li>
          );
        })}
      </ul>
      {others.length > 0 && <OtherRoute locale={locale} programId={programme.id} routes={others} t={t} noMatches={dict.directory.noMatches} />}
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
