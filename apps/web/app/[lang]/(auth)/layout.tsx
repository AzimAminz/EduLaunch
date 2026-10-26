import Link from 'next/link';
import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { LanguageSwitch } from '@/components/portal/language-switch';
import { Icon } from '@/components/ui/icon';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { isLocale } from '@/lib/i18n/locale';

/** Public frame for the account screens: navy bar, page, short disclaimer footer. */
export default async function AuthLayout({ children, params }: LayoutProps<'/[lang]'>) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const dict = await getDictionary(lang);
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="bg-navy">
        <div className="mx-auto flex max-w-[1200px] items-center gap-4 px-4 py-3 sm:px-6 lg:py-4">
          <Link href={`/${lang}`} className="flex flex-1 items-center gap-2.5">
            <Icon src="/brand/logo.svg" size={32} />
            <span className="text-xl font-bold text-white">EduLaunch</span>
          </Link>
          <Suspense fallback={<div className="h-10 w-[112px]" />}>
            <LanguageSwitch locale={lang} labels={dict.language} className="w-[112px] bg-white/90" />
          </Suspense>
        </div>
      </header>
      <main className="mx-auto w-full max-w-[1200px] flex-1 px-4 py-8 sm:px-6 lg:py-12">{children}</main>
      <footer className="bg-navy">
        <div className="mx-auto flex max-w-[1200px] flex-col gap-2 px-4 py-6 text-xs text-white/75 sm:px-6">
          <p>{dict.footer.disclaimer}</p>
          <p>{dict.footer.copyright}</p>
        </div>
      </footer>
    </div>
  );
}
