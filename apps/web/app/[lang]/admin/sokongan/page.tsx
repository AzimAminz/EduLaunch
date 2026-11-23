import Link from 'next/link';
import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { AnswerForm, TakeButton } from '@/components/support/answer-form';
import { ContactHandled } from '@/components/support/contact-handled';
import { AdminHeading, AdminTabs, EmptyState, LoadError, timeAgo, who } from '@/components/admin/ui';
import { PageSkeleton } from '@/components/ui/skeleton';
import { getProgramme } from '@/lib/catalogue/api';
import { closedTickets, listContactMessages, ticketQueue, type ContactMessage, type Ticket } from '@/lib/engagement/api';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { isLocale, type Dictionary, type Locale } from '@/lib/i18n/locale';
import { getAccessToken, requireRole } from '@/lib/supabase/server';

const TABS = ['open', 'answered', 'contact'] as const;
type Tab = (typeof TABS)[number];

/**
 * Students' questions (Sokongan): open ones oldest first, so nobody waits longest; take one so others know it is
 * handled, then answer it (the student is notified). Reports of wrong programme data link to the programme.
 * A third tab holds messages from the public contact form, answered by e-mail.
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
  let contact: { open: ContactMessage[]; handled: ContactMessage[] };
  try {
    [open, answered, contact] = await Promise.all([ticketQueue(token), closedTickets(token), listContactMessages(token)]);
  } catch {
    return <LoadError text={dict.admin.errors.generic} />;
  }
  const tabs = (
    <AdminTabs
      label={t.title}
      items={TABS.map((x) => ({
        href: `/${locale}/admin/sokongan${x === 'open' ? '' : `?tab=${x}`}`,
        label: t.tabs[x],
        icon: x === 'open' ? 'inbox' : x === 'answered' ? 'check' : 'send',
        current: x === tab,
        count: x === 'open' ? open.length : x === 'answered' ? answered.length : contact.open.length,
      }))}
    />
  );
  if (tab === 'contact') {
    return (
      <>
        {tabs}
        <ContactMessages locale={locale} dict={dict} adminId={account.id} contact={contact} />
      </>
    );
  }
  const list = tab === 'open' ? open : answered;
  const ids = [...new Set(list.flatMap((x) => (x.programId ? [x.programId] : [])))];
  const names = new Map((await Promise.all(ids.map((id) => getProgramme(id).then((p) => [id, p.name] as const).catch(() => null)))).filter((x): x is readonly [string, string] => x !== null));
  const now = new Date().getTime();

  return (
    <>
      {tabs}
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

/** The public contact form's messages: new ones to answer by e-mail, then those answered in the last 30 days. */
function ContactMessages({ locale, dict, adminId, contact }: { locale: Locale; dict: Dictionary; adminId: string; contact: { open: ContactMessage[]; handled: ContactMessage[] } }) {
  const t = dict.admin.support;
  const categories = dict.site.pages.contact.categories;
  const now = new Date().getTime();
  const item = (m: ContactMessage, open: boolean) => (
    <li key={m.id} className="flex flex-col gap-3 rounded-[12px] border border-line bg-white p-5">
      <div className="flex flex-wrap items-center gap-2 text-[12px]">
        <span className="rounded-full bg-bg px-2.5 py-1 font-semibold">{categories[m.category]}</span>
        <span className="text-muted">{timeAgo(m.createdAt, now, dict.admin)}</span>
        {!open && <span className="text-muted">· {format2(t.contact.handledBy, who(m.handledBy, adminId, dict.admin))}</span>}
      </div>
      <p className="text-sm">
        <span className="font-semibold">{m.name}</span> <span className="text-muted">· {m.email}</span>
      </p>
      <p className="whitespace-pre-line text-sm">{m.message}</p>
      {open && (
        <div className="flex flex-wrap items-start gap-3 border-t border-line pt-3">
          <a
            href={`mailto:${encodeURIComponent(m.email)}?subject=${encodeURIComponent(t.contact.subject)}`}
            className="inline-flex h-10 items-center rounded-[10px] bg-navy px-4 text-sm font-semibold text-white hover:bg-navy/90"
          >
            {t.contact.replyByEmail}
          </a>
          <ContactHandled id={m.id} t={{ ...t.contact, generic: t.errors.generic }} />
        </div>
      )}
    </li>
  );
  return (
    <div className="flex flex-col gap-4" lang={locale}>
      <p className="text-sm text-muted">{t.contact.intro}</p>
      {contact.open.length === 0 ? <EmptyState text={t.empty.contact} /> : <ul className="flex flex-col gap-3">{contact.open.map((m) => item(m, true))}</ul>}
      {contact.handled.length > 0 && (
        <>
          <h2 className="pt-2 text-[17px] font-semibold">{t.contact.handled}</h2>
          <ul className="flex flex-col gap-3">{contact.handled.map((m) => item(m, false))}</ul>
        </>
      )}
    </div>
  );
}

/** Puts a name into a sentence with one {who}. */
const format2 = (template: string, name: string) => template.replace('{who}', name);
