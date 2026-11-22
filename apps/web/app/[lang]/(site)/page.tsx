import Image from 'next/image';
import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { AudienceTabs } from '@/components/site/audience-tabs';
import { FaqList } from '@/components/site/faq-list';
import { Highlights } from '@/components/site/highlights';
import { SheetCrop } from '@/components/site/sheet-crop';
import { Icon } from '@/components/ui/icon';
import { SITE_PAGES } from '@/lib/auth/routes';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { format, isLocale, type Dictionary, type Locale } from '@/lib/i18n/locale';
import { catalogueCoverage } from '@/lib/site/coverage';

export async function generateMetadata({ params }: PageProps<'/[lang]'>): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const dict = await getDictionary(lang);
  return { title: `EduLaunch · ${dict.site.hero.title}`, description: dict.meta.description };
}

const STEP_STYLE = [
  { bg: 'bg-cream', img: '/landing/rimau-thinking.png' },
  { bg: 'bg-blue', img: '/landing/rimau-comparing.png' },
  { bg: 'bg-mint', crop: true },
  { bg: 'bg-[#fde8e7]', img: '/landing/rimau-roadmap.png' },
] as const;
const CALENDAR_STYLE = ['bg-yellow', 'bg-blue', 'bg-mint', 'bg-[#fde8e7]'] as const;
// Fields shown on the landing page, with their picture on the worlds sheet.
const FIELD_CROP = [0, 1, 2] as const;

/** The public landing page (Figma P01 v2). Everything here is fixed content or cached catalogue figures: no AI, no uploads. */
export default async function Landing({ params }: PageProps<'/[lang]'>) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const dict = await getDictionary(lang);
  const t = dict.site;
  const signIn = `/${lang}/log-masuk`;

  return (
    <>
      <div aria-hidden className="h-1 bg-yellow" />
      <Hero t={t.hero} signIn={signIn} />
      <Suspense fallback={<div className="h-[240px]" />}>
        <Coverage t={t.coverage} />
      </Suspense>

      <Section tone="bg" title={t.audiences.title} intro={t.audiences.intro}>
        <AudienceTabs t={t.audiences} signInHref={signIn} />
      </Section>

      <Section id="cara-berfungsi" title={t.steps.title} intro={t.steps.intro}>
        <ol className="grid w-full grid-cols-[minmax(0,1fr)] gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {t.steps.items.map((s, i) => {
            const style = STEP_STYLE[i]!;
            return (
              <li key={s.title} className="flex items-center gap-4 rounded-[22px] bg-bg p-4 sm:flex-col sm:items-stretch sm:gap-3.5 sm:rounded-[28px] sm:px-6 sm:pb-7 sm:pt-6">
                <div aria-hidden className={`flex size-[88px] shrink-0 items-end justify-center overflow-hidden rounded-[18px] pt-1 sm:h-[200px] sm:w-auto sm:rounded-[22px] sm:pt-3 ${style.bg}`}>
                  {'crop' in style ? (
                    <>
                      <SheetCrop sheet="detective" col={1} row={0} size={84} className="sm:hidden" />
                      <SheetCrop sheet="detective" col={1} row={0} size={190} className="hidden sm:block" />
                    </>
                  ) : (
                    <Image src={style.img} alt="" width={190} height={190} className="size-[84px] object-contain sm:size-[190px]" />
                  )}
                </div>
                <div className="flex min-w-0 flex-col gap-1 sm:gap-3.5">
                  <p className="text-[13px] font-semibold text-[#2f5bd3]">{format(t.steps.label, { n: i + 1 })}</p>
                  <h3 className="text-[18px] font-bold sm:text-[22px]">{s.title}</h3>
                  <p className="text-[14px] text-muted sm:text-[15px]">{s.body}</p>
                </div>
              </li>
            );
          })}
        </ol>
      </Section>

      <Section title={t.calendar.title} intro={t.calendar.intro} tight>
        <ol className="grid w-full grid-cols-[minmax(0,1fr)] gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {t.calendar.items.map((c, i) => (
            <li key={c.title} className="flex flex-col gap-4">
              <div aria-hidden className="flex items-center gap-3">
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-navy text-[13px] font-semibold text-white">{i + 1}</span>
                <span className="h-0.5 flex-1 rounded-full bg-line" />
              </div>
              <div className={`flex flex-1 flex-col gap-2 rounded-[20px] p-5 ${CALENDAR_STYLE[i]}`}>
                <p className="text-[12px] font-medium text-navy/70">{c.kicker}</p>
                <h3 className="text-[20px] font-bold leading-snug">{c.title}</h3>
                <ul className="mt-1 flex flex-col gap-2">
                  {c.points.map((p) => (
                    <li key={p} className="flex gap-2 text-[14px] font-medium leading-snug">
                      <Icon src="/icons/check-navy.svg" size={14} className="mt-[3px] shrink-0" />
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
            </li>
          ))}
        </ol>
      </Section>

      <div className="bg-white px-4 pb-[72px] sm:px-6 lg:pb-28">
        <div className="mx-auto max-w-[1200px]">
          <Highlights t={t.highlights} />
        </div>
      </div>

      <Section tone="bg" title={t.fields.title} intro={t.fields.intro}>
        <ul className="grid w-full grid-cols-[minmax(0,1fr)] gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {t.fields.items.map((f, i) => (
            <li key={f.title} className="flex items-center gap-4 rounded-[20px] bg-white p-4 shadow-[0_2px_3px_rgba(20,38,71,0.06)] sm:flex-col sm:items-stretch sm:gap-3.5 sm:rounded-[24px] sm:px-5 sm:pb-6 sm:pt-5">
              <div className="flex size-[88px] shrink-0 items-center justify-center rounded-[14px] bg-bg sm:h-[190px] sm:w-auto sm:rounded-[16px]">
                <SheetCrop sheet="worlds" col={FIELD_CROP[i]!} row={0} size={80} className="sm:hidden" />
                <SheetCrop sheet="worlds" col={FIELD_CROP[i]!} row={0} size={170} className="hidden sm:block" />
              </div>
              <div className="flex min-w-0 flex-1 flex-col gap-1 sm:gap-3.5">
                <h3 className="text-[18px] font-semibold sm:text-[20px]">{f.title}</h3>
                <p className="text-[14px] text-muted">{f.body}</p>
                <Link href={`${signIn}?next=${encodeURIComponent(`/${lang}/teroka`)}`} className="inline-flex items-center gap-1.5 text-[14px] font-semibold text-[#2f5bd3] hover:underline sm:mt-auto">
                  {t.fields.link}
                  <span aria-hidden>→</span>
                </Link>
              </div>
            </li>
          ))}
          <li className="flex flex-col items-start gap-4 rounded-[24px] bg-navy p-7">
            <SheetCrop sheet="worlds" col={0} row={1} size={150} />
            <h3 className="text-[22px] font-bold text-white">{t.fields.more.title}</h3>
            <p className="text-[15px] text-[#c9d3e3]">{t.fields.more.body}</p>
            <YellowButton href={`${signIn}?next=${encodeURIComponent(`/${lang}/teroka`)}`}>{t.fields.more.cta}</YellowButton>
          </li>
        </ul>
      </Section>

      <Account t={t.account} />
      <OurPromise t={t.promise} />

      <section className="bg-white px-4 py-[72px] sm:px-6 lg:py-28">
        <div className="mx-auto grid max-w-[1200px] grid-cols-[minmax(0,1fr)] gap-10 lg:grid-cols-[380px_minmax(0,1fr)] lg:gap-16">
          <div className="flex flex-col items-start gap-3">
            <h2 className="text-[36px] font-bold leading-[1.1] tracking-[-0.02em] lg:text-[44px]">{t.faq.title}</h2>
            <p className="text-[17px] text-muted">
              {t.faq.intro}{' '}
              <Link href={`/${lang}/${SITE_PAGES.contact}`} className="font-semibold text-[#2f5bd3] hover:underline">
                {t.faq.contact}
              </Link>
            </p>
            <Image src="/landing/rimau-reading.png" alt="" width={260} height={260} className="hidden size-[260px] object-contain lg:block" />
          </div>
          <div className="flex flex-col gap-5">
            <FaqList items={t.faq.items} />
            <Link href={`/${lang}/${SITE_PAGES.guide}`} className="self-start text-[15px] font-semibold text-[#2f5bd3] hover:underline">
              {t.faq.more} →
            </Link>
          </div>
        </div>
      </section>

      <Closing t={t.cta} lang={lang} />
    </>
  );
}

function Section({ id, tone = 'white', title, intro, tight, children }: { id?: string; tone?: 'white' | 'bg'; title: string; intro: string; tight?: boolean; children: React.ReactNode }) {
  return (
    <section id={id} className={`scroll-mt-24 px-4 sm:px-6 ${tight ? 'pb-[72px] pt-4 lg:pb-28' : 'py-[72px] lg:py-28'} ${tone === 'bg' ? 'bg-bg' : 'bg-white'}`}>
      <div className="mx-auto flex max-w-[1200px] flex-col items-center gap-10 lg:gap-14">
        <div className="flex max-w-[720px] flex-col items-center gap-4 text-center">
          <h2 className="text-[34px] font-bold leading-[1.1] tracking-[-0.025em] lg:text-[48px]">{title}</h2>
          <p className="text-[17px] text-muted lg:text-[19px]">{intro}</p>
        </div>
        {children}
      </div>
    </section>
  );
}

function YellowButton({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="inline-flex items-center gap-2 whitespace-nowrap rounded-full bg-yellow px-6 py-3.5 text-base font-semibold text-navy hover:bg-yellow/90">
      {children}
      <Icon src="/icons/arrow-right.svg" size={18} />
    </Link>
  );
}

function Hero({ t, signIn }: { t: Dictionary['site']['hero']; signIn: string }) {
  return (
    <section className="overflow-hidden bg-navy px-4 pb-16 pt-12 sm:px-6 lg:pb-24 lg:pt-20">
      <div className="mx-auto grid max-w-[1200px] grid-cols-[minmax(0,1fr)] items-center gap-10 lg:grid-cols-[minmax(0,1fr)_560px]">
        <div className="flex flex-col items-start gap-7">
          <p className="flex max-w-full items-center gap-2 rounded-full bg-white/[0.08] py-1.5 pl-1.5 pr-4">
            <span className="shrink-0 rounded-full bg-yellow px-2.5 py-0.5 text-[12px] font-bold text-navy">{t.badge}</span>
            <span className="text-[14px] font-medium text-white">{t.badgeText}</span>
          </p>
          <h1 className="text-[44px] font-bold leading-[1.02] tracking-[-0.03em] text-white sm:text-[56px] lg:text-[72px]">{t.title}</h1>
          <p className="max-w-[560px] text-[18px] text-[#c9d3e3] lg:text-[20px]">{t.body}</p>
          <div className="flex flex-wrap gap-3.5">
            <YellowButton href={signIn}>{t.primary}</YellowButton>
            <a href="#cara-berfungsi" className="inline-flex items-center gap-2 rounded-full border-[1.5px] border-navy bg-white px-6 py-3.5 text-base font-semibold text-navy hover:bg-white/90">
              {t.secondary}
              <Icon src="/icons/arrow-right.svg" size={18} />
            </a>
          </div>
          <ul className="flex flex-wrap gap-x-6 gap-y-2.5 pt-3">
            {t.trust.map((x) => (
              <li key={x} className="flex items-center gap-2 text-[14px] font-medium text-[#c9d3e3]">
                <Icon src="/icons/check-yellow.svg" size={18} />
                {x}
              </li>
            ))}
          </ul>
        </div>
        <HeroVisual t={t} />
      </div>
    </section>
  );
}

/** The hero picture: Rimau waving on a ring, with three sample cards from the portal (labelled as an example). */
function HeroVisual({ t }: { t: Dictionary['site']['hero'] }) {
  const s = t.sample;
  const card = 'absolute flex flex-col gap-2 rounded-[18px] bg-white px-4 py-3.5 shadow-[0_20px_40px_rgba(5,15,36,0.3)]';
  return (
    <figure className="relative mx-auto h-[350px] w-[350px] sm:h-[460px] sm:w-[460px] lg:h-[560px] lg:w-[560px]">
      <figcaption className="sr-only">{t.sampleLabel}</figcaption>
      <div aria-hidden className="absolute left-0 top-0 size-[560px] origin-top-left scale-[0.625] sm:scale-[0.82] lg:scale-100">
        <div className="absolute left-[60px] top-[60px] size-[460px] rounded-full bg-[#1f3a66]" />
        <Image src="/landing/hero-ring.png" alt="" width={520} height={520} priority className="absolute left-[30px] top-[30px] size-[520px]" />
        <Image src="/illustrations/rimau-waving.png" alt="" width={430} height={430} priority className="absolute left-[70px] top-[80px] size-[430px] object-contain" />
        <div className={`${card} left-0 top-[90px] lg:left-[-40px]`}>
          <p className="text-[13px] font-semibold text-navy">{s.programme}</p>
          <div className="flex items-center gap-1.5">
            <Pill tone="mint">{s.eligible}</Pill>
            <span className="text-[12px] text-muted">{s.groups}</span>
          </div>
        </div>
        <div className={`${card} left-[400px] top-[40px]`}>
          <p className="text-[12px] font-medium text-muted">{s.merit}</p>
          <p className="text-[30px] font-bold leading-tight text-navy">86.40</p>
          <Pill tone="cream">{s.estimate}</Pill>
        </div>
        <div className={`${card} left-[300px] top-[410px] lg:left-[380px]`}>
          <p className="text-[12px] font-medium text-muted">{s.roadmap}</p>
          <div className="flex items-center gap-2 text-[13px] font-medium text-muted">
            <Pill tone="mint">{s.spm}</Pill>→<Pill tone="blue">{s.foundation}</Pill>→<Pill tone="blue">{s.degree}</Pill>
          </div>
        </div>
      </div>
    </figure>
  );
}

function Pill({ tone, children }: { tone: 'mint' | 'cream' | 'blue'; children: React.ReactNode }) {
  const style = { mint: 'bg-mint text-[#187a60]', cream: 'bg-cream text-[#6b4f00]', blue: 'bg-blue text-navy' }[tone];
  return (
    <span className={`inline-flex items-center gap-1.5 self-start rounded-full px-2.5 py-1 text-[12px] font-semibold ${style}`}>
      <span className="size-1.5 rounded-full bg-current" />
      {children}
    </span>
  );
}

async function Coverage({ t }: { t: Dictionary['site']['coverage'] }) {
  const data = await catalogueCoverage();
  if (!data || data.institutions.length === 0) return null;
  return (
    <section className="bg-bg px-4 py-14 sm:px-6 lg:py-16">
      <div className="mx-auto flex max-w-[1200px] flex-col items-center gap-6 text-center">
        <h2 className="text-[20px] font-semibold lg:text-[22px]">{t.title}</h2>
        <ul className="flex flex-wrap justify-center gap-3">
          {data.institutions.map((i) => (
            <li key={i.id} className="flex items-center gap-3 rounded-full bg-white py-2 pl-2 pr-5 shadow-[0_2px_3px_rgba(20,38,71,0.06)]">
              <span aria-hidden className="grid size-9 place-items-center rounded-full bg-bg">
                <Icon src="/icons/building.svg" size={16} />
              </span>
              <span className="flex flex-col text-left leading-tight">
                <span className="text-[15px] font-semibold">{i.short ?? i.name}</span>
                {i.short && i.short !== i.name && <span className="text-[12px] text-muted">{i.name}</span>}
              </span>
            </li>
          ))}
        </ul>
        <p className="text-[15px] font-medium">{format(t.count, { count: data.programmes })}</p>
        <p className="max-w-[640px] text-[12px] text-muted">{t.note}</p>
      </div>
    </section>
  );
}

function Account({ t }: { t: Dictionary['site']['account'] }) {
  return (
    <section className="bg-white px-4 py-[72px] sm:px-6 lg:py-28">
      <div className="mx-auto grid max-w-[1200px] grid-cols-[minmax(0,1fr)] items-center gap-12 lg:grid-cols-[minmax(0,1fr)_560px] lg:gap-16">
        <div className="flex flex-col gap-6">
          <h2 className="text-[34px] font-bold leading-[1.1] tracking-[-0.025em] lg:text-[48px]">{t.title}</h2>
          <p className="text-[17px] text-muted lg:text-[19px]">{t.intro}</p>
          <ul className="flex flex-col gap-6">
            {t.points.map((p) => (
              <li key={p.title} className="flex gap-4">
                <span aria-hidden className="grid size-8 shrink-0 place-items-center rounded-[10px] bg-yellow">
                  <Icon src="/icons/check-navy.svg" size={16} />
                </span>
                <span className="flex flex-col gap-0.5">
                  <span className="text-[18px] font-semibold">{p.title}</span>
                  <span className="text-[15px] text-muted">{p.body}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
        <div aria-hidden className="relative mx-auto h-[400px] w-full max-w-[560px] overflow-hidden rounded-[36px] bg-blue sm:h-[520px]">
          <div className="absolute left-4 top-10 flex w-[min(380px,calc(100%-32px))] flex-col gap-2.5 rounded-[16px] border-8 border-navy bg-white px-[18px] py-4 sm:left-10 sm:top-[60px]">
            <p className="flex items-center gap-2 text-[13px] font-semibold">
              <Icon src="/brand/logo.svg" size={20} />
              {t.laptop.title}
            </p>
            {t.laptop.rows.map((r, i) => (
              <p key={r} className={`rounded-[8px] px-2.5 py-[7px] text-[12px] font-medium ${i === 0 ? 'bg-mint' : 'bg-bg'}`}>
                {r}
              </p>
            ))}
          </div>
          <div className="absolute left-0 top-[230px] h-3.5 w-[440px] rounded-[7px] bg-navy sm:left-2.5 sm:top-[300px]" />
          <div className="absolute right-4 top-[120px] flex h-[260px] w-[150px] flex-col gap-2 rounded-[28px] border-[7px] border-navy bg-white px-3 pb-3 pt-5 shadow-[0_20px_40px_rgba(5,15,36,0.25)] sm:left-[340px] sm:right-auto sm:top-[150px] sm:h-[330px] sm:w-[170px]">
            <p className="text-[12px] font-semibold">{t.phone.title}</p>
            {t.phone.rows.map((r, i) => (
              <p key={r} className={`rounded-[6px] px-2 py-1.5 text-[11px] font-medium ${i === 0 ? 'bg-mint' : 'bg-bg'}`}>
                {r}
              </p>
            ))}
            <span className="mt-auto self-center rounded-full bg-cream px-2.5 py-1 text-[11px] font-semibold text-[#6b4f00]">{t.phone.soon}</span>
          </div>
          <Image src="/landing/rimau-devices.png" alt="" width={250} height={250} className="absolute bottom-0 left-4 size-[200px] object-contain sm:left-[60px] sm:top-[280px] sm:size-[250px]" />
        </div>
      </div>
    </section>
  );
}

function OurPromise({ t }: { t: Dictionary['site']['promise'] }) {
  return (
    <section className="bg-navy px-4 py-[72px] sm:px-6 lg:py-24">
      <div className="mx-auto grid max-w-[1200px] grid-cols-[minmax(0,1fr)] items-center gap-10 lg:grid-cols-[320px_minmax(0,1fr)] lg:gap-16">
        <div aria-hidden className="mx-auto grid size-[240px] place-items-center rounded-full bg-blue lg:size-[320px]">
          <Image src="/illustrations/rimau-shield.png" alt="" width={320} height={320} className="size-[220px] object-contain lg:size-[300px]" />
        </div>
        <div className="flex flex-col gap-8">
          <h2 className="text-[32px] font-bold leading-[1.1] tracking-[-0.02em] text-white lg:text-[44px]">{t.title}</h2>
          <ul className="grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-3">
            {t.items.map((x) => (
              <li key={x.title} className="flex flex-col gap-2 rounded-[18px] bg-white/[0.08] p-5">
                <h3 className="text-[17px] font-semibold text-yellow">{x.title}</h3>
                <p className="text-[14px] text-[#c9d3e3]">{x.body}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

function Closing({ t, lang }: { t: Dictionary['site']['cta']; lang: Locale }) {
  return (
    <section className="bg-white px-4 pb-[72px] sm:px-6 lg:pb-28">
      <div className="relative mx-auto flex max-w-[1200px] flex-col items-start gap-5 overflow-hidden rounded-[36px] bg-yellow px-6 py-12 sm:px-14 lg:min-h-[312px] lg:justify-center lg:pr-[360px]">
        <h2 className="text-[32px] font-bold leading-[1.1] tracking-[-0.02em] lg:text-[44px]">{t.title}</h2>
        <p className="text-[17px]">{t.body}</p>
        <div className="flex flex-wrap gap-3">
          <Link href={`/${lang}/daftar`} className="inline-flex items-center gap-2 rounded-full bg-navy px-6 py-3.5 text-base font-semibold text-white hover:bg-navy/90">
            {t.signUp}
            <Icon src="/icons/arrow-right-white.svg" size={18} />
          </Link>
          <Link href={`/${lang}/log-masuk`} className="inline-flex items-center gap-2 rounded-full border-[1.5px] border-navy bg-white px-6 py-3.5 text-base font-semibold text-navy hover:bg-white/90">
            {t.signIn}
            <Icon src="/icons/arrow-right.svg" size={18} />
          </Link>
        </div>
        <Image src="/illustrations/rimau-waving.png" alt="" width={300} height={300} className="pointer-events-none absolute bottom-0 right-10 hidden size-[300px] object-contain lg:block" />
      </div>
    </section>
  );
}
