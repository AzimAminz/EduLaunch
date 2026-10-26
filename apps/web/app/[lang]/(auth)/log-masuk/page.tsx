import Image from 'next/image';
import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { AuthCard } from '@/components/auth/auth-shell';
import { SignInForm } from '@/components/auth/forms';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { isLocale } from '@/lib/i18n/locale';

export default async function SignInPage({ params }: PageProps<'/[lang]/log-masuk'>) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const t = (await getDictionary(lang)).auth;
  const p = t.signInPage;
  return (
    <div className="grid items-start gap-8 lg:grid-cols-2">
      <aside className="hidden flex-col gap-4 rounded-[22px] bg-blue px-12 pb-16 pt-6 lg:flex">
        <Image src="/illustrations/rimau-waving.png" alt="" width={271} height={271} priority className="mx-auto size-[271px] object-contain" />
        <p className="mt-16 text-[30px] font-bold leading-tight">
          {p.heroLine1}
          <br />
          {p.heroLine2}
        </p>
        <p className="text-[15px] text-muted">{p.heroBody}</p>
      </aside>
      <div className="mx-auto w-full max-w-[500px] lg:mt-2">
        <AuthCard>
          <div className="flex flex-col gap-6 sm:p-2">
            <header className="flex flex-col gap-3">
              <p className="text-xs font-semibold tracking-wide text-muted">{p.eyebrow}</p>
              <h1 className="text-[28px] font-bold leading-tight">{p.title}</h1>
              <p className="text-sm text-muted">{p.intro}</p>
            </header>
            {/* The form reads ?next= (where to return after logging in), which is request-time data. */}
            <Suspense fallback={<div className="h-[420px]" />}>
              <SignInForm locale={lang} t={t} />
            </Suspense>
            <p className="text-xs text-muted">{p.terms}</p>
          </div>
        </AuthCard>
      </div>
    </div>
  );
}
