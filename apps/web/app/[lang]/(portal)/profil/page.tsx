import Image from 'next/image';
import Link from 'next/link';
import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { lang as rootLang } from 'next/root-params';
import { LevelPicker } from '@/components/onboarding/level-picker';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { format, isLocale, type Dictionary, type Locale } from '@/lib/i18n/locale';
import { getMe, listRecords } from '@/lib/profile/api';
import { higherChoicesFor, recordFormFor } from '@/lib/profile/records';
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
  let history: Awaited<ReturnType<typeof listRecords>>;
  try {
    [me, history] = await Promise.all([getMe(token), listRecords(token)]);
  } catch {
    return (
      <p role="alert" className="rounded-[18px] border border-line bg-white p-6 text-sm">
        {dict.academic.loadError}
      </p>
    );
  }
  // The record that matters most for this level: the qualification after SPM, else the level's own results form.
  const higher = me.educationLevel ? higherChoicesFor(me.educationLevel) : [];
  const form = me.educationLevel ? recordFormFor(me.educationLevel) : null;
  const record =
    history.find((r) => (higher as string[]).includes(r.qualification)) ??
    (form ? history.find((r) => r.qualification === form.qualification && r.kind === form.kind) : undefined);
  const summary = !record
    ? dict.academic.status.none
    : record.cgpa !== null || record.muetBand !== null
      ? `${dict.higher.qualifications[record.qualification as keyof typeof dict.higher.qualifications] ?? ''} · ${format(dict.academic.history.details, { cgpa: record.cgpa?.toFixed(2) ?? '–', muet: record.muetBand === null ? '–' : record.muetBand === 5.5 ? '5+' : record.muetBand.toFixed(1) })}`
      : `${dict.academic.status[record.status]} · ${format(t.subjectsCount, { count: record.subjects.length })}`;
  const levelTitle = me.educationLevel ? dict.onboarding.levels[me.educationLevel].title : t.levelNone;
  const formSuffix = me.formYear
    ? ` · ${format(dict.onboarding.levels.form1_3.short, { form: me.formYear })}`
    : me.educationLevel === 'after_preu' && me.higherQualification
      ? ` · ${dict.higher.qualifications[me.higherQualification]}`
      : '';

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
          {summary}
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
        <LevelPicker
          locale={lang}
          t={dict.onboarding}
          errors={dict.auth.errors}
          names={{ qualifications: dict.higher.qualifications, records: dict.academic.history.labels, noYear: dict.academic.history.noYear }}
          initial={{ level: me.educationLevel, formYear: me.formYear, higherQualification: me.higherQualification }}
          savedLabel={t.levelSaved}
          submitLabel={t.saveLevel}
        />
      </details>
    </div>
  );
}
