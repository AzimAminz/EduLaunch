import Link from 'next/link';
import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { TaskList } from '@/components/admin/task-list';
import { AdminHeading, LoadError } from '@/components/admin/ui';
import { getTasks, type AdminTasks } from '@/lib/admin/api';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { isLocale, type Dictionary, type Locale } from '@/lib/i18n/locale';
import { getAccessToken, requireRole } from '@/lib/supabase/server';

const TABS = ['toReview', 'returned', 'myDrafts', 'waiting'] as const;
type Tab = (typeof TABS)[number];

/** Task inbox (Figma A1): tabs For me / Returned / My drafts / Waiting for others. */
export default async function TasksPage({ params, searchParams }: PageProps<'/[lang]/admin/tugasan'>) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const dict = await getDictionary(lang);
  return (
    <>
      <AdminHeading title={dict.admin.tasks.title} intro={dict.admin.tasks.intro} />
      <Suspense fallback={<p className="text-sm text-muted">…</p>}>
        <Inbox locale={lang} dict={dict} searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function Inbox({ locale, dict, searchParams }: { locale: Locale; dict: Dictionary; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireRole(locale, 'admin');
  const t = dict.admin.tasks;
  const asked = (await searchParams).tab;
  const tab: Tab = TABS.find((x) => x === asked) ?? 'toReview';
  let tasks: AdminTasks;
  try {
    tasks = await getTasks((await getAccessToken())!);
  } catch {
    return <LoadError text={dict.admin.errors.generic} />;
  }
  return (
    <>
      <nav aria-label={t.title} className="flex flex-wrap gap-1 self-start rounded-[12px] bg-white p-1">
        {TABS.map((key) => (
          <Link
            key={key}
            href={`/${locale}/admin/tugasan?tab=${key}`}
            aria-current={key === tab ? 'page' : undefined}
            className={`flex items-center gap-2 rounded-[9px] px-4 py-2 text-sm font-semibold ${key === tab ? 'bg-navy text-white' : 'hover:bg-bg'}`}
          >
            {t.tabs[key]}
            <span className={`rounded-full px-2 text-xs ${key === tab ? 'bg-white/20' : 'bg-bg'}`}>{tasks[key].length}</span>
          </Link>
        ))}
      </nav>
      <TaskList tasks={tasks[tab]} locale={locale} dict={dict} now={new Date().getTime()} action={tab === 'toReview' ? t.review : t.open} empty={t.empty[tab]} />
    </>
  );
}
