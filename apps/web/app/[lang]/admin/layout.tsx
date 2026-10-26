import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { Sidebar, type NavGroup } from '@/components/portal/sidebar';
import { getTasks } from '@/lib/admin/api';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { isLocale, type Dictionary, type Locale } from '@/lib/i18n/locale';
import { getAccessToken, requireRole } from '@/lib/supabase/server';

/** Admin console frame: the same sidebar as the student portal, with the admin menu (Figma "Admin v2 / Sidebar"). */
export default async function AdminLayout({ children, params }: LayoutProps<'/[lang]/admin'>) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const dict = await getDictionary(lang);
  return (
    <div className="flex min-h-dvh flex-col lg:flex-row">
      {/* The account (cookies) and the task count are request-time data. */}
      <Suspense fallback={<div className="hidden w-[272px] shrink-0 border-r border-line bg-white lg:block" />}>
        <AdminSidebar locale={lang} dict={dict} />
      </Suspense>
      <main className="min-w-0 flex-1 px-4 pb-12 pt-6 sm:px-6 lg:px-10 lg:pt-9">
        <div className="mx-auto flex max-w-[1120px] flex-col gap-[22px]">{children}</div>
      </main>
    </div>
  );
}

/** How many drafts wait for this admin's review, for the inbox badge; nothing if the count cannot be read. */
async function reviewCount(): Promise<number> {
  try {
    const token = await getAccessToken();
    return token ? (await getTasks(token)).toReview.length : 0;
  } catch {
    return 0;
  }
}

async function AdminSidebar({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  const account = await requireRole(locale, 'admin');
  const t = dict.admin.nav;
  const waiting = await reviewCount();
  const base = `/${locale}/admin`;
  const groups: NavGroup[] = [
    {
      title: t.groupWork,
      items: [
        { href: base, label: t.home, icon: 'home' },
        { href: `${base}/tugasan`, label: t.tasks, icon: 'inbox', badge: waiting ? String(waiting) : undefined },
      ],
    },
    {
      title: t.groupProgramme,
      // Data follows its hierarchy: an institution offers programmes; requirements live on each programme.
      items: [
        { href: `${base}/institusi`, label: t.institutions, icon: 'building' },
        { href: `${base}/program`, label: t.programmes, icon: 'rules' },
      ],
    },
  ];
  return (
    <Sidebar
      locale={locale}
      groups={groups}
      footer={[]}
      homeHref={base}
      labels={{ toggleSidebar: dict.nav.toggleSidebar, signOut: dict.auth.signOut, signedInAs: dict.auth.signedInAs }}
      language={dict.language}
      account={{ name: account.name, email: account.email, href: base }}
    />
  );
}
