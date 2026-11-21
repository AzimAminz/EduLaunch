import Link from 'next/link';
import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { AnswerForm, TakeButton } from '@/components/support/answer-form';
import { AdminHeading, AdminTabs, EmptyState, LoadError, timeAgo, who } from '@/components/admin/ui';
import { PageSkeleton } from '@/components/ui/skeleton';
import { getProgramme } from '@/lib/catalogue/api';
import { closedTickets, ticketQueue, type Ticket } from '@/lib/engagement/api';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { isLocale, type Dictionary, type Locale } from '@/lib/i18n/locale';
import { getAccessToken, requireRole } from '@/lib/supabase/server';

const TABS = ['open', 'answered'] as const;
type Tab = (typeof TABS)[number];

/**
 * Students' questions (Sokongan): open ones oldest first, so nobody waits longest; take one so others know it is
 * handled, then answer it (the student is notified). Reports of wrong programme data link to the programme.
 */
export default async function SupportPage({ params, searchParams }: PageProps<'/[lang]/admin/sokongan'>) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const dict = await getDictionary(lang);
  return (
    <>
      <AdminHeading title={dict.admin.support.title} intro={dict.admin.support.intro} />
      <Suspense fallback={<PageSkeleton label={dict.meta.loading} />}>
        <Queue locale={lang} dict={dict} searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function Queue({ locale, dict, searchParams }: { locale: Locale; dict: Dictionary; searchParams: PageProps<'/[lang]/admin/sokongan'>['searchParams'] }) {
  const account = await requireRole(locale, 'admin');
  const t = dict.admin.support;
  const sp = await searchParams;
  const tab: Tab = TABS.find((x) => x === sp.tab) ?? 'open';
  const token = (await getAccessToken())!;
  let open: Ticket[];
  let answered: Ticket[];
  try {
    [open, answered] = await Promise.all([ticketQueue(token), closedTickets(token)]);
  } catch {
    return <LoadError text={dict.admin.errors.generic} />;
  }
  const list = tab === 'open' ? open : answered;
  const ids = [...new Set(list.flatMap((x) => (x.programId ? [x.programId] : [])))];
  const names = new Map((await Promise.all(ids.map((id) => getProgramme(id).then((p) => [id, p.name] as const).catch(() => null)))).filter((x): x is readonly [string, string] => x !== null));
  const now = new Date().getTime();

  return (
    <>
      <AdminTabs
        label={t.title}
        items={TABS.map((x) => ({ href: `/${locale}/admin/sokongan${x === 'open' ? '' : `?tab=${x}`}`, label: t.tabs[x], icon: x === 'open' ? 'inbox' : 'check', current: x === tab, count: (x === 'open' ? open : answered).length }))}
      />
      {list.length === 0 ? (
        <EmptyState text={t.empty[tab]} />
      ) : (
        <ul className="flex flex-col gap-3">
          {list.map((x) => {
            const mine = x.assignedAdminId === account.id;
            return (
              <li key={x.id} className="flex flex-col gap-3 rounded-[12px] border border-line bg-white p-5">
                <div className="flex flex-wrap items-center gap-2 text-[12px]">
                  <span className={`rounded-full px-2.5 py-1 font-semibold ${x.category === 'wrong_data' ? 'bg-cream text-[#7a4f06]' : 'bg-bg'}`}>{dict.help.form.categories[x.category]}</span>
                  {x.createdAt && <span className="text-muted">{timeAgo(x.createdAt, now, dict.admin)}</span>}
                  {x.status === 'in_progress' && <span className="text-muted">· {format2(t.handledBy, who(x.assignedAdminId, account.id, dict.admin))}</span>}
                </div>
                {x.programId && (
                  <Link href={`/${locale}/admin/program/${x.programId}`} className="self-start text-sm font-semibold text-[#2f5bd3] hover:underline">
                    {names.get(x.programId) ?? t.programme} →
                  </Link>
                )}
                <p className="whitespace-pre-line text-sm">{x.message}</p>
                {x.status === 'closed' ? (
                  x.adminReply && (
                    <div className="rounded-[10px] bg-blue px-4 py-3">
                      <p className="text-[12px] font-semibold text-[#2f5bd3]">{format2(t.answeredBy, who(x.assignedAdminId, account.id, dict.admin))}</p>
                      <p className="whitespace-pre-line text-sm">{x.adminReply}</p>
                    </div>
                  )
                ) : x.status === 'open' ? (
                  <div className="flex flex-col gap-3 border-t border-line pt-3">
                    <TakeButton id={x.id} t={t} />
                    <AnswerForm id={x.id} t={t} />
                  </div>
                ) : mine ? (
                  <div className="border-t border-line pt-3">
                    <AnswerForm id={x.id} t={t} />
                  </div>
                ) : (
                  <p className="border-t border-line pt-3 text-[13px] text-muted">{t.otherAdmin}</p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}

/** Puts a name into a sentence with one {who}. */
const format2 = (template: string, name: string) => template.replace('{who}', name);
