import Link from 'next/link';
import { lang as rootLang } from 'next/root-params';
import { FieldIllustration } from '@/components/catalogue/field-illustration';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { DEFAULT_LOCALE, isLocale } from '@/lib/i18n/locale';

/** Shown in the reader's language when a page or programme does not exist. */
export default async function NotFound() {
  const value = await rootLang();
  const locale = isLocale(value) ? value : DEFAULT_LOCALE;
  const dict = await getDictionary(locale);
  return (
    <section className="mx-auto my-16 flex max-w-xl flex-col items-start gap-4 rounded-[22px] bg-white p-10">
      <FieldIllustration world="documents" size={180} inset={6} />
      <h1 className="text-[28px] font-bold leading-tight text-navy">{dict.detail.notFound}</h1>
      <Link href={`/${locale}/teroka`} className="rounded-[10px] bg-navy px-5 py-3 font-semibold text-white">
        {dict.soon.back}
      </Link>
    </section>
  );
}
