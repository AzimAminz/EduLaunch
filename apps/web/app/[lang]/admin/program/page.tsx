import Link from 'next/link';
import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { AdminHeading, ButtonLink, HowItWorks, LoadError, StatusChip } from '@/components/admin/ui';
import { Icon } from '@/components/ui/icon';
import { ReviewStatus, listProgrammes } from '@/lib/admin/api';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { format, isLocale, type Dictionary, type Locale } from '@/lib/i18n/locale';
import { getAccessToken, requireRole } from '@/lib/supabase/server';

type Search = Promise<Record<string, string | string[] | undefined>>;

/** Programme list (Figma A5 "Universiti & program"): search, filter by status, open a programme. */
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
  const base = `/${locale}/admin/program`;

  let page;
  try {
    page = await listProgrammes((await getAccessToken())!, { query, status });
  } catch {
    return <LoadError text={t.errors.generic} />;
  }
  const routes: Record<string, string> = dict.requirements.routes;
  const filterHref = (s?: string) => {
    const p = new URLSearchParams();
    if (query) p.set('q', query);
    if (s) p.set('status', s);
    const qs = p.toString();
    return qs ? `${base}?${qs}` : base;
  };

  return (
    <>
      <AdminHeading
        title={t.programmes.title}
        intro={format(t.programmes.intro, { total: page.total })}
        actions={
          <ButtonLink href={`${base}/baharu`} primary>
            {t.programmes.add}
          </ButtonLink>
        }
      />

      <div className="flex flex-col gap-3">
        <form action={base} className="flex gap-2">
          {status && <input type="hidden" name="status" value={status} />}
          <label className="flex min-w-0 flex-1 items-center gap-2 rounded-[10px] border border-line bg-white px-3">
            <Icon src="/icons/search.svg" size={18} />
            <span className="sr-only">{t.programmes.search}</span>
            <input name="q" defaultValue={query} placeholder={t.programmes.search} className="min-w-0 flex-1 bg-transparent py-2.5 text-[15px] outline-none" />
          </label>
          <button type="submit" className="rounded-[10px] bg-navy px-4 text-sm font-semibold text-white hover:bg-navy/90">
            {t.programmes.searchButton}
          </button>
        </form>
        <nav aria-label={t.programmes.columns.status} className="flex flex-wrap gap-2">
          {[undefined, ...ReviewStatus.options].map((s) => (
            <Link
              key={s ?? 'all'}
              href={filterHref(s)}
              aria-current={s === status ? 'page' : undefined}
              className={`rounded-full border px-3 py-1.5 text-[13px] font-semibold ${s === status ? 'border-navy bg-navy text-white' : 'border-line bg-white hover:bg-bg'}`}
            >
              {s ? t.status[s] : t.programmes.allStatus}
            </Link>
          ))}
        </nav>
      </div>

      {page.items.length === 0 ? (
        <p className="rounded-[14px] border border-line bg-white px-5 py-4 text-sm text-muted">{t.programmes.empty}</p>
      ) : (
        <div className="overflow-x-auto rounded-[14px] border border-line bg-white">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-bg text-[13px] text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">{t.programmes.columns.programme}</th>
                <th className="px-4 py-3 font-medium">{t.programmes.columns.institution}</th>
                <th className="px-4 py-3 font-medium">{t.programmes.columns.level}</th>
                <th className="px-4 py-3 font-medium">{t.programmes.columns.requirements}</th>
                <th className="px-4 py-3 font-medium">{t.programmes.columns.status}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {page.items.map((p) => (
                <tr key={p.id} className="hover:bg-bg/60">
                  <td className="px-4 py-3">
                    <Link href={`${base}/${p.id}`} className="font-semibold hover:underline">
                      {p.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3">{p.institutionName ?? '—'}</td>
                  <td className="px-4 py-3">{dict.levels[p.studyLevel]}</td>
                  <td className="px-4 py-3">
                    {p.publishedRoutes.length ? p.publishedRoutes.map((r) => routes[r] ?? r).join(', ') : <span className="text-[#b33a35]">{t.programmes.noRequirements}</span>}
                    {p.openDrafts > 0 && <span className="ml-2 rounded-full bg-cream px-2 py-0.5 text-xs font-semibold">{format(t.programmes.openDrafts, { count: p.openDrafts })}</span>}
                  </td>
                  <td className="px-4 py-3">
                    <StatusChip status={p.status} t={t} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <HowItWorks title={t.programmes.how.title} steps={t.programmes.how.steps} />
    </>
  );
}
