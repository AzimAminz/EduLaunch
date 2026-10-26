import { notFound, redirect } from 'next/navigation';
import { isLocale } from '@/lib/i18n/locale';

// The home dashboard comes later; for now the programme directory is the starting page.
export default async function Home({ params }: PageProps<'/[lang]'>) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  redirect(`/${lang}/teroka`);
}
