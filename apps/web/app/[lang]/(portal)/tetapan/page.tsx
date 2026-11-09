import Link from 'next/link';
import { Suspense, type ReactNode } from 'react';
import { notFound } from 'next/navigation';
import { lang as rootLang } from 'next/root-params';
import { AvatarField } from '@/components/settings/avatar-field';
import { DeleteAccountForm, EmailForm, NotificationsForm, ParentConsentForm, PasswordForm, ProfileForm, SignOutOthers } from '@/components/settings/forms';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { format, isLocale, type Dictionary, type Locale } from '@/lib/i18n/locale';
import { getDetails, getNotificationPrefs } from '@/lib/profile/api';
import { getAccessToken, getAccount } from '@/lib/supabase/server';

/** The settings areas, each its own view with its own address (?bahagian=…), as settings pages usually are. */
const SETTINGS_SECTIONS = ['profil', 'log-masuk', 'notifikasi', 'privasi'] as const;
type Section = (typeof SETTINGS_SECTIONS)[number];

/**
 * Settings (separate from "Profil saya", which shows what the profile holds): a menu of areas on the left (a row of
 * tabs on a phone), and the chosen area on the right as panels that each save on their own.
 */
export default async function SettingsPage({ searchParams }: PageProps<'/[lang]/tetapan'>) {
  const lang = await rootLang();
  if (!isLocale(lang)) notFound();
  const dict = await getDictionary(lang);
  const t = dict.settings;
  return (
    <>
      <header className="flex flex-col gap-2">
        <h1 className="text-[28px] font-bold leading-tight lg:text-[32px]">{t.title}</h1>
        <p className="text-[15px] text-muted">{t.intro}</p>
      </header>
      {/* The section and the account are request-time data. */}
      <Suspense fallback={<p className="text-sm text-muted">{dict.academic.loading}</p>}>
        <Settings lang={lang} dict={dict} searchParams={searchParams} />
      </Suspense>
    </>
  );
}

/** Whole years since a date of birth (YYYY-MM-DD). */
function ageOf(dateOfBirth: string): number {
  const born = new Date(`${dateOfBirth}T00:00:00`);
  const now = new Date();
  let age = now.getFullYear() - born.getFullYear();
  if (now.getMonth() < born.getMonth() || (now.getMonth() === born.getMonth() && now.getDate() < born.getDate())) age -= 1;
  return age;
}

/** One panel: its title and what it does, then its content. */
function Panel({ title, description, children, tone = 'default' }: { title: string; description?: string; children: ReactNode; tone?: 'default' | 'danger' }) {
  return (
    <section className={`flex flex-col gap-4 rounded-[18px] bg-white p-5 sm:p-6 ${tone === 'danger' ? 'ring-1 ring-[#f3c2bd]' : ''}`}>
      <div className="flex flex-col gap-1">
        <h3 className={`text-[17px] font-semibold ${tone === 'danger' ? 'text-[#b33a35]' : ''}`}>{title}</h3>
        {description && <p className="text-sm text-muted">{description}</p>}
      </div>
      {children}
    </section>
  );
}

async function Settings({ lang, dict, searchParams }: { lang: Locale; dict: Dictionary; searchParams: PageProps<'/[lang]/tetapan'>['searchParams'] }) {
  const t = dict.settings;
  const sp = await searchParams;
  const section: Section = SETTINGS_SECTIONS.find((s) => s === sp.bahagian) ?? 'profil';
  const [account, token] = await Promise.all([getAccount(), getAccessToken()]);
  if (!account || !token) notFound();
  const details = await getDetails(token).catch(() => ({ schoolName: null, dateOfBirth: null, parentConsentAt: null }));
  const name = account.name ?? account.email;
  const href = (s: Section) => `/${lang}/tetapan${s === 'profil' ? '' : `?bahagian=${s}`}`;

  return (
    <div className="grid items-start gap-6 md:grid-cols-[220px_minmax(0,1fr)]">
      <nav aria-label={t.title} className="-mx-4 overflow-x-auto px-4 md:sticky md:top-6 md:mx-0 md:px-0">
        <ul className="flex gap-2 md:flex-col md:gap-1">
          {SETTINGS_SECTIONS.map((s) => (
            <li key={s} className="flex-none">
              <Link
                href={href(s)}
                aria-current={s === section ? 'page' : undefined}
                className={`flex flex-col rounded-[12px] px-4 py-2.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy/40 ${
                  s === section ? 'bg-white font-semibold shadow-[inset_3px_0_0_#1b2a4a]' : 'text-muted hover:bg-white/60 hover:text-navy'
                }`}
              >
                <span className="text-[15px]">{t.sections[s].title}</span>
                <span className="hidden text-[12px] font-normal text-muted md:block">{t.sections[s].hint}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <div className="flex min-w-0 flex-col gap-4">
        <h2 className="sr-only">{t.sections[section].title}</h2>
        {section === 'profil' && (
          <>
            <Panel title={t.profile.avatar} description={t.profile.avatarHint}>
              <AvatarField userId={account.id} name={name} url={account.avatarUrl} t={t.avatar} errors={dict.auth.errors} />
            </Panel>
            <Panel title={t.profile.title} description={t.profile.hint}>
              <ProfileForm locale={lang} values={{ fullName: account.name ?? '', schoolName: details.schoolName ?? '', dateOfBirth: details.dateOfBirth ?? '' }} t={t} errors={dict.auth.errors} />
            </Panel>
            <Panel title={t.profile.language} description={t.profile.languageHint}>
              <div className="flex gap-2">
                {(['ms', 'en'] as const).map((l) => (
                  <Link
                    key={l}
                    href={`/${l}/tetapan`}
                    aria-current={l === lang ? 'true' : undefined}
                    className={`h-11 rounded-[12px] px-5 text-sm font-semibold leading-[44px] transition-colors ${l === lang ? 'bg-navy text-white' : 'border border-line bg-white hover:bg-bg'}`}
                  >
                    {dict.language[l]}
                  </Link>
                ))}
              </div>
            </Panel>
          </>
        )}
        {section === 'log-masuk' && (
          <>
            <Panel title={t.security.emailTitle} description={t.security.emailHint}>
              <EmailForm locale={lang} email={account.email} t={t} errors={dict.auth.errors} />
            </Panel>
            <Panel title={t.security.passwordTitle} description={t.security.passwordTitleHint}>
              <PasswordForm locale={lang} t={t} errors={dict.auth.errors} />
            </Panel>
            <Panel title={t.security.devicesTitle} description={t.security.devicesHint}>
              <SignOutOthers t={t} errors={dict.auth.errors} />
            </Panel>
          </>
        )}
        {section === 'notifikasi' && (
          <Panel title={t.notifications.title} description={t.notifications.hint}>
            <NotificationsForm locale={lang} requirementChanges={(await getNotificationPrefs(token).catch(() => null))?.requirementChanges ?? true} t={t} errors={dict.auth.errors} />
          </Panel>
        )}
        {section === 'privasi' && (
          <>
            <Panel title={t.privacy.dataTitle} description={t.privacy.dataHint}>
              <a href={`/${lang}/tetapan/data`} download className="inline-flex h-11 items-center self-start rounded-[12px] bg-navy px-5 text-sm font-semibold text-white transition-colors hover:bg-navy/90">
                {t.privacy.download}
              </a>
            </Panel>
            <Panel title={t.privacy.consentTitle} description={t.privacy.consentHint}>
              {details.parentConsentAt ? (
                <p className="text-sm font-medium text-[#1f6b47]">{format(t.privacy.consentGiven, { date: details.parentConsentAt.toLocaleDateString(lang === 'ms' ? 'ms-MY' : 'en-MY', { day: 'numeric', month: 'long', year: 'numeric' }) })}</p>
              ) : !details.dateOfBirth ? (
                <p className="text-sm text-muted">{t.privacy.consentNoDob}</p>
              ) : ageOf(details.dateOfBirth) >= 18 ? (
                <p className="text-sm text-muted">{t.privacy.consentNotNeeded}</p>
              ) : (
                <ParentConsentForm locale={lang} t={t} errors={dict.auth.errors} />
              )}
            </Panel>
            <Panel title={t.privacy.deleteTitle} description={t.privacy.deleteHint} tone="danger">
              <DeleteAccountForm locale={lang} t={t} errors={dict.auth.errors} />
            </Panel>
          </>
        )}
      </div>
    </div>
  );
}
