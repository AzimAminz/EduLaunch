import { notFound } from 'next/navigation';
import { AuthCard, AuthHeading, AuthSidePanel, AuthTwoColumn } from '@/components/auth/auth-shell';
import { SignUpForm } from '@/components/auth/forms';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { isLocale } from '@/lib/i18n/locale';

export default async function SignUpPage({ params }: PageProps<'/[lang]/daftar'>) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const t = (await getDictionary(lang)).auth;
  const p = t.signUpPage;
  return (
    <AuthTwoColumn
      heading={<AuthHeading eyebrow={p.eyebrow} title={p.title} intro={p.intro} />}
      side={<AuthSidePanel image="/illustrations/rimau-waving.png" title={t.side.title} body={t.side.body} priority />}
    >
      <AuthCard>
        <SignUpForm locale={lang} t={t} />
      </AuthCard>
    </AuthTwoColumn>
  );
}
