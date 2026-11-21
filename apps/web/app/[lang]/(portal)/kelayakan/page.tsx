import Link from 'next/link';
import { notFound } from 'next/navigation';
import { lang as rootLang } from 'next/root-params';
import { GradeScales } from '@edulaunch/contracts';
import { TryGrades, type TryRow } from '@/components/eligibility/try-grades';
import { Pending } from '@/components/ui/pending';
import { getProgramme, getPublishedRequirements, getReferenceData, localName } from '@/lib/catalogue/api';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { isLocale, type Dictionary, type Locale } from '@/lib/i18n/locale';
import { getMe, listRecords, listSavedProgrammes, type AcademicRecord } from '@/lib/profile/api';
import { getRecommendations } from '@/lib/recommendation/api';
import { getAccessToken } from '@/lib/supabase/server';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * "Semakan kelayakan" (Figma: Portal / User eligibility · input, · gaps & unknown): pick a programme, try grades
 * (filled in from the profile) and see which requirements they meet, where the gaps are and what is still unknown.
 * Nothing is saved: it is for planning targets and trying "what if I improved this".
 */
export default async function TryEligibilityPage({ searchParams }: PageProps<'/[lang]/kelayakan'>) {
  const lang = await rootLang();
  if (!isLocale(lang)) notFound();
  const dict = await getDictionary(lang);
  const t = dict.tryEligibility;
  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-[28px] font-bold leading-tight lg:text-[36px]">{t.title}</h1>
        <p className="text-[15px] text-muted">{t.intro}</p>
      </header>
      <Pending label={t.loading} variant="form">
        <TryView lang={lang} dict={dict} searchParams={searchParams} />
      </Pending>
    </div>
  );
}

/** The record whose grades the check reads: school results in Form 1–3, SPM targets in Form 4–5, SPM after that. */
function gradedRecord(level: string | null, records: AcademicRecord[]): AcademicRecord | undefined {
  if (level === 'form1_3') return records.find((r) => r.qualification === 'school');
  if (level === 'form4_5') return records.find((r) => r.qualification === 'spm' && r.kind === 'target') ?? records.find((r) => r.qualification === 'spm' && r.kind === 'actual');
  return records.find((r) => r.qualification === 'spm' && r.kind === 'actual');
}

async function TryView({ lang, dict, searchParams }: { lang: Locale; dict: Dictionary; searchParams: PageProps<'/[lang]/kelayakan'>['searchParams'] }) {
  const t = dict.tryEligibility;
  const [sp, token] = await Promise.all([searchParams, getAccessToken()]);
  if (!token) notFound();
  const [me, records, recs, saved, reference] = await Promise.all([
    getMe(token).catch(() => null),
    listRecords(token).catch(() => []),
    getRecommendations(token).catch(() => null),
    listSavedProgrammes(token).catch(() => []),
    getReferenceData().catch(() => null),
  ]);
  if (!me?.educationLevel || !reference)
    return (
      <section className="flex flex-col items-start gap-3 rounded-[22px] bg-white p-6">
        <p className="text-sm">{t.needLevel}</p>
        <Link href={`/${lang}/profil#tahap`} className="inline-flex h-11 items-center rounded-[12px] bg-navy px-5 text-sm font-semibold text-white">
          {t.chooseLevel}
        </Link>
      </section>
    );

  // Programmes to choose from: the saved ones first, then the student's suggestions.
  const fromList = new Map((recs?.items ?? []).map((i) => [i.programId, i.programName]));
  const savedNames = await Promise.all(saved.filter((s) => !fromList.has(s.programId)).map((s) => getProgramme(s.programId).then((p) => [p.id, p.name] as const).catch(() => null)));
  const options = [
    ...saved.flatMap((s) => {
      const name = fromList.get(s.programId) ?? savedNames.find((n) => n?.[0] === s.programId)?.[1];
      return name ? [{ id: s.programId, name, saved: true }] : [];
    }),
    ...[...fromList].filter(([id]) => !saved.some((s) => s.programId === id)).map(([id, name]) => ({ id, name, saved: false })),
  ];
  const asked = typeof sp.program === 'string' && UUID.test(sp.program) ? sp.program : null;
  // A programme opened from its page (?program=) may be in neither list.
  if (asked && !options.some((o) => o.id === asked)) {
    const p = await getProgramme(asked).catch(() => null);
    if (p) options.unshift({ id: p.id, name: p.name, saved: false });
  }
  const programId = asked && options.some((o) => o.id === asked) ? asked : options[0]?.id;
  if (!programId)
    return (
      <section className="flex flex-col items-start gap-3 rounded-[22px] bg-white p-6">
        <p className="text-sm">{t.noProgrammes}</p>
        <Link href={`/${lang}/teroka`} className="inline-flex h-11 items-center rounded-[12px] bg-navy px-5 text-sm font-semibold text-white">
          {dict.nav.explore}
        </Link>
      </section>
    );

  const scale = me.educationLevel === 'form1_3' ? 'school' : 'spm';
  const requirements = await getPublishedRequirements([programId]).catch(() => []);
  const onScale = new Map(reference.subjects.filter((s) => s.qualification === scale).map((s) => [s.id, localName(s, lang)]));
  const named = new Set(requirements.flatMap((r) => r.rules.flatMap((rule) => [rule.subjectId, ...rule.subjectIds].filter((id): id is string => Boolean(id) && onScale.has(id!)))));
  const record = gradedRecord(me.educationLevel, records);
  const savedGrades = new Map((record?.subjects ?? []).filter((s) => onScale.has(s.subjectId)).map((s) => [s.subjectId, s.grade]));
  // The subjects the programme names first, then the rest the student saved grades for.
  const rows: TryRow[] = [
    ...[...named].map((id) => ({ subjectId: id, name: onScale.get(id)!, required: true, grade: savedGrades.get(id) ?? '' })),
    ...[...savedGrades].filter(([id]) => !named.has(id)).map(([id, grade]) => ({ subjectId: id, name: onScale.get(id)!, required: false, grade })),
  ];
  const higher = me.educationLevel === 'after_preu' || me.educationLevel === 'after_certificate';
  const cgpaRecord = higher ? records.find((r) => r.qualification === me.higherQualification && r.kind === 'actual') : undefined;
  const subjectNames = Object.fromEntries(reference.subjects.map((s) => [s.id, localName(s, lang)]));

  return (
    <>
      <form action={`/${lang}/kelayakan`} className="flex flex-col gap-3 rounded-[18px] bg-white p-5 sm:flex-row sm:items-end sm:p-6">
        <label className="flex min-w-0 flex-1 flex-col gap-2">
          <span className="text-sm font-semibold">{t.programme}</span>
          <select name="program" defaultValue={programId} className="h-12 w-full min-w-0 rounded-[12px] border-[1.5px] border-[#8792a6] bg-white px-3 text-[15px] font-semibold">
            {options.some((o) => o.saved) && (
              <optgroup label={t.savedGroup}>
                {options.filter((o) => o.saved).map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </optgroup>
            )}
            <optgroup label={t.suggestedGroup}>
              {options.filter((o) => !o.saved).map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </optgroup>
          </select>
        </label>
        <button type="submit" className="inline-flex h-12 shrink-0 items-center justify-center rounded-[12px] border border-line bg-white px-5 text-sm font-semibold hover:bg-bg">
          {t.choose}
        </button>
      </form>

      {requirements.length === 0 ? (
        <p className="rounded-[18px] bg-white p-6 text-sm text-muted">{t.noRequirements}</p>
      ) : (
        <TryGrades
          key={programId}
          locale={lang}
          programId={programId}
          rows={rows}
          subjects={[...onScale].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name, lang))}
          grades={GradeScales[scale]}
          cgpa={higher ? { initial: cgpaRecord?.cgpa ?? null } : null}
          t={t}
          eligibility={dict.eligibility}
          routeNames={dict.requirements.routes}
          subjectNames={subjectNames}
          ui={{ noMatches: dict.academic.noMatches }}
        />
      )}
      <p className="text-[13px] text-muted">
        {t.saveHint}{' '}
        <Link href={`/${lang}/dokumen`} className="font-semibold underline underline-offset-2">
          {dict.nav.documents}
        </Link>
      </p>
    </>
  );
}
