import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { FaqList } from '@/components/site/faq-list';
import { InfoPage } from '@/components/site/info-page';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { isLocale } from '@/lib/i18n/locale';

export async function generateMetadata({ params }: PageProps<'/[lang]/panduan'>): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const t = (await getDictionary(lang)).site.pages.guide;
  return { title: `${t.title} · EduLaunch`, description: t.intro };
}

export default async function GuidePage({ params }: PageProps<'/[lang]/panduan'>) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const dict = await getDictionary(lang);
  const t = dict.site.pages.guide;
  const [a, b, c] = t.tiles;
  return (
    <InfoPage
      kicker={dict.site.pages.kicker}
      title={t.title}
      intro={t.intro}
      cards={<FaqList items={t.items} openFirst={false} />}
      tiles={[
        { ...a!, picture: { sheet: 'worlds', col: 1, row: 1 } },
        { ...b!, picture: { src: '/landing/rimau-reading.png' } },
        { ...c!, picture: { sheet: 'worlds', col: 2, row: 1 } },
      ]}
    />
  );
}
