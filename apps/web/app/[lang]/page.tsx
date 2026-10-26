import { notFound, redirect } from 'next/navigation';
import { isLocale } from '@/lib/i18n/locale';

// proxy.ts normally redirects first (to logging in, or to the portal); this is the fallback.
export default async function Home({ params }: PageProps<'/[lang]'>) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  redirect(`/${lang}/log-masuk`);
}
