import Link from 'next/link';
import { notFound } from 'next/navigation';
import { lang as rootLang } from 'next/root-params';
import { FieldIllustration } from '@/components/catalogue/field-illustration';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { isLocale } from '@/lib/i18n/locale';

// Sidebar sections that are not built yet land here instead of a bare 404.
export default async function ComingSoon() {
  // Only the language is read, so the page can be prerendered; the rest of the path does not matter here.
  const lang = await rootLang();
  if (!isLocale(lang)) notFound();
  const t = (await getDictionary(lang)).soon;
  return (
    <section className="flex flex-col items-start gap-4 rounded-[22px] bg-white p-10">
      <FieldIllustration world="pathway" size={180} />
      <h1 className="text-[32px] font-bold leading-tight">{t.title}</h1>
      <p className="text-[15px] text-muted">{t.body}</p>
      <Link href={`/${lang}/teroka`} className="rounded-[10px] bg-navy px-5 py-3 font-semibold text-white">
        {t.back}
      </Link>
    </section>
  );
}
