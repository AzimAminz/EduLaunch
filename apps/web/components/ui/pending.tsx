import { Suspense, type ReactNode } from 'react';
import { BlockSkeleton } from './skeleton';

/**
 * Request-time content of a page: its skeleton (the same shape as the page) while it loads, then the content fading
 * in briefly, so a page never jumps from a line of "Loading…" text to a full page at once.
 */
export function Pending({ label, variant, children }: { label: string; variant?: 'panels' | 'form' | 'cards'; children: ReactNode }) {
  return (
    <Suspense fallback={<BlockSkeleton label={label} variant={variant} />}>
      <div className="content-in flex flex-col gap-[22px]">{children}</div>
    </Suspense>
  );
}
