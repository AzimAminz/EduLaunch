import Link from 'next/link';
import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { taskHref } from '@/components/admin/task-list';
import { AdminIcon } from '@/components/admin/icons';
import { AdminHeading, HowItWorks, LoadError, timeAgo } from '@/components/admin/ui';
import { withFrom } from '@/lib/admin/trail';
import { getTasks, type AdminTasks } from '@/lib/admin/api';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { format, isLocale, type Dictionary, type Locale } from '@/lib/i18n/locale';
import { getAccessToken, requireRole } from '@/lib/supabase/server';
import { PageSkeleton } from '@/components/ui/skeleton';

/** Admin home (Figma B1 "Laman utama · pilih tugas"): what to do today, then the admin's own pending work. */
export default async function AdminHomePage({ params }: PageProps<'/[lang]/admin'>) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const dict = await getDictionary(lang);
  return (
    <Suspense fallback={<PageSkeleton label={dict.meta.loading} />}>
      <AdminHome locale={lang} dict={dict} />
    </Suspense>
  );
}

async function AdminHome({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  const account = await requireRole(locale, 'admin');
  const t = dict.admin;
  let tasks: AdminTasks;
  try {
    tasks = await getTasks((await getAccessToken())!);
  } catch {
    return <LoadError text={t.errors.generic} />;
  }
  const now = new Date().getTime();
  const base = `/${locale}/admin`;
  const h = t.home;
  const inbox = (tab: string) => `${base}/tugasan?tab=${tab}`;
  const counts = [
    { label: h.counts.toReview, value: tasks.toReview.length, href: inbox('toReview'), lead: true },
    { label: h.counts.returned, value: tasks.returned.length, href: inbox('returned'), warn: tasks.returned.length > 0 },
    { label: h.counts.drafts, value: tasks.myDrafts.length, href: inbox('myDrafts') },
    { label: h.counts.waiting, value: tasks.waiting.length, href: inbox('waiting') },
    { label: h.counts.published, value: tasks.counts.published, href: `${base}/program?status=published` },
    { label: h.counts.withoutRequirements, value: tasks.counts.withoutRequirements, href: `${base}/program?syarat=tiada`, warn: tasks.counts.withoutRequirements > 0 },
  ];
  const groups = [
    { title: h.toReview, rows: tasks.toReview, href: inbox('toReview'), tab: 'toReview' },
    { title: h.returned, rows: tasks.returned, href: inbox('returned'), tab: 'returned' },
    { title: h.drafts, rows: tasks.myDrafts, href: inbox('myDrafts'), tab: 'myDrafts' },
    { title: h.othersDrafts, rows: tasks.othersDrafts, href: inbox('othersDrafts'), tab: 'othersDrafts' },
  ].filter((g) => g.rows.length > 0);
  // The finding first: what waits for this admin, in one sentence.
  const finding = tasks.toReview.length
    ? format(h.findingReview, { count: tasks.toReview.length })
    : tasks.returned.length
      ? format(h.findingReturned, { count: tasks.returned.length })
      : tasks.othersDrafts.length
        ? format(h.findingOthers, { count: tasks.othersDrafts.length })
        : tasks.counts.withoutRequirements
        ? format(h.findingRequirements, { count: tasks.counts.withoutRequirements })
        : h.findingClear;
  const routes: Record<string, string> = dict.requirements.routes;
  const starts = [
    { label: h.start.import, detail: h.start.importDetail, href: `${base}/institusi` },
    { label: h.start.requirements, detail: h.start.requirementsDetail, href: `${base}/program?syarat=tiada` },
    { label: h.start.programme, detail: h.start.programmeDetail, href: `${base}/program/baharu` },
  ];

  return (
    <>
      <AdminHeading title={format(h.greeting, { name: account.name ?? account.email })} intro={finding} />

      {/* One strip, split by rules: each count opens its list. */}
      <div className="grid grid-cols-2 overflow-hidden rounded-[8px] border border-line bg-white sm:grid-cols-3 xl:grid-cols-6">
        {counts.map((c) => (
          <Link
            key={c.label}
            href={c.href}
            className="-ml-px -mt-px flex flex-col gap-1 border-l border-t border-line px-4 py-3.5 transition-colors duration-150 hover:bg-[#f5f7fb] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-navy/40"
          >
            <span className="text-[13px] text-muted">{c.label}</span>
            <span className={`font-semibold tabular-nums leading-none ${c.lead ? 'text-[26px]' : 'text-[22px]'} ${c.warn ? 'text-[#b33a35]' : c.value === 0 ? 'text-muted' : ''}`}>{c.value}</span>
          </Link>
        ))}
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <section className="flex flex-col rounded-[8px] border border-line bg-white">
          <h2 className="px-5 pb-2 pt-4 text-base font-semibold">{h.yourWork}</h2>
          {groups.length === 0 ? (
            <p className="flex items-center gap-2 px-5 pb-5 text-sm text-muted">
              <AdminIcon name="checkCircle" size={16} className="text-[#247b50]" />
              {h.empty}
            </p>
          ) : (
            groups.map((g) => (
              <div key={g.title} className="border-t border-[#f0f1f3] px-5 py-3">
                <div className="mb-1 flex items-baseline justify-between gap-3">
                  <h3 className="text-[13px] font-semibold">
                    {g.title} <span className="font-normal text-muted">{g.rows.length}</span>
                  </h3>
                  {g.rows.length > 5 && (
                    <Link href={g.href} className="text-[13px] text-muted hover:text-navy hover:underline">
                      {format(t.institutions.summary.viewAll, { count: g.rows.length })}
                    </Link>
                  )}
                </div>
                <ul>
                  {g.rows.slice(0, 5).map((task) => (
                    <li key={`${task.kind}:${task.id}`} className="group flex items-center justify-between gap-3 rounded-[6px] py-1.5 text-sm">
                      <Link href={withFrom(taskHref(task, locale), base)} className="min-w-0 truncate group-hover:underline">
                        {task.programmeName}
                        <span className="text-muted">
                          {task.kind === 'requirement' && ` · ${routes[task.entryRoute ?? ''] ?? task.entryRoute ?? ''}`}
                          {task.kind === 'programme' && task.isChange && ` · ${t.tasks.change}`}
                        </span>
                      </Link>
                      <span className="flex-none text-[13px] tabular-nums text-muted">{timeAgo(task.updatedAt, now, t)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))
          )}
        </section>

        <div className="flex flex-col gap-4">
          <section className="flex flex-col rounded-[8px] border border-line bg-white py-2">
            <h2 className="px-5 pb-1 pt-2 text-base font-semibold">{h.startTitle}</h2>
            {starts.map((x) => (
              <Link key={x.href} href={x.href} className="group flex items-center gap-3 px-5 py-2.5 transition-colors duration-150 hover:bg-[#f5f7fb] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-navy/40">
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="text-sm font-semibold">{x.label}</span>
                  <span className="text-[13px] text-muted">{x.detail}</span>
                </span>
                <AdminIcon name="chevronRight" size={16} className="text-muted transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-navy motion-reduce:transition-none" />
              </Link>
            ))}
          </section>
          <HowItWorks title={h.how.title} steps={h.how.steps} />
        </div>
      </div>
    </>
  );
}
