import Image from 'next/image';
import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ContactForm } from '@/components/site/contact-form';
import { PageHeading } from '@/components/site/page-heading';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { isLocale } from '@/lib/i18n/locale';

export async function generateMetadata({ params }: PageProps<'/[lang]/hubungi'>): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const t = (await getDictionary(lang)).site.pages.contact;
  return { title: `${t.title} · EduLaunch`, description: t.intro };
}

/** Contact us (Figma P / Hubungi kami): the public form beside a note for students who already have an account. */
export default async function ContactPage({ params }: PageProps<'/[lang]/hubungi'>) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const t = (await getDictionary(lang)).site.pages.contact;
  return (
    <div className="bg-bg">
      <div className="mx-auto grid max-w-[1200px] grid-cols-[minmax(0,1fr)] items-start gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[600px_minmax(0,1fr)] lg:gap-16 lg:py-[42px]">
        <div className="flex flex-col gap-5 rounded-[4px] bg-white p-5 sm:p-6">
          <PageHeading kicker={t.kicker} title={t.title} intro={t.intro} />
          <ContactForm t={t} />
        </div>
        <aside className="flex flex-col items-center gap-10 lg:pt-12">
          <div className="flex w-full max-w-[440px] flex-col gap-2 rounded-[18px] bg-blue px-5 py-5">
            <h2 className="text-[19px] font-semibold">{t.help.title}</h2>
            <p className="text-[14px] text-muted">{t.help.body}</p>
            <Link href={`/${lang}/log-masuk?next=${encodeURIComponent(`/${lang}/bantuan`)}`} className="mt-1 self-start text-[14px] font-semibold text-[#2f5bd3] hover:underline">
              {t.help.cta} →
            </Link>
          </div>
          <Image src="/landing/rimau-support.png" alt="" width={264} height={264} className="hidden size-[264px] object-contain lg:block" />
        </aside>
      </div>
    </div>
  );
}
