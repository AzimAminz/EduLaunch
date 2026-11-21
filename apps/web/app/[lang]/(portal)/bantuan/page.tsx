import { notFound } from 'next/navigation';
import { lang as rootLang } from 'next/root-params';
import { QuestionForm } from '@/components/support/question-form';
import { Pending } from '@/components/ui/pending';
import { getProgramme } from '@/lib/catalogue/api';
import { myTickets, type Ticket } from '@/lib/engagement/api';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { isLocale, type Dictionary, type Locale } from '@/lib/i18n/locale';
import { listSavedProgrammes } from '@/lib/profile/api';
import { getAccessToken } from '@/lib/supabase/server';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const STATUS_STYLE: Record<Ticket['status'], string> = { open: 'bg-bg text-muted', in_progress: 'bg-cream text-[#7a4f06]', closed: 'bg-mint text-[#145c3b]' };

/**
 * "Bantuan": short answers to common questions, a way to ask the EduLaunch team (or report wrong programme data,
 * from a programme page with ?program=), and the student's questions with the answers they got.
 */
export default async function HelpPage({ searchParams }: PageProps<'/[lang]/bantuan'>) {
  const lang = await rootLang();
  if (!isLocale(lang)) notFound();
  const dict = await getDictionary(lang);
  const t = dict.help;
  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-[28px] font-bold leading-tight lg:text-[36px]">{t.title}</h1>
        <p className="text-[15px] text-muted">{t.intro}</p>
      </header>

      <section aria-labelledby="faq-title" className="flex flex-col gap-3">
        <h2 id="faq-title" className="text-[20px] font-bold">
          {t.faqTitle}
        </h2>
        <div className="flex flex-col divide-y divide-line rounded-[18px] bg-white">
          {t.faq.map((item) => (
            <details key={item.q} className="group px-5 py-4">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-semibold [&::-webkit-details-marker]:hidden">
                {item.q}
                <span aria-hidden className="shrink-0 text-muted transition-transform group-open:rotate-45">
                  +
                </span>
              </summary>
              <p className="pt-2 text-sm text-muted">{item.a}</p>
            </details>
          ))}
        </div>
      </section>

      <Pending label={t.loading} variant="form">
        <Ask lang={lang} dict={dict} searchParams={searchParams} />
      </Pending>
    </div>
  );
}

async function Ask({ lang, dict, searchParams }: { lang: Locale; dict: Dictionary; searchParams: PageProps<'/[lang]/bantuan'>['searchParams'] }) {
  const t = dict.help;
  const [sp, token] = await Promise.all([searchParams, getAccessToken()]);
  if (!token) notFound();
  const [tickets, saved] = await Promise.all([myTickets(token).catch(() => null), listSavedProgrammes(token).catch(() => [])]);
  const asked = typeof sp.program === 'string' && UUID.test(sp.program) ? sp.program : null;
  // Programmes to report on: the one the student came from, then their saved ones; names for their questions too.
  const ids = [...new Set([...(asked ? [asked] : []), ...saved.map((s) => s.programId), ...(tickets ?? []).flatMap((x) => (x.programId ? [x.programId] : []))])];
  const named = (await Promise.all(ids.map((id) => getProgramme(id).then((p) => ({ id, name: p.name })).catch(() => null)))).filter((p): p is { id: string; name: string } => p !== null);
  const names = new Map(named.map((p) => [p.id, p.name]));
  const programmes = named.filter((p) => p.id === asked || saved.some((s) => s.programId === p.id));
  const when = (d: Date | null | undefined) => (d ? d.toLocaleDateString(lang === 'ms' ? 'ms-MY' : 'en-MY', { day: 'numeric', month: 'short', year: 'numeric' }) : null);

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-start">
      <section id="tanya" aria-labelledby="ask-title" className="flex flex-col gap-4 rounded-[18px] bg-white p-5 sm:p-6">
        <div className="flex flex-col gap-1">
          <h2 id="ask-title" className="text-[20px] font-bold">
            {t.askTitle}
          </h2>
          <p className="text-sm text-muted">{t.askIntro}</p>
        </div>
        <QuestionForm locale={lang} programmes={programmes} initial={{ category: asked || sp.kategori === 'data' ? 'wrong_data' : 'other', programId: asked }} t={t.form} />
      </section>

      <section aria-labelledby="mine-title" className="flex flex-col gap-3">
        <h2 id="mine-title" className="text-[20px] font-bold">
          {t.mineTitle}
        </h2>
        {tickets === null ? (
          <p className="rounded-[18px] bg-white p-5 text-sm text-muted">{t.mineUnavailable}</p>
        ) : tickets.length === 0 ? (
          <p className="rounded-[18px] bg-white p-5 text-sm text-muted">{t.mineEmpty}</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {tickets.map((x) => (
              <li key={x.id} className="flex flex-col gap-2 rounded-[18px] bg-white p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-full px-2.5 py-1 text-[12px] font-semibold ${STATUS_STYLE[x.status]}`}>{t.status[x.status]}</span>
                  <span className="text-[12px] text-muted">{[t.form.categories[x.category], when(x.createdAt)].filter(Boolean).join(' · ')}</span>
                </div>
                {x.programId && names.has(x.programId) && <p className="text-sm font-semibold">{names.get(x.programId)}</p>}
                <p className="whitespace-pre-line text-sm">{x.message}</p>
                {x.adminReply && (
                  <div className="flex flex-col gap-1 rounded-[12px] bg-blue px-4 py-3">
                    <p className="text-[12px] font-semibold text-[#2f5bd3]">{[t.reply, when(x.closedAt)].filter(Boolean).join(' · ')}</p>
                    <p className="whitespace-pre-line text-sm">{x.adminReply}</p>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
