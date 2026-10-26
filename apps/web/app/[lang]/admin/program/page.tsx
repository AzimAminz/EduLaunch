import Link from 'next/link';
import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { z } from 'zod';
import { ProgrammeTable } from '@/components/admin/programme-table';
import { AdminHeading, ButtonLink, HowItWorks, LoadError } from '@/components/admin/ui';
import { Icon } from '@/components/ui/icon';
import { ReviewStatus, listAdminInstitutions, listProgrammes } from '@/lib/admin/api';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { format, isLocale, type Dictionary, type Locale } from '@/lib/i18n/locale';
import { getAccessToken, requireRole } from '@/lib/supabase/server';

type Search = Promise<Record<string, string | string[] | undefined>>;

/**
 * Programme list (Figma A5): search, filter by institution, status or "no published requirements", open a programme.
 * Filters live in the address (`?institusi=…&status=…&syarat=tiada&q=…`), so a filtered list can be linked to.
 */
export default async function AdminProgrammesPage({ params, searchParams }: PageProps<'/[lang]/admin/program'>) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const dict = await getDictionary(lang);
  return (
    <Suspense fallback={<p className="text-sm text-muted">…</p>}>
      <Programmes locale={lang} dict={dict} searchParams={searchParams} />
    </Suspense>
  );
}

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

async function Programmes({ locale, dict, searchParams }: { locale: Locale; dict: Dictionary; searchParams: Search }) {
  await requireRole(locale, 'admin');
  const t = dict.admin;
  const sp = await searchParams;
  const query = first(sp.q)?.trim().slice(0, 100) ?? '';
  const status = ReviewStatus.safeParse(first(sp.status)).data;
  const institutionId = z.uuid().safeParse(first(sp.institusi)).data;
  const missing = first(sp.syarat) === 'tiada';
  const base = `/${locale}/admin/program`;

  let page, institutions;
  try {
    const token = (await getAccessToken())!;
    [page, institutions] = await Promise.all([listProgrammes(token, { query, status, institutionId, missingRequirements: missing }), listAdminInstitutions(token)]);
  } catch {
    return <LoadError text={t.errors.generic} />;
  }
  const institution = institutions.find((i) => i.id === institutionId);

  /** The current address with one filter changed (undefined removes it). */
  const href = (change: Partial<Record<'q' | 'status' | 'institusi' | 'syarat', string | undefined>>) => {
    const current = { q: query || undefined, status, institusi: institutionId, syarat: missing ? 'tiada' : undefined, ...change };
    const p = new URLSearchParams(Object.entries(current).filter((e): e is [string, string] => !!e[1]));
    const qs = p.toString();
    return qs ? `${base}?${qs}` : base;
  };
  const chip = (active: boolean) => `rounded-full border px-3 py-1.5 text-[13px] font-semibold ${active ? 'border-navy bg-navy text-white' : 'border-line bg-white hover:bg-bg'}`;

  return (
    <>
      <AdminHeading
        title={t.programmes.title}
        intro={format(t.programmes.intro, { total: page.total })}
        actions={
          <ButtonLink href={institutionId ? `${base}/baharu?institusi=${institutionId}` : `${base}/baharu`} primary>
            {t.programmes.add}
          </ButtonLink>
        }
      />

      <div className="flex flex-col gap-3">
        <form action={base} className="flex gap-2">
          {status && <input type="hidden" name="status" value={status} />}
          {institutionId && <input type="hidden" name="institusi" value={institutionId} />}
          {missing && <input type="hidden" name="syarat" value="tiada" />}
          <label className="flex min-w-0 flex-1 items-center gap-2 rounded-[10px] border border-line bg-white px-3">
            <Icon src="/icons/search.svg" size={18} />
            <span className="sr-only">{t.programmes.search}</span>
            <input name="q" defaultValue={query} placeholder={t.programmes.search} className="min-w-0 flex-1 bg-transparent py-2.5 text-[15px] outline-none" />
          </label>
          <button type="submit" className="rounded-[10px] bg-navy px-4 text-sm font-semibold text-white hover:bg-navy/90">
            {t.programmes.searchButton}
          </button>
        </form>

        {/* Institution: the catalogue's first level. */}
        <nav aria-label={t.programmes.columns.institution} className="flex flex-wrap gap-2">
          <Link href={href({ institusi: undefined })} aria-current={!institutionId ? 'page' : undefined} className={chip(!institutionId)}>
            {t.programmes.allInstitutions}
          </Link>
          {institutions.map((i) => (
            <Link key={i.id} href={href({ institusi: i.id })} aria-current={i.id === institutionId ? 'page' : undefined} className={chip(i.id === institutionId)} title={i.name}>
              {i.shortName ?? i.name}
            </Link>
          ))}
        </nav>

        <nav aria-label={t.programmes.columns.status} className="flex flex-wrap gap-2">
          <Link href={href({ status: undefined, syarat: undefined })} aria-current={!status && !missing ? 'page' : undefined} className={chip(!status && !missing)}>
            {t.programmes.allStatus}
          </Link>
          <Link href={href({ status: undefined, syarat: missing ? undefined : 'tiada' })} aria-current={missing ? 'page' : undefined} className={chip(missing)}>
            {t.programmes.missingRequirements}
          </Link>
          {ReviewStatus.options.map((s) => (
            <Link key={s} href={href({ status: s, syarat: undefined })} aria-current={s === status ? 'page' : undefined} className={chip(s === status)}>
              {t.status[s]}
            </Link>
          ))}
        </nav>
        {institution && (
          <p className="text-sm">
            <Link href={`/${locale}/admin/institusi/${institution.id}`} className="font-semibold hover:underline">
              {institution.name} →
            </Link>
          </p>
        )}
      </div>

      <ProgrammeTable rows={page.items} locale={locale} dict={dict} showInstitution={!institutionId} />

      <HowItWorks title={t.programmes.how.title} steps={t.programmes.how.steps} />
    </>
  );
}
