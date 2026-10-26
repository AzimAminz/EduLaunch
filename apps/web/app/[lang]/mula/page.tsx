import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { LevelPicker } from '@/components/onboarding/level-picker';
import { Icon } from '@/components/ui/icon';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { isLocale } from '@/lib/i18n/locale';

/** Step 2 of 3 after creating an account. Only signed-in students reach it (see proxy.ts). */
export default async function OnboardingPage({ params }: PageProps<'/[lang]/mula'>) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const dict = await getDictionary(lang);
  const t = dict.onboarding;
  const steps = [
    { label: t.steps.account, state: 'done' },
    { label: t.steps.situation, state: 'current' },
    { label: t.steps.dashboard, state: 'todo' },
  ] as const;

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="bg-navy">
        <div className="mx-auto flex max-w-[1200px] items-center gap-4 px-4 py-3 sm:px-6 lg:py-4">
          <span className="flex flex-1 items-center gap-2.5">
            <Icon src="/brand/logo.svg" size={32} />
            <span className="text-xl font-bold text-white">EduLaunch</span>
          </span>
          <ol aria-label={t.stepsLabel} className="hidden items-center gap-3 md:flex">
            {steps.map((s, i) => (
              <li key={s.label} aria-current={s.state === 'current' ? 'step' : undefined} className="flex items-center gap-3">
                {i > 0 && <span aria-hidden className="h-px w-10 bg-white/40" />}
                <span
                  className={`flex size-6 items-center justify-center rounded-full text-xs font-bold ${s.state === 'current' ? 'bg-yellow text-navy' : s.state === 'done' ? 'bg-white/90 text-navy' : 'border border-white/60 text-white'}`}
                >
                  {s.state === 'done' ? '✓' : i + 1}
                </span>
                <span className={`text-sm ${s.state === 'current' ? 'font-semibold text-yellow' : 'text-white/85'}`}>{s.label}</span>
              </li>
            ))}
          </ol>
          <Link href={`/${lang}/utama`} className="flex-1 text-right text-sm font-semibold text-white hover:underline">
            {t.skip} →
          </Link>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-[1200px] flex-1 flex-col gap-6 px-4 py-8 sm:px-6 lg:py-12">
        <header className="flex flex-col gap-3">
          <p className="text-xs font-semibold tracking-wide text-muted">{t.eyebrow}</p>
          <h1 className="text-[30px] font-bold leading-tight lg:text-[40px]">{t.title}</h1>
          <p className="max-w-[760px] text-[15px] text-muted">{t.intro}</p>
        </header>
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_400px]">
          <section className="rounded-[18px] bg-white p-5 sm:p-6">
            <LevelPicker locale={lang} t={t} errors={dict.auth.errors} />
          </section>
          <aside className="hidden flex-col gap-3 rounded-[18px] bg-blue p-6 lg:flex">
            <Image src="/illustrations/rimau-compass.png" alt="" width={300} height={300} loading="eager" className="mx-auto size-[260px] object-contain" />
            <p className="text-xl font-semibold">{dict.auth.side.title}</p>
            <p className="text-sm text-muted">{t.sideBody}</p>
          </aside>
        </div>
      </main>
    </div>
  );
}
