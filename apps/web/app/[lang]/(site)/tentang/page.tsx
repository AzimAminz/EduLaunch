import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { InfoCard, InfoPage } from '@/components/site/info-page';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { isLocale } from '@/lib/i18n/locale';

export async function generateMetadata({ params }: PageProps<'/[lang]/tentang'>): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const t = (await getDictionary(lang)).site.pages.about;
  return { title: `${t.title} · EduLaunch`, description: t.intro };
}

export default async function AboutPage({ params }: PageProps<'/[lang]/tentang'>) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const dict = await getDictionary(lang);
  const t = dict.site.pages.about;
  const [a, b, c] = t.tiles;
  return (
    <InfoPage
      kicker={dict.site.pages.kicker}
      title={t.title}
      intro={t.intro}
      cards={
        <div className="flex flex-col gap-4">
          {t.items.map((x) => (
            <InfoCard key={x.title} title={x.title} body={x.body} />
          ))}
        </div>
      }
      tiles={[
        { ...a!, picture: { sheet: 'worlds', col: 0, row: 1 } },
        { ...b!, picture: { sheet: 'worlds', col: 0, row: 0 } },
        { ...c!, picture: { sheet: 'worlds', col: 2, row: 1 } },
      ]}
    />
  );
}
