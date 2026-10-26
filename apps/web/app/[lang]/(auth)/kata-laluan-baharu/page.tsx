import { notFound } from 'next/navigation';
import { AuthCard, AuthHeading, AuthSidePanel, AuthTwoColumn } from '@/components/auth/auth-shell';
import { NewPasswordForm } from '@/components/auth/forms';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { isLocale } from '@/lib/i18n/locale';

/** Reached from the password e-mail (the callback has already signed the user in). */
export default async function NewPasswordPage({ params }: PageProps<'/[lang]/kata-laluan-baharu'>) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const t = (await getDictionary(lang)).auth;
  const p = t.newPasswordPage;
  return (
    <AuthTwoColumn
      heading={<AuthHeading eyebrow={p.eyebrow} title={p.title} intro={p.intro} />}
      side={<AuthSidePanel image="/illustrations/rimau-shield.png" title={t.side.title} body={t.side.body} priority />}
    >
      <AuthCard>
        <NewPasswordForm locale={lang} t={t} />
      </AuthCard>
    </AuthTwoColumn>
  );
}
