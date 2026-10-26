import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AuthCard, AuthHeading, AuthSidePanel, AuthTwoColumn } from '@/components/auth/auth-shell';
import { Icon } from '@/components/ui/icon';
import { AUTH_PAGES } from '@/lib/auth/routes';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { isLocale } from '@/lib/i18n/locale';

export default async function CheckInboxPage({ params }: PageProps<'/[lang]/semak-emel'>) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const t = (await getDictionary(lang)).auth;
  const p = t.inboxPage;
  return (
    <AuthTwoColumn
      heading={<AuthHeading eyebrow={p.eyebrow} title={p.title} intro={p.intro} />}
      side={<AuthSidePanel image="/illustrations/documents-check.png" title={t.side.title} body={t.side.body} priority />}
    >
      <AuthCard>
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-1 rounded-[12px] bg-bg p-4">
            <p className="text-[17px] font-semibold">{p.notReceivedTitle}</p>
            <p className="text-sm text-muted">{p.notReceivedBody}</p>
          </div>
          <Link href={`/${lang}/${AUTH_PAGES.signIn}`} className="flex items-center justify-center gap-2 rounded-[10px] bg-navy px-5 py-3.5 font-semibold text-white hover:bg-navy/90">
            <Icon src="/icons/log-in-white.svg" size={20} />
            {p.back}
          </Link>
          <Link href={`/${lang}/${AUTH_PAGES.forgotPassword}`} className="flex items-center justify-center gap-2 rounded-[10px] border border-line px-5 py-3.5 font-semibold hover:bg-bg">
            <Icon src="/icons/pencil.svg" size={18} />
            {p.changeEmail}
          </Link>
        </div>
      </AuthCard>
    </AuthTwoColumn>
  );
}
