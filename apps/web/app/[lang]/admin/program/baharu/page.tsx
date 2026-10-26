import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { z } from 'zod';
import { ProgrammeForm } from '@/components/admin/programme-form';
import { AdminHeading, Card, LoadError } from '@/components/admin/ui';
import { listInstitutions } from '@/lib/admin/api';
import { fieldName, getReferenceData } from '@/lib/catalogue/api';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { isLocale, type Dictionary, type Locale } from '@/lib/i18n/locale';
import { getAccessToken, requireRole } from '@/lib/supabase/server';

/** "Add a new programme": saved as a draft that another admin approves. */
export default async function NewProgrammePage({ params, searchParams }: PageProps<'/[lang]/admin/program/baharu'>) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const dict = await getDictionary(lang);
  const t = dict.admin;
  return (
    <>
      <AdminHeading title={t.programmeForm.newTitle} intro={t.programmeForm.newIntro} back={{ href: `/${lang}/admin/program`, label: t.programme.back }} />
      <Card className="max-w-[760px]">
        <Suspense fallback={<p className="text-sm text-muted">…</p>}>
          <NewProgramme locale={lang} dict={dict} searchParams={searchParams} />
        </Suspense>
      </Card>
    </>
  );
}

async function NewProgramme({ locale, dict, searchParams }: { locale: Locale; dict: Dictionary; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireRole(locale, 'admin');
  const asked = (await searchParams).institusi;
  const initialInstitutionId = z.uuid().safeParse(Array.isArray(asked) ? asked[0] : asked).data;
  let institutions, reference;
  try {
    [institutions, reference] = await Promise.all([listInstitutions((await getAccessToken())!), getReferenceData()]);
  } catch {
    return <LoadError text={dict.admin.errors.generic} />;
  }
  return (
    <ProgrammeForm
      locale={locale}
      t={dict.admin}
      levels={dict.levels}
      noMatches={dict.directory.noMatches}
      institutions={institutions.map((i) => ({ value: i.id, label: i.name, keywords: i.shortName ? [i.shortName] : [] }))}
      initialInstitutionId={institutions.some((i) => i.id === initialInstitutionId) ? initialInstitutionId : undefined}
      fields={reference.fields.map((f) => ({ value: f.id, label: fieldName(f, locale) })).sort((a, b) => a.label.localeCompare(b.label, locale))}
    />
  );
}
