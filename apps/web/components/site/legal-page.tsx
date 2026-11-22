import { format } from '@/lib/i18n/locale';
import { PageHeading } from './page-heading';

/** Privacy policy and terms of use: heading with the update date, then numbered sections of plain sentences. */
export function LegalPage({ kicker, updated, t }: { kicker: string; updated: string; t: { title: string; intro: string; date: string; sections: ReadonlyArray<{ title: string; body: ReadonlyArray<string> }> } }) {
  return (
    <div className="mx-auto flex max-w-[860px] flex-col gap-10 px-4 py-12 sm:px-6 lg:py-[50px]">
      <PageHeading kicker={kicker} title={t.title} intro={t.intro}>
        <p className="text-[13px] text-muted">{format(updated, { date: t.date })}</p>
      </PageHeading>
      <ol className="flex flex-col gap-4">
        {t.sections.map((s, i) => (
          <li key={s.title} className="flex flex-col gap-3 rounded-[18px] bg-bg p-5 sm:p-6">
            <h2 className="text-[19px] font-semibold">
              <span className="mr-2 text-muted">{i + 1}.</span>
              {s.title}
            </h2>
            <ul className="flex list-disc flex-col gap-2 pl-5 text-[15px] text-navy/85 marker:text-muted">
              {s.body.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </li>
        ))}
      </ol>
    </div>
  );
}
