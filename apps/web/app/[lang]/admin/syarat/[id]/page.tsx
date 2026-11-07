import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { lang as rootLang } from 'next/root-params';
import { z } from 'zod';
import { FreshOnNavigate } from '@/components/admin/fresh';
import { RequirementEditor } from '@/components/admin/requirement-editor';
import { RequirementLinesView } from '@/components/admin/requirement-lines-view';
import { ReviewActions } from '@/components/admin/review-actions';
import { AdminIcon } from '@/components/admin/icons';
import { AdminHeading, Card, LoadError, StatusChip, buttonClass, who } from '@/components/admin/ui';
import { AdminApiError, getProgrammeDetail, getRequirementDetail, listFoundProgrammes, listSpecialRequirements, type AdminRule, type RequirementDetail } from '@/lib/admin/api';
import { groupCategories } from '@/lib/admin/epanduan-text';
import { linesFromRules } from '@/lib/admin/requirement-form';
import { getReferenceData, localName } from '@/lib/catalogue/api';
import { describeRequirement, type RequirementItem } from '@/lib/catalogue/requirements';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { format, isLocale, type Dictionary, type Locale } from '@/lib/i18n/locale';
import { getAccessToken, requireRole } from '@/lib/supabase/server';

/**
 * One requirement version. The admin preparing a draft edits it (wizard); another admin reviews it next to
 * the published version (before / after); everyone else sees it read only.
 */
export default async function RequirementPage({ params, searchParams }: PageProps<'/[lang]/admin/syarat/[id]'>) {
  const lang = await rootLang();
  if (!isLocale(lang)) notFound();
  const dict = await getDictionary(lang);
  return (
    <Suspense fallback={<p className="text-sm text-muted">…</p>}>
      {/* The record id is only known at request time. */}
      <Requirement locale={lang} dict={dict} params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function Requirement({ locale, dict, params, searchParams }: {
  locale: Locale;
  dict: Dictionary;
  params: PageProps<'/[lang]/admin/syarat/[id]'>['params'];
  searchParams: PageProps<'/[lang]/admin/syarat/[id]'>['searchParams'];
}) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  // A malformed link is treated like a record that does not exist.
  if (!z.uuid().safeParse(id).success) notFound();
  const account = await requireRole(locale, 'admin');
  const t = dict.admin;
  let req: RequirementDetail;
  let reference;
  try {
    [req, reference] = await Promise.all([getRequirementDetail((await getAccessToken())!, id), getReferenceData()]);
  } catch (err) {
    if (err instanceof AdminApiError && (err.status === 404 || err.status === 400)) notFound();
    return <LoadError text={t.errors.generic} />;
  }
  const routes: Record<string, string> = dict.requirements.routes;
  const route = routes[req.entryRoute] ?? req.entryRoute;
  const me = account.id;
  const isDraft = req.status === 'draft' || req.status === 'returned';
  const editing = isDraft && req.preparedBy === me;
  // A super admin may also approve a draft they prepared.
  const reviewing = req.status === 'in_review' && (req.preparedBy !== me || account.superAdmin);
  const meta = format(t.requirement.meta, { institution: req.institutionName ?? '—', route, version: req.versionNo });
  const back = { href: `/${locale}/admin/program/${req.programmeId}`, label: t.requirement.back };
  const subjectNames = new Map(reference.subjects.map((s) => [s.id, localName(s, locale)]));

  if (editing) {
    const epanduan = await epanduanFor(req);
    return (
      <>
        <AdminHeading back={back} title={format(t.requirement.titleEdit, { programme: req.programmeName })} intro={meta} />
        {req.status === 'returned' && req.returnReason && <p className="rounded-[14px] bg-red/10 px-4 py-3 text-sm">{format(t.requirement.notes.returned, { reason: req.returnReason })}</p>}
        <FreshOnNavigate>
          <RequirementEditor
            // A newer saved version (after a save elsewhere) starts the editor again from what is stored.
            key={req.updatedAt.getTime()}
            locale={locale}
            id={req.id}
            programmeId={req.programmeId}
            entryRoute={req.entryRoute}
            initial={{ sourceUrl: req.sourceUrl ?? '', sourceCategory: req.sourceCategory, lines: linesFromRules(req.rules) }}
            epanduan={epanduan}
            autoFill={typeof sp.isi === 'string' ? sp.isi : null}
            copied={sp.disalin === '1'}
            subjects={reference.subjects.map((s) => ({ id: s.id, label: localName(s, locale), qualification: s.qualification, keywords: [s.name, s.nameEn ?? '', ...s.aliases].filter(Boolean) }))}
            dict={{ admin: t, requirements: dict.requirements, directory: dict.directory }}
          />
        </FreshOnNavigate>
      </>
    );
  }

  const note = reviewing
    ? req.preparedBy === me
      ? t.superAdmin.selfApprove
      : undefined
    : req.status === 'in_review'
      ? t.requirement.notes.waiting
      : isDraft
        ? t.requirement.notes.otherDraft
        : req.status === 'published'
          ? t.requirement.notes.published
          : t.requirement.notes.archived;

  return (
    <>
      <AdminHeading
        back={back}
        title={reviewing ? format(t.requirement.titleReview, { programme: req.programmeName }) : `${req.programmeName}`}
        intro={
          <span className="flex flex-wrap items-center gap-2">
            {meta} <StatusChip status={req.status} t={t} />
            <span className="text-muted">· {format(t.programme.preparedBy, { who: who(req.preparedBy, me, t) })}</span>
          </span>
        }
      />
      {note && <p className="rounded-[14px] bg-cream px-4 py-3 text-sm">{note}</p>}
      <Card>
        <h2 className="text-lg font-semibold">{t.requirement.review.lines}</h2>
        <RequirementLinesView rules={req.rules} subjectNames={subjectNames} t={t.requirement} />
      </Card>
      <Comparison req={req} dict={dict} subjectNames={subjectNames} />
      <Card>
        <h2 className="text-lg font-semibold">{t.requirement.review.source}</h2>
        <p className="text-sm text-muted">{t.requirement.review.sourceBody}</p>
        {req.sourceUrl ? (
          <a href={req.sourceUrl} target="_blank" rel="noreferrer" className={`${buttonClass('secondary')} self-start whitespace-normal break-all text-left`}>
            <AdminIcon name="external" size={16} />
            <span>
              {t.requirement.source.open} {req.sourceUrl.replace(/^https?:\/\//, '')}
            </span>
          </a>
        ) : (
          <p className="text-sm text-[#b33a35]">{t.requirement.source.missing}</p>
        )}
        <Quotes rules={req.rules} title={t.requirement.review.quotes} />
      </Card>
      {reviewing && (
        <Card>
          <h2 className="text-lg font-semibold">{t.requirement.review.decide}</h2>
          <ReviewActions locale={locale} kind="requirement" id={req.id} allowed={['approve', 'return']} t={t} effect={format(t.requirement.review.effect, { route })} />
        </Card>
      )}
    </>
  );
}

/** "What changed?": the published version next to this one, with new and removed lines marked. */
function Comparison({ req, dict, subjectNames }: { req: RequirementDetail; dict: Dictionary; subjectNames: ReadonlyMap<string, string> }) {
  const t = dict.admin.requirement.review;
  const describe = (rules: AdminRule[]) =>
    describeRequirement(
      { requirementId: req.id, programId: req.programmeId, entryRoute: req.entryRoute, versionNo: req.versionNo, sourceCategory: req.sourceCategory, rules: rules.map((r, i) => ({ ...r, id: `${i}` })) },
      subjectNames,
      dict.requirements,
    ).items;
  const next = describe(req.rules);
  const before = req.previous ? describe(req.previous.rules) : null;
  const key = (i: RequirementItem) => `${i.title}|${i.detail}`;
  const beforeKeys = new Set(before?.map(key));
  const nextKeys = new Set(next.map(key));
  const showsChange = req.status !== 'published' && req.status !== 'archived';

  return (
    <Card>
      <h2 className="text-lg font-semibold">{t.changed}</h2>
      <div className="grid gap-4 md:grid-cols-2">
        {showsChange && (
          <div className="flex flex-col gap-2 rounded-[14px] bg-bg p-4">
            <p className="text-[13px] font-semibold text-muted">{t.now}</p>
            {before ? (
              <>
                <p className="text-[13px] text-muted">{format(t.versionOf, { version: req.previous!.versionNo })}</p>
                <Items items={before} mark={(i) => (nextKeys.has(key(i)) ? null : t.removed)} />
              </>
            ) : (
              <p className="text-sm text-muted">{t.nothingPublished}</p>
            )}
          </div>
        )}
        <div className={`flex flex-col gap-2 rounded-[14px] p-4 ${showsChange ? 'border border-yellow bg-cream' : 'bg-bg md:col-span-2'}`}>
          {showsChange && <p className="text-[13px] font-semibold text-muted">{t.next}</p>}
          <p className="text-[13px] text-muted">{format(t.versionOf, { version: req.versionNo })}</p>
          <Items items={next} mark={(i) => (showsChange && before && !beforeKeys.has(key(i)) ? t.added : null)} />
        </div>
      </div>
    </Card>
  );
}

function Items({ items, mark }: { items: RequirementItem[]; mark: (item: RequirementItem) => string | null }) {
  return (
    <ul className="flex flex-col gap-2">
      {items.map((item, i) => {
        const label = mark(item);
        return (
          <li key={i} className="rounded-[10px] bg-white px-3.5 py-2.5">
            <p className="flex flex-wrap items-center gap-2 text-sm font-semibold">
              {item.title}
              {label && <span className="rounded-full bg-yellow px-2 py-0.5 text-xs">{label}</span>}
            </p>
            <p className="text-[13px] text-muted">{item.detail}</p>
          </li>
        );
      })}
    </ul>
  );
}

function Quotes({ rules, title }: { rules: AdminRule[]; title: string }) {
  const quotes = [...new Set(rules.map((r) => r.officialText?.trim()).filter((q): q is string => !!q))];
  if (quotes.length === 0) return null;
  return (
    <div className="flex flex-col gap-2">
      <p className="text-[13px] font-semibold text-muted">{title}</p>
      {quotes.map((q) => (
        <blockquote key={q} className="rounded-[10px] bg-bg px-4 py-2.5 text-sm italic">
          “{q}”
        </blockquote>
      ))}
    </div>
  );
}

/**
 * What ePanduan lists for this programme under this entry route (its categories' Syarat Am and Syarat Khas), for the
 * editor's source tab. Optional help: without a programme code or the content service the editor works as before.
 */
async function epanduanFor(req: RequirementDetail) {
  try {
    const token = (await getAccessToken())!;
    const programme = await getProgrammeDetail(token, req.programmeId);
    if (!programme.programCode) return null;
    const [[found], special] = await Promise.all([listFoundProgrammes(token, [programme.programCode]), listSpecialRequirements(token, [programme.programCode])]);
    const categories = found?.categories.filter((c) => c.route === req.entryRoute) ?? [];
    if (!categories.length) return null;
    const groups = groupCategories(categories, special);
    return {
      groups,
      sourceUrls: groups.map((g) => `https://online.mohe.gov.my/epanduan/ProgramPengajian/kategoriCalon/${g.categories[0]!.category}?jenprog=${g.categories[0]!.jenprog}`),
    };
  } catch {
    return null;
  }
}
