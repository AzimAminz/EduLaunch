import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { lang as rootLang } from 'next/root-params';
import { z } from 'zod';
import { EntryRoutes, EntryRoutesByLevel } from '@edulaunch/contracts';
import { RequirementSteps } from '@/components/admin/requirement-steps';
import { RouteChooser, type RouteChoice } from '@/components/admin/route-chooser';
import { AdminHeading, Card, LoadError } from '@/components/admin/ui';
import { AdminApiError, getProgrammeDetail, listFoundProgrammes, listInstitutionProgrammes, listSpecialRequirements, type ProgrammeDetail } from '@/lib/admin/api';
import { getPublishedRequirements } from '@/lib/catalogue/api';
import { requirementSlots } from '@/lib/admin/requirement-slots';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { isLocale, type Dictionary, type Locale } from '@/lib/i18n/locale';
import { getAccessToken, requireRole } from '@/lib/supabase/server';

type Props = PageProps<'/[lang]/admin/program/[id]/tambah-syarat'>;

/**
 * Step 1 of adding requirements: which route they are for. Routes ePanduan lists come first, each with the category
 * its text comes from (the editor is filled from it); then the routes usual for the level, then the rest.
 */
export default async function AddRequirementPage({ params, searchParams }: Props) {
  const lang = await rootLang();
  if (!isLocale(lang)) notFound();
  const dict = await getDictionary(lang);
  return (
    <Suspense fallback={<p className="text-sm text-muted">…</p>}>
      {/* The programme id is only known at request time. */}
      <Choose locale={lang} dict={dict} params={params} searchParams={searchParams} />
    </Suspense>
  );
}

const OPEN = new Set(['draft', 'returned', 'in_review']);

async function Choose({ locale, dict, params, searchParams }: { locale: Locale; dict: Dictionary; params: Props['params']; searchParams: Props['searchParams'] }) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  if (!z.uuid().safeParse(id).success) notFound();
  await requireRole(locale, 'admin');
  const t = dict.admin;
  const c = t.requirement.chooser;
  const routes: Record<string, string> = dict.requirements.routes;
  let programme: ProgrammeDetail;
  try {
    programme = await getProgrammeDetail((await getAccessToken())!, id);
  } catch (err) {
    if (err instanceof AdminApiError && (err.status === 404 || err.status === 400)) notFound();
    return <LoadError text={t.errors.generic} />;
  }
  let found = null;
  let special: Awaited<ReturnType<typeof listSpecialRequirements>> = [];
  if (programme.programCode) {
    try {
      const token = (await getAccessToken())!;
      [[found], special] = await Promise.all([listFoundProgrammes(token, [programme.programCode]), listSpecialRequirements(token, [programme.programCode])]);
    } catch {
      found = null;
    }
  }

  // Approved requirements of the institution's other programmes, by route, to copy (many share one Syarat Am).
  const copies: Record<string, Array<{ value: string; label: string }>> = {};
  if (programme.institutionId) {
    try {
      const siblings = (await listInstitutionProgrammes((await getAccessToken())!, programme.institutionId)).filter((p) => p.id !== programme.id);
      const names = new Map(siblings.map((p) => [p.id, p.programCode ? `${p.name} (${p.programCode})` : p.name]));
      for (const r of await getPublishedRequirements(siblings.map((p) => p.id))) {
        (copies[r.entryRoute] ??= []).push({ value: r.requirementId, label: names.get(r.programId) ?? r.programId });
      }
    } catch {
      // Copying is a shortcut; without it the other ways to start still work.
    }
  }

  const stateOf = (versions: ProgrammeDetail['requirements']): RouteChoice['state'] =>
    versions.some((v) => OPEN.has(v.status)) ? 'draft' : versions.some((v) => v.status === 'published') ? 'published' : null;
  const categoryLabels = t.institutions.import.categories as Record<string, string>;
  // The same slots as the programme page: one per group of ePanduan categories with the same text, per route.
  const kept = new Set(programme.entryRoutes);
  const categories = (found?.categories ?? []).filter((x) => x.route && (kept.size === 0 || kept.has(x.route)));
  const slots = requirementSlots(EntryRoutes, categories, special, programme.requirements);
  const fromEpanduan: RouteChoice[] = slots
    .filter((slot) => slot.group)
    .map((slot) => ({
      key: slot.key,
      route: slot.route,
      category: slot.category,
      fill: slot.category ?? undefined,
      label: routes[slot.route] ?? slot.route,
      detail: slot.categories.map((x) => categoryLabels[x] ?? x).join(' · '),
      state: stateOf(slot.versions),
    }));
  const covered = new Set(fromEpanduan.map((x) => x.route));
  const suggested = EntryRoutesByLevel[programme.studyLevel] as readonly string[];
  // Routes without ePanduan text: their requirement is written by hand (category none).
  const manual = (route: string): RouteChoice => {
    const own = slots.find((slot) => slot.route === route && slot.category === null);
    return { key: route, route, category: null, label: routes[route] ?? route, detail: null, state: stateOf(own?.versions ?? []) };
  };
  const usual = suggested.filter((r) => !covered.has(r)).map(manual);
  const rest = EntryRoutes.filter((r) => !covered.has(r) && !suggested.includes(r)).map(manual);
  // From a requirement's tab: that route and category are chosen already.
  const all = [...fromEpanduan, ...usual, ...rest];
  const initial =
    typeof sp.laluan === 'string'
      ? (all.find((x) => x.route === sp.laluan && x.category === (typeof sp.kategori === 'string' ? sp.kategori : null)) ?? all.find((x) => x.route === sp.laluan))?.key
      : undefined;

  return (
    <>
      <AdminHeading back={{ href: `/${locale}/admin/program/${id}?tab=syarat`, label: `← ${programme.name}` }} title={c.title} intro={c.intro} />
      <Card>
        <RequirementSteps labels={t.requirement.steps} step={0} />
        <RouteChooser
          locale={locale}
          programId={id}
          groups={[
            { title: c.groupEpanduan, choices: fromEpanduan },
            { title: c.groupUsual, choices: usual },
            { title: c.groupOther, choices: rest },
          ]}
          initial={initial}
          copies={copies}
          t={c}
          errors={t.errors}
          noMatches={dict.directory.noMatches}
        />
      </Card>
    </>
  );
}
