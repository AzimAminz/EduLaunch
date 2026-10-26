import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { Icon } from '@/components/ui/icon';
import { signOut } from '@/lib/auth/actions';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { isLocale, type Dictionary, type Locale } from '@/lib/i18n/locale';
import { requireRole } from '@/lib/supabase/server';

/** Placeholder until the admin console is built (Step 8). Admins only: the proxy and requireRole both check. */
export default async function AdminPage({ params }: PageProps<'/[lang]/admin'>) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const dict = await getDictionary(lang);
  return (
    <main className="mx-auto flex min-h-dvh max-w-[720px] flex-col justify-center gap-5 px-4 py-12">
      <span className="flex items-center gap-2.5">
        <Icon src="/brand/logo.svg" size={32} />
        <span className="text-xl font-bold">EduLaunch</span>
      </span>
      {/* The account check reads cookies, which is request-time data. */}
      <Suspense fallback={<section className="h-[220px] rounded-[22px] bg-white" />}>
        <AdminHome locale={lang} dict={dict} />
      </Suspense>
    </main>
  );
}

async function AdminHome({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  await requireRole(locale, 'admin');
  return (
    <section className="flex flex-col items-start gap-4 rounded-[22px] bg-white p-6 lg:p-10">
      <h1 className="text-[32px] font-bold leading-tight">{dict.admin.title}</h1>
      <p className="text-[15px] text-muted">{dict.admin.body}</p>
      <form action={signOut}>
        <input type="hidden" name="locale" value={locale} />
        <button type="submit" className="flex items-center gap-2 rounded-[10px] border border-line px-5 py-3 font-semibold hover:bg-bg">
          <Icon src="/icons/log-out.svg" size={18} />
          {dict.auth.signOut}
        </button>
      </form>
    </section>
  );
}
