import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { Sidebar } from '@/components/portal/sidebar';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { isLocale, type Dictionary, type Locale } from '@/lib/i18n/locale';
import { requireRole } from '@/lib/supabase/server';

/** Student portal frame: sidebar on the left (a menu on phones), page content in a 1088px column. */
export default async function PortalLayout({ children, params }: LayoutProps<'/[lang]'>) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const dict = await getDictionary(lang);
  return (
    <div className="flex min-h-dvh flex-col lg:flex-row">
      {/* The account (cookies) and the language switch (query string) are request-time data. */}
      <Suspense fallback={<div className="hidden w-[272px] shrink-0 border-r border-line bg-white lg:block" />}>
        <PortalSidebar locale={lang} dict={dict} />
      </Suspense>
      <main className="min-w-0 flex-1 px-4 pb-12 pt-6 sm:px-6 lg:px-10 lg:pt-9">
        <div className="mx-auto flex max-w-[1088px] flex-col gap-[22px]">{children}</div>
      </main>
    </div>
  );
}

async function PortalSidebar({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  // Students only; admins are sent to the admin console.
  const account = await requireRole(locale, 'student');
  return <Sidebar locale={locale} nav={dict.nav} language={dict.language} auth={dict.auth} account={{ name: account.name, email: account.email }} />;
}
