import Image from 'next/image';
import Link from 'next/link';
import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { lang as rootLang } from 'next/root-params';
import { LevelPicker } from '@/components/onboarding/level-picker';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { format, isLocale, type Dictionary, type Locale } from '@/lib/i18n/locale';
import { getCurrentRecord, getMe } from '@/lib/profile/api';
import { recordFormFor } from '@/lib/profile/records';
import { getAccessToken, getAccount } from '@/lib/supabase/server';

/** "Profil saya" (Figma: Profil & perjalanan saya): account, education level and a summary of saved results. */
export default async function ProfilePage() {
  const lang = await rootLang();
  if (!isLocale(lang)) notFound();
  const dict = await getDictionary(lang);
  const t = dict.profile;
  return (
    <>
      <header className="flex flex-col gap-3">
        <p className="text-xs font-semibold tracking-wide text-muted">{t.eyebrow}</p>
        <h1 className="text-[32px] font-bold leading-tight lg:text-[44px]">{t.title}</h1>
        <p className="text-[15px] text-muted">{t.intro}</p>
      </header>
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        {/* The account and saved results are request-time data. */}
        <Suspense fallback={<p className="text-sm text-muted">{dict.academic.loading}</p>}>
          <Profile lang={lang} dict={dict} />
        </Suspense>
        <aside className="hidden flex-col gap-3 rounded-[18px] bg-blue p-6 lg:flex">
          <Image src="/illustrations/rimau-compass.png" alt="" width={200} height={200} loading="eager" className="mx-auto size-[200px] object-contain" />
          <p className="text-lg font-semibold">{t.sideTitle}</p>
          <p className="text-sm text-muted">{t.sideBody}</p>
        </aside>
      </div>
    </>
  );
}

async function Profile({ lang, dict }: { lang: Locale; dict: Dictionary }) {
  const t = dict.profile;
  const [account, token] = await Promise.all([getAccount(), getAccessToken()]);
  if (!account || !token) notFound();

  let me: Awaited<ReturnType<typeof getMe>>;
  let record: Awaited<ReturnType<typeof getCurrentRecord>> = null;
  try {
    me = await getMe(token);
    if (me.educationLevel) {
      const form = recordFormFor(me.educationLevel);
      record = await getCurrentRecord(token, form.qualification, form.kind);
    }
  } catch {
    return (
      <p role="alert" className="rounded-[18px] border border-line bg-white p-6 text-sm">
        {dict.academic.loadError}
      </p>
    );
  }
  const levelTitle = me.educationLevel ? dict.onboarding.levels[me.educationLevel].title : t.levelNone;
  const formSuffix = me.formYear ? ` · ${format(dict.onboarding.levels.form1_3.short, { form: me.formYear })}` : '';

  return (
    <div className="flex flex-col gap-4">
      <section className="flex flex-col gap-1 rounded-[18px] bg-white p-5 sm:p-6">
        <p className="text-xs font-semibold text-muted">{t.account}</p>
        <p className="text-lg font-semibold">{account.name ?? account.email}</p>
        <p className="text-sm text-muted">{account.email}</p>
      </section>

      <section className="flex flex-col gap-3 rounded-[18px] bg-white p-5 sm:p-6">
        <p className="text-xs font-semibold text-muted">{t.academicTitle}</p>
        <p className="text-lg font-semibold">
          {levelTitle}
          {formSuffix}
        </p>
        <p className="text-sm text-muted">
          {record ? `${dict.academic.status[record.status]} · ${format(t.subjectsCount, { count: record.subjects.length })}` : dict.academic.status.none}
        </p>
        <Link href={`/${lang}/dokumen`} className="flex items-center justify-center gap-2 rounded-[10px] bg-navy px-5 py-3.5 font-semibold text-white hover:bg-navy/90 sm:self-start">
          {t.manageAcademic} →
        </Link>
      </section>

      <details className="group rounded-[18px] bg-white p-5 sm:p-6">
        <summary className="cursor-pointer list-none text-lg font-semibold marker:hidden">
          {t.changeLevel} <span className="text-muted group-open:hidden">+</span>
        </summary>
        <p className="mb-4 mt-1 text-sm text-muted">{t.changeLevelHint}</p>
        <LevelPicker locale={lang} t={dict.onboarding} errors={dict.auth.errors} initial={{ level: me.educationLevel, formYear: me.formYear }} savedLabel={t.levelSaved} submitLabel={t.saveLevel} />
      </details>
    </div>
  );
}
