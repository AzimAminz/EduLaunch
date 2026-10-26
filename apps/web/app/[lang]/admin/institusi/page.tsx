import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { InstitutionManager } from '@/components/admin/institution-manager';
import { AdminHeading, LoadError } from '@/components/admin/ui';
import { listInstitutions } from '@/lib/admin/api';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { isLocale, type Dictionary, type Locale } from '@/lib/i18n/locale';
import { getAccessToken, requireRole } from '@/lib/supabase/server';

/** Institutions: reference data that admins add and correct directly (no review step). */
export default async function InstitutionsPage({ params }: PageProps<'/[lang]/admin/institusi'>) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const dict = await getDictionary(lang);
  return (
    <>
      <AdminHeading title={dict.admin.institutions.title} intro={dict.admin.institutions.intro} />
      <Suspense fallback={<p className="text-sm text-muted">…</p>}>
        <Institutions locale={lang} dict={dict} />
      </Suspense>
    </>
  );
}

async function Institutions({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  await requireRole(locale, 'admin');
  let rows;
  try {
    rows = await listInstitutions((await getAccessToken())!);
  } catch {
    return <LoadError text={dict.admin.errors.generic} />;
  }
  return <InstitutionManager locale={locale} rows={rows} t={dict.admin} noMatches={dict.directory.noMatches} />;
}
