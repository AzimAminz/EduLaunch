import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { lang as rootLang } from 'next/root-params';
import { z } from 'zod';
import { RequirementEditor } from '@/components/admin/requirement-editor';
import { ReviewActions } from '@/components/admin/review-actions';
import { AdminHeading, Card, LoadError, StatusChip, who } from '@/components/admin/ui';
import { AdminApiError, getRequirementDetail, type AdminRule, type RequirementDetail } from '@/lib/admin/api';
import { groupsFromRules } from '@/lib/admin/requirement-form';
import { getReferenceData, localName } from '@/lib/catalogue/api';
import { describeRequirement, type RequirementItem } from '@/lib/catalogue/requirements';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { format, isLocale, type Dictionary, type Locale } from '@/lib/i18n/locale';
import { getAccessToken, requireRole } from '@/lib/supabase/server';

/**
 * One requirement version. The admin preparing a draft edits it (wizard); another admin reviews it next to
 * the published version (before / after); everyone else sees it read only.
 */
export default async function RequirementPage({ params }: PageProps<'/[lang]/admin/syarat/[id]'>) {
  const lang = await rootLang();
  if (!isLocale(lang)) notFound();
  const dict = await getDictionary(lang);
  return (
    <Suspense fallback={<p className="text-sm text-muted">…</p>}>
      {/* The record id is only known at request time. */}
      <Requirement locale={lang} dict={dict} params={params} />
    </Suspense>
  );
}

async function Requirement({ locale, dict, params }: { locale: Locale; dict: Dictionary; params: PageProps<'/[lang]/admin/syarat/[id]'>['params'] }) {
  const { id } = await params;
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
  const reviewing = req.status === 'in_review' && req.preparedBy !== me;
  const meta = format(t.requirement.meta, { institution: req.institutionName ?? '—', route, version: req.versionNo });
  const back = { href: `/${locale}/admin/program/${req.programmeId}`, label: t.requirement.back };
  const subjectNames = new Map(reference.subjects.map((s) => [s.id, localName(s, locale)]));

  if (editing) {
    return (
      <>
        <AdminHeading back={back} title={format(t.requirement.titleEdit, { programme: req.programmeName })} intro={meta} />
        {req.status === 'returned' && req.returnReason && <p className="rounded-[14px] bg-red/10 px-4 py-3 text-sm">{format(t.requirement.notes.returned, { reason: req.returnReason })}</p>}
        <RequirementEditor
          locale={locale}
          id={req.id}
          programmeId={req.programmeId}
          entryRoute={req.entryRoute}
          initial={{ sourceUrl: req.sourceUrl ?? '', groups: groupsFromRules(req.rules) }}
          subjects={reference.subjects.map((s) => ({ id: s.id, label: localName(s, locale), qualification: s.qualification, keywords: [s.name, s.nameEn ?? '', ...s.aliases].filter(Boolean) }))}
          dict={{ admin: t, requirements: dict.requirements, directory: dict.directory }}
        />
      </>
    );
  }

  const note = reviewing
    ? undefined
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
      <Comparison req={req} dict={dict} subjectNames={subjectNames} />
      <Card>
        <h2 className="text-lg font-semibold">{t.requirement.review.source}</h2>
        <p className="text-sm text-muted">{t.requirement.review.sourceBody}</p>
        {req.sourceUrl ? (
          <a href={req.sourceUrl} target="_blank" rel="noreferrer" className="self-start break-all rounded-[10px] border border-line px-4 py-2.5 text-sm font-semibold hover:bg-bg">
            {t.requirement.source.open} {req.sourceUrl.replace(/^https?:\/\//, '')}
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
      { requirementId: req.id, programId: req.programmeId, entryRoute: req.entryRoute, versionNo: req.versionNo, rules: rules.map((r, i) => ({ ...r, id: `${i}` })) },
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
  const quotes = [...new Set(rules.map((r) => r.evidenceQuote?.trim()).filter((q): q is string => !!q))];
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
