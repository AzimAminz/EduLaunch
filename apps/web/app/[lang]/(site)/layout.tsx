import { notFound } from 'next/navigation';
import { SiteFooter } from '@/components/site/site-footer';
import { SiteHeader } from '@/components/site/site-header';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { isLocale } from '@/lib/i18n/locale';

/** The public website (landing, about, guide, privacy, terms, contact): navy bar, page, public footer. */
export default async function SiteLayout({ children, params }: LayoutProps<'/[lang]'>) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const dict = await getDictionary(lang);
  return (
    <div className="flex min-h-dvh flex-col bg-white">
      <SiteHeader locale={lang} t={dict.site.nav} />
      <main id="kandungan" className="flex-1">
        {children}
      </main>
      <SiteFooter locale={lang} dict={dict} />
    </div>
  );
}
