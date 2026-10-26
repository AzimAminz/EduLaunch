import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { ProgrammeForm } from '@/components/admin/programme-form';
import { AdminHeading, Card, LoadError } from '@/components/admin/ui';
import { listInstitutions } from '@/lib/admin/api';
import { fieldName, getReferenceData } from '@/lib/catalogue/api';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { isLocale, type Dictionary, type Locale } from '@/lib/i18n/locale';
import { getAccessToken, requireRole } from '@/lib/supabase/server';

/** "Add a new programme": saved as a draft that another admin approves. */
export default async function NewProgrammePage({ params }: PageProps<'/[lang]/admin/program/baharu'>) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const dict = await getDictionary(lang);
  const t = dict.admin;
  return (
    <>
      <AdminHeading title={t.programmeForm.newTitle} intro={t.programmeForm.newIntro} back={{ href: `/${lang}/admin/program`, label: t.programme.back }} />
      <Card className="max-w-[760px]">
        <Suspense fallback={<p className="text-sm text-muted">…</p>}>
          <NewProgramme locale={lang} dict={dict} />
        </Suspense>
      </Card>
    </>
  );
}

async function NewProgramme({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  await requireRole(locale, 'admin');
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
      fields={reference.fields.map((f) => ({ value: f.id, label: fieldName(f, locale) })).sort((a, b) => a.label.localeCompare(b.label, locale))}
    />
  );
}
