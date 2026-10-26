import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { lang as rootLang } from 'next/root-params';
import { z } from 'zod';
import { ProgrammeTable } from '@/components/admin/programme-table';
import { AdminHeading, ButtonLink, Card, LoadError } from '@/components/admin/ui';
import { listAdminInstitutions, listProgrammes } from '@/lib/admin/api';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { format, isLocale, type Dictionary, type Locale } from '@/lib/i18n/locale';
import { getAccessToken, requireRole } from '@/lib/supabase/server';

/**
 * One institution: its official sources and the programmes it offers. Institution first: programmes are
 * added from here, and the programme import (Step 9) will show the programmes it finds here too.
 */
export default async function InstitutionPage({ params }: PageProps<'/[lang]/admin/institusi/[id]'>) {
  const lang = await rootLang();
  if (!isLocale(lang)) notFound();
  const dict = await getDictionary(lang);
  return (
    <Suspense fallback={<p className="text-sm text-muted">…</p>}>
      {/* The institution id is only known at request time. */}
      <Institution locale={lang} dict={dict} params={params} />
    </Suspense>
  );
}

async function Institution({ locale, dict, params }: { locale: Locale; dict: Dictionary; params: PageProps<'/[lang]/admin/institusi/[id]'>['params'] }) {
  const { id } = await params;
  // A malformed link is treated like an institution that does not exist.
  if (!z.uuid().safeParse(id).success) notFound();
  await requireRole(locale, 'admin');
  const t = dict.admin;
  const i = t.institutions;

  let institutions, programmes;
  try {
    const token = (await getAccessToken())!;
    [institutions, programmes] = await Promise.all([listAdminInstitutions(token), listProgrammes(token, { institutionId: id })]);
  } catch {
    return <LoadError text={t.errors.generic} />;
  }
  const institution = institutions.find((x) => x.id === id);
  if (!institution) notFound();
  const types: Record<string, string> = i.types;

  return (
    <>
      <AdminHeading
        back={{ href: `/${locale}/admin/institusi`, label: i.detailBack }}
        title={institution.name}
        intro={
          <span>
            {institution.shortName && `${institution.shortName} · `}
            {types[institution.type] ?? institution.type} · {format(i.programmeCount, { count: institution.programmes })}
          </span>
        }
        actions={
          <ButtonLink href={`/${locale}/admin/program/baharu?institusi=${institution.id}`} primary>
            {i.addHere}
          </ButtonLink>
        }
      />

      <Card>
        <h2 className="text-lg font-semibold">{i.sources}</h2>
        {institution.websiteUrl ? (
          <p className="text-sm">
            <span className="text-muted">{i.website}: </span>
            <a href={institution.websiteUrl} target="_blank" rel="noreferrer" className="break-all font-semibold underline">
              {institution.websiteUrl.replace(/^https?:\/\//, '')}
            </a>
          </p>
        ) : (
          <p className="text-sm text-muted">{i.noWebsite}</p>
        )}
        <p className="rounded-[12px] bg-blue px-4 py-3 text-[13px]">{i.sourcesHint}</p>
      </Card>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">{i.programmesHere}</h2>
        <ProgrammeTable rows={programmes.items} locale={locale} dict={dict} showInstitution={false} />
      </section>
    </>
  );
}
