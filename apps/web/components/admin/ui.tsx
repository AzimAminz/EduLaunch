import Link from 'next/link';
import type { ReactNode } from 'react';
import type { ReviewStatus } from '@/lib/admin/api';
import { format, type Dictionary } from '@/lib/i18n/locale';

type AdminDict = Dictionary['admin'];

const STATUS_STYLE: Record<ReviewStatus, string> = {
  draft: 'bg-bg text-navy',
  in_review: 'bg-cream text-navy',
  returned: 'bg-red/10 text-[#b33a35]',
  published: 'bg-mint text-[#1f6b47]',
  archived: 'bg-line text-muted',
};

/** Status in everyday words, with a dot, as in the Figma "Admin v2 / Status" chip. */
export function StatusChip({ status, t }: { status: ReviewStatus; t: AdminDict }) {
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_STYLE[status]}`}>
      <span aria-hidden className="size-1.5 rounded-full bg-current" />
      {t.status[status]}
    </span>
  );
}

export function AdminHeading({ title, intro, actions, back }: { title: string; intro?: ReactNode; actions?: ReactNode; back?: { href: string; label: string } }) {
  return (
    <header className="flex flex-col gap-3">
      {back && (
        <Link href={back.href} className="self-start text-sm font-semibold hover:underline">
          {back.label}
        </Link>
      )}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 flex-col gap-2">
          <h1 className="text-[28px] font-bold leading-tight lg:text-[36px]">{title}</h1>
          {intro && <div className="text-[15px] text-muted">{intro}</div>}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
      </div>
    </header>
  );
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`flex flex-col gap-4 rounded-[18px] border border-line bg-white p-5 lg:p-6 ${className}`}>{children}</section>;
}

/** A link styled as a button: `primary` is the yellow action from the Figma admin screens. */
export function ButtonLink({ href, children, primary }: { href: string; children: ReactNode; primary?: boolean }) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center justify-center gap-2 rounded-[10px] px-4 py-2.5 text-sm font-semibold ${primary ? 'bg-yellow hover:bg-yellow/85' : 'border border-line bg-white hover:bg-bg'}`}
    >
      {children}
    </Link>
  );
}

/** "How this works" box with numbered steps. */
export function HowItWorks({ title, steps }: { title: string; steps: string[] }) {
  return (
    <section className="flex flex-col gap-3 rounded-[18px] bg-blue p-5 lg:p-6">
      <h2 className="font-semibold">{title}</h2>
      <ol className="flex flex-col gap-2.5">
        {steps.map((step, i) => (
          <li key={step} className="flex gap-3 text-sm">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-white text-xs font-semibold">{i + 1}</span>
            <span className="pt-0.5">{step}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function LoadError({ text }: { text: string }) {
  return (
    <p role="alert" className="rounded-[18px] border border-line bg-white p-6 text-sm">
      {text}
    </p>
  );
}

/** Who did something, from the reader's side: "you", "another admin" or "seed data". */
export function who(adminId: string | null, me: string, t: AdminDict): string {
  if (!adminId) return t.seedData;
  return adminId === me ? t.you : t.anotherAdmin;
}

/** "3 days ago" style time, for how long something has waited. */
export function timeAgo(date: Date, now: number, t: AdminDict): string {
  const minutes = Math.max(0, Math.round((now - date.getTime()) / 60_000));
  if (minutes < 1) return t.time.justNow;
  if (minutes < 60) return format(t.time.minutes, { n: minutes });
  const hours = Math.round(minutes / 60);
  if (hours < 24) return format(t.time.hours, { n: hours });
  return format(t.time.days, { n: Math.round(hours / 24) });
}
