import Link from 'next/link';
import { Suspense, type ReactNode } from 'react';
import { notFound } from 'next/navigation';
import { lang as rootLang } from 'next/root-params';
import { LevelPicker } from '@/components/onboarding/level-picker';
import { LevelSection } from '@/components/profile/level-section';
import { Avatar } from '@/components/settings/avatar-field';
import { getReferenceData, localName } from '@/lib/catalogue/api';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { format, isLocale, type Dictionary, type Locale } from '@/lib/i18n/locale';
import { loadMeritInputs, studentMerit } from '@/lib/merit/student';
import { getMe, listRecords, type AcademicRecord } from '@/lib/profile/api';
import { higherChoicesFor, historyKind, recordFormFor } from '@/lib/profile/records';
import { getAccessToken, getAccount } from '@/lib/supabase/server';

/**
 * "Profil saya", laid out like a settings page: one section per thing the profile holds (account, education level,
 * academic results, merit, older records), each with its name and what it is for on the left and its content on
 * the right. A banner on top names the one thing still missing, only when something is.
 */
export default async function ProfilePage() {
  const lang = await rootLang();
  if (!isLocale(lang)) notFound();
  const dict = await getDictionary(lang);
  const t = dict.profile;
  return (
    <>
      <header className="flex flex-col gap-2">
        <p className="text-xs font-semibold tracking-wide text-muted">{t.eyebrow}</p>
        <h1 className="text-[28px] font-bold leading-tight lg:text-[32px]">{t.title}</h1>
        <p className="text-[15px] text-muted">{t.intro}</p>
      </header>
      {/* The account and saved results are request-time data. */}
      <Suspense fallback={<p className="text-sm text-muted">{dict.academic.loading}</p>}>
        <Profile lang={lang} dict={dict} />
      </Suspense>
    </>
  );
}

/** One section: its name and purpose on the left (above on a phone), its content in a white panel on the right. */
function Row({ id, title, description, children }: { id?: string; title: string; description: ReactNode; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={id ? `${id}-title` : undefined} className="grid gap-3 border-t border-line pt-6 first:border-0 first:pt-0 md:grid-cols-[240px_minmax(0,1fr)] md:gap-8">
      <div className="flex flex-col gap-1">
        <h2 id={id ? `${id}-title` : undefined} className="text-[17px] font-semibold">
          {title}
        </h2>
        <div className="text-sm text-muted">{description}</div>
      </div>
      <div className="rounded-[18px] bg-white p-5 sm:p-6">{children}</div>
    </section>
  );
}

const button = 'inline-flex h-11 items-center justify-center rounded-[12px] px-5 text-sm font-semibold transition-colors';

async function Profile({ lang, dict }: { lang: Locale; dict: Dictionary }) {
  const t = dict.profile;
  const [account, token] = await Promise.all([getAccount(), getAccessToken()]);
  if (!account || !token) notFound();

  let me: Awaited<ReturnType<typeof getMe>>;
  let history: AcademicRecord[];
  let reference: Awaited<ReturnType<typeof getReferenceData>>;
  try {
    [me, history, reference] = await Promise.all([getMe(token), listRecords(token), getReferenceData()]);
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
    history.find((r) => (higher as string[]).includes(r.qualification)) ?? (form ? history.find((r) => r.qualification === form.qualification && r.kind === form.kind) : undefined);
  const others = history.filter((r) => r.id !== record?.id).slice(0, 5);
  // The level in one phrase: "Tingkatan 3", "Lepasan SPM", "Lepasan pra-U / Diploma · STPM".
  const level = !me.educationLevel
    ? t.levelNone
    : me.formYear
      ? format(dict.onboarding.levels.form1_3.short, { form: me.formYear })
      : me.higherQualification
        ? `${dict.onboarding.levels[me.educationLevel].title} · ${dict.higher.qualifications[me.higherQualification]}`
        : dict.onboarding.levels[me.educationLevel].title;
  const name = account.name ?? account.email;
  const label = (r: AcademicRecord) => format(dict.academic.history.labels[historyKind(r)], { year: r.examYear ?? dict.academic.history.noYear }).trim();
  const subjectName = new Map(reference.subjects.map((s) => [s.id, localName(s, lang)]));
  // Only when something is missing: the one step that unlocks the rest.
  const missing = !me.educationLevel
    ? { text: t.next.levelBody, title: t.next.level, href: '#tahap', action: t.next.levelAction }
    : !record
      ? { text: t.next.resultsBody, title: t.next.results, href: `/${lang}/dokumen`, action: t.next.resultsAction }
      : null;

  return (
    <div className="flex flex-col gap-6">
      {missing && (
        <div role="status" className="flex flex-col gap-3 rounded-[18px] bg-cream p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-0.5">
            <p className="font-semibold">{missing.title}</p>
            <p className="text-sm text-muted">{missing.text}</p>
          </div>
          <Link href={missing.href} className={`${button} shrink-0 self-start bg-navy text-white hover:bg-navy/90 sm:self-center`}>
            {missing.action} →
          </Link>
        </div>
      )}

      <Row title={t.account} description={t.accountHint}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-4">
            <Avatar url={account.avatarUrl} name={name} size={48} />
            <div className="flex min-w-0 flex-col">
              <p className="break-words font-semibold">{name}</p>
              <p className="truncate text-sm text-muted">{account.email}</p>
            </div>
          </div>
          <Link href={`/${lang}/tetapan`} className="inline-flex h-10 items-center rounded-[10px] border border-line bg-white px-4 text-sm font-semibold transition-colors hover:bg-bg">
            {t.editAccount}
          </Link>
        </div>
      </Row>

      <Row id="tahap" title={t.levelTitle} description={t.levelHint}>
        <LevelSection level={level} hint={t.changeLevelHint} changeLabel={t.changeLevel} cancelLabel={t.cancel} startOpen={!me.educationLevel}>
          <LevelPicker
            locale={lang}
            t={dict.onboarding}
            errors={dict.auth.errors}
            names={{ qualifications: dict.higher.qualifications, records: dict.academic.history.labels, noYear: dict.academic.history.noYear }}
            initial={{ level: me.educationLevel, formYear: me.formYear, higherQualification: me.higherQualification }}
            savedLabel={t.levelSaved}
            submitLabel={t.saveLevel}
          />
        </LevelSection>
      </Row>

      <Row id="keputusan" title={t.academicTitle} description={t.academicHint}>
        {record ? (
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-semibold">{label(record)}</p>
              <span className={`rounded-full px-3 py-1 text-[13px] font-semibold ${record.status === 'confirmed' ? 'bg-mint text-[#1f6b47]' : 'bg-cream text-[#8a6100]'}`}>
                {dict.academic.status[record.status]}
              </span>
            </div>
            {(record.cgpa !== null || record.muetBand !== null) && (
              <dl className="grid grid-cols-2 gap-3">
                {record.cgpa !== null && (
                  <div className="rounded-[14px] bg-bg px-4 py-3">
                    <dt className="text-[13px] text-muted">{t.cgpa}</dt>
                    <dd className="text-[24px] font-bold tabular-nums">{record.cgpa.toFixed(2)}</dd>
                  </div>
                )}
                {record.muetBand !== null && (
                  <div className="rounded-[14px] bg-bg px-4 py-3">
                    <dt className="text-[13px] text-muted">MUET</dt>
                    <dd className="text-[24px] font-bold tabular-nums">{record.muetBand === 5.5 ? '5+' : record.muetBand.toFixed(1)}</dd>
                  </div>
                )}
              </dl>
            )}
            {record.subjects.length > 0 && (
              <table className="w-full text-[15px]">
                <thead className="sr-only">
                  <tr>
                    <th>{t.subject}</th>
                    <th>{t.grade}</th>
                  </tr>
                </thead>
                <tbody>
                  {record.subjects.map((s) => (
                    <tr key={s.subjectId + (s.customName ?? '')} className="border-b border-line last:border-0">
                      <td className="py-2.5 pr-3">{s.customName ?? subjectName.get(s.subjectId) ?? '—'}</td>
                      <td className="w-16 py-2.5 text-right font-bold tabular-nums">{s.grade}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <div className="flex flex-wrap gap-2">
              <Link href={`/${lang}/dokumen`} className={`${button} bg-navy text-white hover:bg-navy/90`}>
                {t.updateResults}
              </Link>
              <Link href={`/${lang}/dokumen/rekod/${record.id}`} className={`${button} border border-line bg-white hover:bg-bg`}>
                {t.viewRecord}
              </Link>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted">{t.noResultsBody}</p>
        )}
      </Row>

      {me.educationLevel !== 'form1_3' && (
        <Row title={t.meritTitle} description={t.meritHint}>
          <MeritSummary lang={lang} dict={dict} token={token} />
        </Row>
      )}

      {others.length > 0 && (
        <Row title={dict.academic.history.title} description={dict.academic.history.intro}>
          <ul className="flex flex-col">
            {others.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-line py-3 first:pt-0 last:border-0 last:pb-0">
                <span className="flex min-w-0 flex-col">
                  <span className="font-semibold">{label(r)}</span>
                  <span className="text-[13px] text-muted">
                    {dict.academic.status[r.status]}
                    {r.subjects.length > 0 && ` · ${format(dict.academic.history.subjects, { count: r.subjects.length })}`}
                    {r.cgpa !== null && ` · ${t.cgpa} ${r.cgpa.toFixed(2)}`}
                  </span>
                </span>
                <Link href={`/${lang}/dokumen/rekod/${r.id}`} className="text-sm font-semibold underline underline-offset-2">
                  {dict.academic.history.open}
                </Link>
              </li>
            ))}
          </ul>
        </Row>
      )}
    </div>
  );
}

/**
 * The student's merit, worked out from the results they saved (target grades in Form 4–5), with a link to try
 * changes in Merit Lab.
 */
async function MeritSummary({ lang, dict, token }: { lang: Locale; dict: Dictionary; token: string }) {
  const t = dict.profile.merit;
  const inputs = await loadMeritInputs(token, lang).catch(() => null);
  const merit = inputs ? studentMerit(inputs) : null;
  if (!inputs || merit === null) return <p className="text-sm text-muted">{t.empty}</p>;
  const target = inputs.basis === 'target';
  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center gap-4">
        <span aria-hidden className="h-12 w-1.5 rounded-full bg-yellow" />
        <div className="flex flex-col">
          <p className="text-[13px] text-muted">{target ? t.labelTarget : t.label}</p>
          <p className="text-[32px] font-bold leading-none tabular-nums">{merit.toFixed(2)}</p>
        </div>
      </div>
      <Link href={`/${lang}/merit-lab`} className={`${button} border border-line bg-white hover:bg-bg`}>
        {t.tryIt}
      </Link>
      {target && <p className="w-full text-[13px] text-muted">{t.fromTarget}</p>}
    </div>
  );
}
