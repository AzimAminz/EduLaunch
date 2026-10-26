import { Suspense } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { z } from 'zod';
import { lang as rootLang } from 'next/root-params';
import { FieldIllustration } from '@/components/catalogue/field-illustration';
import { NotFoundError, fieldName, getProgramme, getPublishedRequirements, getReferenceData, localName } from '@/lib/catalogue/api';
import { programmeMeta } from '@/lib/catalogue/presentation';
import { describeRequirement } from '@/lib/catalogue/requirements';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { isLocale, type Dictionary, type Locale } from '@/lib/i18n/locale';

export default async function ProgrammePage({ params }: PageProps<'/[lang]/teroka/[id]'>) {
  const lang = await rootLang();
  if (!isLocale(lang)) notFound();
  const dict = await getDictionary(lang);
  return (
    <>
      <Link href={`/${lang}/teroka`} className="text-sm font-semibold text-navy hover:underline">
        ← {dict.detail.back}
      </Link>
      {/* The programme id is only known at request time. */}
      <Suspense fallback={<p className="text-sm text-muted">{dict.directory.loading}</p>}>
        <Programme lang={lang} dict={dict} params={params} />
      </Suspense>
    </>
  );
}

async function Programme({ lang, dict, params }: { lang: Locale; dict: Dictionary; params: PageProps<'/[lang]/teroka/[id]'>['params'] }) {
  const { id } = await params;
  const t = dict.detail;
  // A malformed link is treated like a programme that does not exist.
  if (!z.uuid().safeParse(id).success) notFound();

  let programme: Awaited<ReturnType<typeof getProgramme>>;
  try {
    programme = await getProgramme(id);
  } catch (err) {
    if (err instanceof NotFoundError) notFound();
    throw err;
  }
  const [reference, requirements] = await Promise.all([getReferenceData(), getPublishedRequirements([programme.id])]);

  const institution = reference.institutions.find((i) => i.id === programme.institutionId);
  const fields = reference.fields.filter((f) => programme.fieldIds.includes(f.id)).map((f) => fieldName(f, lang));
  const subjectNames = new Map(reference.subjects.map((s) => [s.id, localName(s, lang)]));
  const described = requirements.map((r) => describeRequirement(r, subjectNames, dict.requirements));
  const isSample = described.some((d) => d.isSample);

  return (
    <>
      <header className="flex flex-col gap-[22px]">
        <p className="text-xs font-semibold uppercase leading-tight text-muted">{institution?.name ?? dict.card.streamProvider}</p>
        <h1 className="text-[44px] font-bold leading-tight">{programme.name}</h1>
        <p className="text-[15px] leading-tight text-muted">{[programmeMeta(programme.studyLevel, programme.durationSemesters, dict), ...fields].join(' • ')}</p>
      </header>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
        <section className="flex flex-col gap-[18px] rounded-[22px] bg-white p-6" aria-labelledby="requirements-title">
          <h2 id="requirements-title" className="text-[26px] font-semibold leading-tight">
            {t.requirementsTitle}
          </h2>
          {described.length === 0 && <p className="text-sm text-muted">{t.noRequirement}</p>}
          {described.map((d) => (
            <div key={d.entryRoute} className="flex flex-col gap-[18px]">
              <Item title={t.entryRoute} detail={d.entryRoute} />
              {d.items.map((item, i) => (
                <Item key={i} title={item.title} detail={item.detail} />
              ))}
            </div>
          ))}
          {described.length > 0 && <Item title={t.sourceTitle} detail={isSample ? t.sourceSample : t.sourcePublished} />}
        </section>

        <section className="relative flex flex-col gap-[9px] overflow-hidden rounded-[22px] bg-blue px-5 pb-[260px] pt-5" aria-labelledby="evidence-title">
          <h2 id="evidence-title" className="text-[19px] font-semibold leading-tight">
            {t.evidenceTitle}
          </h2>
          <p className="text-sm leading-tight text-muted">{t.evidenceIntro}</p>
          <ul className="flex flex-col gap-2">
            {described.flatMap((d) => d.quotes).map((quote) => (
              <li key={quote} className="rounded-xl bg-white/70 px-4 py-3 text-sm italic text-navy">
                “{quote}”
              </li>
            ))}
          </ul>
          <FieldIllustration world="documents" size={230} inset={7.67} className="absolute bottom-0 left-1/2 -translate-x-1/2" />
        </section>
      </div>
    </>
  );
}

function Item({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="flex flex-col gap-[9px] rounded-[22px] bg-bg p-5">
      <p className="text-[19px] font-semibold leading-tight">{title}</p>
      <p className="text-sm leading-tight text-muted">{detail}</p>
    </div>
  );
}
