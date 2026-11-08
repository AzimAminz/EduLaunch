'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

/** A link the router will follow inside the app (same origin, same tab, a different page). */
function internalTarget(e: MouseEvent): boolean {
  if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return false;
  const a = (e.target as Element | null)?.closest?.('a[href]');
  if (!(a instanceof HTMLAnchorElement) || (a.target && a.target !== '_self') || a.hasAttribute('download')) return false;
  const to = new URL(a.href, location.href);
  return to.origin === location.origin && (to.pathname !== location.pathname || to.search !== location.search);
}

/**
 * A thin bar along the top of the window from the click on a link until the next page arrives, so a slow page
 * still answers the click at once. It creeps towards the end while waiting and fills when the address changes.
 */
export function NavProgress() {
  const pathname = usePathname();
  const search = useSearchParams().toString();
  const [phase, setPhase] = useState<'idle' | 'loading' | 'done'>('idle');
  const [arrived, setArrived] = useState(`${pathname}?${search}`);

  // The new page has arrived: fill the bar, then hide it.
  const here = `${pathname}?${search}`;
  if (here !== arrived) {
    setArrived(here);
    if (phase === 'loading') setPhase('done');
  }

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (internalTarget(e)) setPhase('loading');
    };
    // Capture: Next's Link cancels the browser's own navigation before the click would bubble up here.
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, []);

  useEffect(() => {
    if (phase !== 'done') return;
    const t = setTimeout(() => setPhase('idle'), 350);
    return () => clearTimeout(t);
  }, [phase]);

  return (
    <div aria-hidden data-nav-progress className="pointer-events-none fixed inset-x-0 top-0 z-[100] h-[3px]">
      <div
        className={`h-full origin-left bg-navy ${
          phase === 'idle'
            ? 'scale-x-0 opacity-0'
            : phase === 'loading'
              ? 'scale-x-[0.85] opacity-100 transition-transform duration-[6000ms] ease-out motion-reduce:scale-x-50 motion-reduce:transition-none'
              : 'scale-x-100 opacity-0 transition-[transform,opacity] duration-300'
        }`}
      />
    </div>
  );
}
