import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { LegalPage } from '@/components/site/legal-page';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { isLocale } from '@/lib/i18n/locale';

export async function generateMetadata({ params }: PageProps<'/[lang]/terma'>): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const t = (await getDictionary(lang)).site.pages.terms;
  return { title: `${t.title} · EduLaunch`, description: t.intro };
}

export default async function TermsPage({ params }: PageProps<'/[lang]/terma'>) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const dict = await getDictionary(lang);
  return <LegalPage kicker={dict.site.pages.kicker} updated={dict.site.pages.updated} t={dict.site.pages.terms} />;
}
