import Link from 'next/link';
import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { TaskList } from '@/components/admin/task-list';
import { AdminHeading, Card, HowItWorks, LoadError } from '@/components/admin/ui';
import { Icon } from '@/components/ui/icon';
import { getTasks, type AdminTasks } from '@/lib/admin/api';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { format, isLocale, type Dictionary, type Locale } from '@/lib/i18n/locale';
import { getAccessToken, requireRole } from '@/lib/supabase/server';

/** Admin home (Figma B1 "Laman utama · pilih tugas"): what to do today, then the admin's own pending work. */
export default async function AdminHomePage({ params }: PageProps<'/[lang]/admin'>) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const dict = await getDictionary(lang);
  return (
    <Suspense fallback={<p className="text-sm text-muted">…</p>}>
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
  const mine = [...tasks.returned, ...tasks.myDrafts, ...tasks.waiting];

  return (
    <>
      <AdminHeading title={format(t.home.greeting, { name: account.name ?? account.email })} intro={t.home.intro} />

      <div className="grid gap-4 md:grid-cols-3">
        <TaskCard
          icon="check"
          tone="bg-cream"
          title={t.home.review.title}
          body={t.home.review.body}
          note={tasks.toReview.length ? format(t.home.review.count, { count: tasks.toReview.length }) : t.home.review.none}
          href={`${base}/tugasan`}
          action={t.home.review.action}
          primary={tasks.toReview.length > 0}
        />
        <TaskCard icon="pencil" tone="bg-blue" title={t.home.requirements.title} body={t.home.requirements.body} note={tasks.counts.withoutRequirements > 0 ? t.home.requirements.hint : t.home.requirements.hintAll} href={tasks.counts.withoutRequirements > 0 ? `${base}/program?syarat=tiada` : `${base}/program`} action={t.home.requirements.action} />
        <TaskCard icon="plus" tone="bg-mint" title={t.home.programme.title} body={t.home.programme.body} href={`${base}/program/baharu`} action={t.home.programme.action} />
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <Card>
          <h2 className="text-lg font-semibold">{t.home.yourWork}</h2>
          {mine.length === 0 ? (
            <p className="text-sm text-muted">{t.home.empty}</p>
          ) : (
            <div className="flex flex-col gap-5">
              {(
                [
                  [t.home.returned, tasks.returned, t.tasks.open],
                  [t.home.drafts, tasks.myDrafts, t.tasks.open],
                  [t.home.waiting, tasks.waiting, t.tasks.open],
                ] as const
              )
                .filter(([, list]) => list.length > 0)
                .map(([title, list, action]) => (
                  <div key={title} className="flex flex-col gap-2">
                    <h3 className="text-sm font-semibold text-muted">{title}</h3>
                    <TaskList tasks={list} locale={locale} dict={dict} now={now} action={action} empty="" />
                  </div>
                ))}
            </div>
          )}
        </Card>
        <div className="flex flex-col gap-4">
          <Card>
            <h2 className="font-semibold">{t.home.catalogue}</h2>
            <p className="text-sm">{format(t.home.published, { count: tasks.counts.published })}</p>
            {tasks.counts.withoutRequirements > 0 && <p className="text-sm text-[#b33a35]">{format(t.home.withoutRequirements, { count: tasks.counts.withoutRequirements })}</p>}
          </Card>
          <HowItWorks title={t.home.how.title} steps={t.home.how.steps} />
        </div>
      </div>
    </>
  );
}

function TaskCard({ icon, tone, title, body, note, href, action, primary }: { icon: string; tone: string; title: string; body: string; note?: string; href: string; action: string; primary?: boolean }) {
  return (
    <section className="flex flex-col gap-3 rounded-[18px] border border-line bg-white p-5">
      <span className={`flex size-11 items-center justify-center rounded-[12px] ${tone}`}>
        <Icon src={`/icons/${icon}.svg`} size={22} />
      </span>
      <h2 className="text-lg font-semibold leading-snug">{title}</h2>
      <p className="flex-1 text-sm text-muted">{body}</p>
      <div className="flex items-center justify-between gap-3">
        <span className="text-[13px] font-medium">{note}</span>
        <Link href={href} className={`rounded-[10px] px-4 py-2.5 text-sm font-semibold ${primary ? 'bg-yellow hover:bg-yellow/85' : 'border border-line hover:bg-bg'}`}>
          {action}
        </Link>
      </div>
    </section>
  );
}
