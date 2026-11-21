import Link from 'next/link';
import type { ReactNode } from 'react';
import { notFound } from 'next/navigation';
import { lang as rootLang } from 'next/root-params';
import { MarkAllRead, MarkRead, OpenNotice } from '@/components/updates/notice-actions';
import { Pending } from '@/components/ui/pending';
import { getProgramme } from '@/lib/catalogue/api';
import { listNotifications, type Notification } from '@/lib/engagement/api';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { format, isLocale, type Dictionary, type Locale } from '@/lib/i18n/locale';
import { getAccessToken } from '@/lib/supabase/server';

/**
 * "Kemas kini": the student's notices, newest first, unread ones marked. Each is worded here in the page language
 * from its type (the stored English text is only a fallback), with the programme it is about.
 */
export default async function UpdatesPage() {
  const lang = await rootLang();
  if (!isLocale(lang)) notFound();
  const dict = await getDictionary(lang);
  return (
    <div className="flex flex-col gap-6">
      <Pending label={dict.updates.loading} variant="panels">
        <Updates lang={lang} dict={dict} />
      </Pending>
    </div>
  );
}

async function Updates({ lang, dict }: { lang: Locale; dict: Dictionary }) {
  const t = dict.updates;
  const token = await getAccessToken();
  if (!token) notFound();
  let notices: Notification[];
  try {
    notices = await listNotifications(token);
  } catch {
    return (
      <>
        <Header t={t} />
        <p role="alert" className="rounded-[18px] border border-line bg-white p-6 text-sm">
          {t.unavailable}
        </p>
      </>
    );
  }
  const unread = notices.filter((n) => !n.readAt).length;
  const ids = [...new Set(notices.flatMap((n) => (n.programId ? [n.programId] : [])))];
  const names = new Map((await Promise.all(ids.map((id) => getProgramme(id).then((p) => [id, p.name] as const).catch(() => null)))).filter((x): x is readonly [string, string] => x !== null));

  const title = (n: Notification) =>
    n.type === 'requirement_changed' ? format(t.types.requirementChanged.title, { programme: (n.programId && names.get(n.programId)) || t.aProgramme }) : n.message;
  const body = (n: Notification) => (n.type === 'requirement_changed' ? t.types.requirementChanged.body : null);
  const when = (d: Date) => d.toLocaleString(lang === 'ms' ? 'ms-MY' : 'en-MY', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kuala_Lumpur' });

  return (
    <>
      <Header
        t={t}
        action={unread > 0 ? <MarkAllRead label={t.markAll} failed={t.markFailed} /> : null}
        summary={unread > 0 ? format(t.unreadCount, { count: unread }) : notices.length ? t.allRead : null}
      />
      {notices.length === 0 ? (
        <section className="flex flex-col items-start gap-3 rounded-[22px] bg-white p-6 sm:p-8">
          <h2 className="text-[20px] font-bold">{t.emptyTitle}</h2>
          <p className="text-sm text-muted">{t.emptyBody}</p>
          <Link href={`/${lang}/simpanan`} className="inline-flex h-11 items-center rounded-[12px] bg-navy px-5 text-sm font-semibold text-white hover:bg-navy/90">
            {dict.nav.saved}
          </Link>
        </section>
      ) : (
        <ul className="flex flex-col gap-3">
          {notices.map((n) => (
            <li key={n.id} className={`flex flex-col gap-3 rounded-[18px] p-5 sm:flex-row sm:items-center sm:justify-between ${n.readAt ? 'bg-white' : 'bg-blue'}`}>
              <div className="flex min-w-0 gap-3">
                <span aria-hidden className={`mt-2 size-2.5 shrink-0 rounded-full ${n.readAt ? 'bg-transparent' : 'bg-[#2f5bd3]'}`} />
                <div className="flex min-w-0 flex-col gap-1">
                  {!n.readAt && <span className="sr-only">{t.unread}</span>}
                  <p className="font-semibold leading-snug">{title(n)}</p>
                  {body(n) && <p className="text-sm text-muted">{body(n)}</p>}
                  <p className="text-[12px] text-muted">{when(n.createdAt)}</p>
                </div>
              </div>
              <div className="flex shrink-0 flex-wrap gap-2 pl-5 sm:pl-0">
                {n.programId && names.has(n.programId) && <OpenNotice id={n.id} href={`/${lang}/teroka/${n.programId}`} unread={!n.readAt} label={t.view} />}
                {!n.readAt && <MarkRead id={n.id} label={t.markRead} />}
              </div>
            </li>
          ))}
        </ul>
      )}
      <p className="text-[13px] text-muted">{t.note}</p>
    </>
  );
}

function Header({ t, action, summary }: { t: Dictionary['updates']; action?: ReactNode; summary?: string | null }) {
  return (
    <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex flex-col gap-2">
        <h1 className="text-[28px] font-bold leading-tight lg:text-[36px]">{t.title}</h1>
        <p className="text-[15px] text-muted">{summary ?? t.intro}</p>
      </div>
      {action}
    </header>
  );
}
