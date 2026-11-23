import type { ReactNode } from 'react';

/** The heading of an inner public page: small kicker, big title, one line of introduction. */
export function PageHeading({ kicker, title, intro, children }: { kicker: string; title: string; intro: string; children?: ReactNode }) {
  return (
    <header className="flex flex-col gap-4">
      <p className="text-[13px] font-semibold uppercase tracking-[0.04em] text-muted">{kicker}</p>
      <h1 className="text-[36px] font-bold leading-[1.1] tracking-[-0.02em] lg:text-[48px]">{title}</h1>
      <p className="text-base text-muted">{intro}</p>
      {children}
    </header>
  );
}
