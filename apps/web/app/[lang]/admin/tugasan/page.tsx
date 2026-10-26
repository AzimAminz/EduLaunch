import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { TaskList } from '@/components/admin/task-list';
import type { AdminIconName } from '@/components/admin/icons';
import { AdminHeading, AdminTabs, LoadError, Pagination } from '@/components/admin/ui';
import { getTasks, type AdminTasks } from '@/lib/admin/api';
import { pageOf, readListParams } from '@/lib/admin/list-params';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { isLocale, type Dictionary, type Locale } from '@/lib/i18n/locale';
import { getAccessToken, requireRole } from '@/lib/supabase/server';

const TABS = ['toReview', 'returned', 'myDrafts', 'waiting'] as const;
type Tab = (typeof TABS)[number];
const TAB_ICON: Record<Tab, AdminIconName> = { toReview: 'eye', returned: 'undo', myDrafts: 'draft', waiting: 'clock' };
const PAGE_SIZE = 20;

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
  const sp = await searchParams;
  const tab: Tab = TABS.find((x) => x === sp.tab) ?? 'toReview';
  const { page } = readListParams(sp, ['updated'], 'updated');
  let tasks: AdminTasks;
  try {
    tasks = await getTasks((await getAccessToken())!);
  } catch {
    return <LoadError text={dict.admin.errors.generic} />;
  }
  const shown = pageOf(tasks[tab], page, PAGE_SIZE);
  return (
    <>
      <AdminTabs
        label={t.title}
        items={TABS.map((key) => ({ href: `/${locale}/admin/tugasan?tab=${key}`, label: t.tabs[key], icon: TAB_ICON[key], current: key === tab, count: tasks[key].length }))}
      />
      <TaskList tasks={shown.items} locale={locale} dict={dict} now={new Date().getTime()} action={tab === 'toReview' ? t.review : t.open} empty={t.empty[tab]} />
      <Pagination
        page={shown.page}
        pageSize={PAGE_SIZE}
        total={tasks[tab].length}
        href={(p) => `/${locale}/admin/tugasan?tab=${tab}${p > 1 ? `&halaman=${p}` : ''}`}
        t={dict.admin.pagination}
      />
    </>
  );
}
