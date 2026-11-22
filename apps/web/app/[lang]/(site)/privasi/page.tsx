import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { LegalPage } from '@/components/site/legal-page';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { isLocale } from '@/lib/i18n/locale';

export async function generateMetadata({ params }: PageProps<'/[lang]/privasi'>): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const t = (await getDictionary(lang)).site.pages.privacy;
  return { title: `${t.title} · EduLaunch`, description: t.intro };
}

export default async function PrivacyPage({ params }: PageProps<'/[lang]/privasi'>) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const dict = await getDictionary(lang);
  return <LegalPage kicker={dict.site.pages.kicker} updated={dict.site.pages.updated} t={dict.site.pages.privacy} />;
}
