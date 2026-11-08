import type { Metadata } from 'next';
import { Outfit } from 'next/font/google';
import { notFound } from 'next/navigation';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { LOCALES, isLocale } from '@/lib/i18n/locale';
import { MotionProvider, MotionScript } from '@/components/motion/motion-provider';
import '../globals.css';

const outfit = Outfit({ variable: '--font-outfit', subsets: ['latin'] });

export function generateStaticParams() {
  return LOCALES.map((lang) => ({ lang }));
}

export async function generateMetadata({ params }: LayoutProps<'/[lang]'>): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const dict = await getDictionary(lang);
  return { title: dict.meta.title, description: dict.meta.description };
}

export default async function RootLayout({ children, params }: LayoutProps<'/[lang]'>) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  return (
    // The head script adds a class before paint (motion on or off), so React must not warn about it.
    <html lang={lang} className={`${outfit.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <MotionScript />
      </head>
      <body className="min-h-full font-sans">
        <MotionProvider>{children}</MotionProvider>
      </body>
    </html>
  );
}
