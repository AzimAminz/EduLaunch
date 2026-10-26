import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { AuthCard, AuthHeading, AuthSidePanel, AuthTwoColumn } from '@/components/auth/auth-shell';
import { ForgotPasswordForm } from '@/components/auth/forms';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { isLocale } from '@/lib/i18n/locale';

export default async function ForgotPasswordPage({ params }: PageProps<'/[lang]/lupa-kata-laluan'>) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const t = (await getDictionary(lang)).auth;
  const p = t.forgotPage;
  return (
    <AuthTwoColumn
      heading={<AuthHeading eyebrow={p.eyebrow} title={p.title} intro={p.intro} />}
      side={<AuthSidePanel image="/illustrations/rimau-shield.png" title={t.side.title} body={t.side.body} priority />}
    >
      <AuthCard>
        {/* The form reads ?ralat=pautan (an expired e-mail link), which is request-time data. */}
        <Suspense fallback={<div className="h-[330px]" />}>
          <ForgotPasswordForm locale={lang} t={t} />
        </Suspense>
      </AuthCard>
    </AuthTwoColumn>
  );
}
