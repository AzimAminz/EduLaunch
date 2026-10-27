import Link from 'next/link';
import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { lang as rootLang } from 'next/root-params';
import { z } from 'zod';
import { FreshOnNavigate } from '@/components/admin/fresh';
import { ProgrammeForm } from '@/components/admin/programme-form';
import { AdminHeading, Card, LoadError } from '@/components/admin/ui';
import { AdminApiError, getProgrammeDetail, listInstitutions, listNecFields, type ProgrammeDetail } from '@/lib/admin/api';
import { necOptions } from '@/lib/admin/nec';
import { programmeWorkflow } from '@/lib/admin/programme-workflow';
import { fieldName, getReferenceData } from '@/lib/catalogue/api';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { isLocale, type Dictionary, type Locale } from '@/lib/i18n/locale';
import { getAccessToken, requireRole } from '@/lib/supabase/server';

type Props = PageProps<'/[lang]/admin/program/[id]/sunting'>;

/**
 * Edit a programme. A draft is changed directly; a published programme is changed through a proposed change that
 * another admin approves (students keep the current version meanwhile). Saving returns to the programme page.
 */
export default async function EditProgrammePage({ params }: Props) {
  const lang = await rootLang();
  if (!isLocale(lang)) notFound();
  const dict = await getDictionary(lang);
  return (
    <Suspense fallback={<p className="text-sm text-muted">…</p>}>
      {/* The programme id is only known at request time. */}
      <Edit locale={lang} dict={dict} params={params} />
    </Suspense>
  );
}

async function Edit({ locale, dict, params }: { locale: Locale; dict: Dictionary; params: Props['params'] }) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const account = await requireRole(locale, 'admin');
  const t = dict.admin;
  let programme: ProgrammeDetail;
  let rest;
  try {
    const token = (await getAccessToken())!;
    const [p, ...others] = await Promise.all([getProgrammeDetail(token, id), listInstitutions(token), getReferenceData(), listNecFields(token)]);
    programme = p;
    rest = others;
  } catch (err) {
    if (err instanceof AdminApiError && (err.status === 404 || err.status === 400)) notFound();
    return <LoadError text={t.errors.generic} />;
  }
  const [institutions, reference, nec] = rest;
  const back = `/${locale}/admin/program/${id}`;
  const heading = <AdminHeading back={{ href: back, label: `← ${programme.name}` }} title={t.programmeForm.editTitle} />;

  // Nothing to fill in while it is with a reviewer or archived; the programme page says what to do instead.
  if (!programmeWorkflow(programme, account.id, account.superAdmin).canEdit) {
    return (
      <>
        {heading}
        <p className="rounded-[14px] bg-cream px-4 py-3 text-sm">
          {t.programmeForm.locked}{' '}
          <Link href={back} className="font-semibold underline">
            {programme.name}
          </Link>
        </p>
      </>
    );
  }

  const published = programme.status === 'published';
  const values = { id: programme.id, ...(programme.pendingChanges ?? programme) };
  return (
    <>
      {heading}
      <p className={`rounded-[14px] px-4 py-3 text-sm ${published ? 'bg-blue' : 'bg-white'}`}>{published ? t.programmeForm.editIntroPublished : t.programmeForm.editIntroDraft}</p>
      <Card className="max-w-[760px]">
        {/* Every new visit (and every saved change) starts from the stored values; back/forward keeps the draft. */}
        <FreshOnNavigate>
          <ProgrammeForm
            // The form starts from the stored values; after a save it starts again from the new ones.
            key={programme.updatedAt.getTime()}
            locale={locale}
            t={t}
            levels={dict.levels}
            noMatches={dict.directory.noMatches}
            institutions={institutions.map((i) => ({ value: i.id, label: i.name, keywords: i.shortName ? [i.shortName] : [] }))}
            fields={reference.fields.map((f) => ({ value: f.id, label: fieldName(f, locale) })).sort((a, b) => a.label.localeCompare(b.label, locale))}
            necFields={necOptions(nec)}
            mode={published ? 'change' : 'draft'}
            values={values}
            cancelHref={back}
          />
        </FreshOnNavigate>
      </Card>
    </>
  );
}
