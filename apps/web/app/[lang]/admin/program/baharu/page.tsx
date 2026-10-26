import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { z } from 'zod';
import { ProgrammeForm } from '@/components/admin/programme-form';
import { AdminHeading, Card, LoadError } from '@/components/admin/ui';
import { listInstitutions, listNecFields } from '@/lib/admin/api';
import { necOptions } from '@/lib/admin/nec';
import { fieldName, getReferenceData } from '@/lib/catalogue/api';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { isLocale, type Dictionary, type Locale } from '@/lib/i18n/locale';
import { getAccessToken, requireRole } from '@/lib/supabase/server';

/** "Add a new programme": saved as a draft that another admin approves. */
export default async function NewProgrammePage({ params, searchParams }: PageProps<'/[lang]/admin/program/baharu'>) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const dict = await getDictionary(lang);
  return (
    <Suspense fallback={<p className="text-sm text-muted">…</p>}>
      {/* The institution it was started from (?institusi=…) is request-time data. */}
      <NewProgramme locale={lang} dict={dict} searchParams={searchParams} />
    </Suspense>
  );
}

async function NewProgramme({ locale, dict, searchParams }: { locale: Locale; dict: Dictionary; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireRole(locale, 'admin');
  const asked = (await searchParams).institusi;
  const initialInstitutionId = z.uuid().safeParse(Array.isArray(asked) ? asked[0] : asked).data;
  let institutions, reference, nec;
  try {
    const token = (await getAccessToken())!;
    [institutions, reference, nec] = await Promise.all([listInstitutions(token), getReferenceData(), listNecFields(token)]);
  } catch {
    return <LoadError text={dict.admin.errors.generic} />;
  }
  const from = institutions.find((i) => i.id === initialInstitutionId);
  const t = dict.admin;
  return (
    <>
      <AdminHeading
        title={t.programmeForm.newTitle}
        intro={t.programmeForm.newIntro}
        // Back to where the admin came from: the institution's profile, or the programme list.
        back={from ? { href: `/${locale}/admin/institusi/${from.id}?tab=program`, label: `← ${from.name}` } : { href: `/${locale}/admin/program`, label: t.programme.back }}
      />
      <Card className="max-w-[760px]">
        <ProgrammeForm
          locale={locale}
          t={t}
          levels={dict.levels}
          noMatches={dict.directory.noMatches}
          institutions={institutions.map((i) => ({ value: i.id, label: i.name, keywords: i.shortName ? [i.shortName] : [] }))}
          necFields={necOptions(nec)}
          initialInstitutionId={from?.id}
          mode="new"
          cancelHref={from ? `/${locale}/admin/institusi/${from.id}?tab=program` : `/${locale}/admin/program`}
          fields={reference.fields.map((f) => ({ value: f.id, label: fieldName(f, locale) })).sort((a, b) => a.label.localeCompare(b.label, locale))}
        />
      </Card>
    </>
  );
}
