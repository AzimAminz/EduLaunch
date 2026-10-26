import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { Sidebar } from '@/components/portal/sidebar';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { isLocale } from '@/lib/i18n/locale';

/** Student portal frame: sidebar on the left, page content in a 1088px column. */
export default async function PortalLayout({ children, params }: LayoutProps<'/[lang]'>) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const dict = await getDictionary(lang);
  return (
    <div className="flex min-h-dvh">
      {/* The language switch reads the query string, which is request-time data. */}
      <Suspense fallback={<div className="w-[272px] shrink-0 border-r border-line bg-white" />}>
        <Sidebar locale={lang} nav={dict.nav} language={dict.language} />
      </Suspense>
      <main className="min-w-0 flex-1 px-10 pb-12 pt-9">
        <div className="mx-auto flex max-w-[1088px] flex-col gap-[22px]">{children}</div>
      </main>
    </div>
  );
}
