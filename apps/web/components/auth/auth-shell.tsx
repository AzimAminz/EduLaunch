import Image from 'next/image';
import type { ReactNode } from 'react';

/** Page title block used by every account screen (eyebrow, heading, one sentence). */
export function AuthHeading({ eyebrow, title, intro }: { eyebrow: string; title: string; intro: string }) {
  return (
    <header className="flex flex-col gap-3">
      <p className="text-xs font-semibold tracking-wide text-muted">{eyebrow}</p>
      <h1 className="text-[30px] font-bold leading-tight lg:text-[40px]">{title}</h1>
      <p className="text-[15px] text-muted">{intro}</p>
    </header>
  );
}

/** White card that holds a form. */
export function AuthCard({ children }: { children: ReactNode }) {
  return <section className="rounded-[18px] bg-white p-5 sm:p-6">{children}</section>;
}

/** Light-blue panel with Rimau. Hidden on phones to keep the screen short. */
export function AuthSidePanel({ image, title, body, priority }: { image: string; title: string; body: string; priority?: boolean }) {
  return (
    <aside className="hidden flex-col gap-3 rounded-[18px] bg-blue p-6 lg:flex">
      <Image src={image} alt="" width={220} height={220} priority={priority} className="size-[220px] object-contain" />
      <p className="text-xl font-semibold">{title}</p>
      <p className="text-sm text-muted">{body}</p>
    </aside>
  );
}

/** Form on the left, Rimau panel on the right (Figma: Cipta akaun, Pulihkan akses, Semak peti masuk). */
export function AuthTwoColumn({ heading, children, side }: { heading: ReactNode; children: ReactNode; side: ReactNode }) {
  return (
    <div className="flex flex-col gap-6">
      {heading}
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        {children}
        {side}
      </div>
    </div>
  );
}
