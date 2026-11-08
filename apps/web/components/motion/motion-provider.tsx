'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useLayoutEffect, useRef, type ReactNode } from 'react';
import gsap from 'gsap';
import Lenis from 'lenis';

let lenis: Lenis | null = null;

/** The page's smooth scroller, when motion is on (modals stop it while open). */
export const getLenis = () => lenis;

/** Motion is on when the head script found no request for reduced motion (see MotionScript). */
export const motionOn = () => typeof document !== 'undefined' && document.documentElement.classList.contains('motion');

/** Lists, menus and panels that scroll on their own keep the wheel instead of the page (dropdowns, modals, side panels). */
function scrollsOnItsOwn(node: HTMLElement): boolean {
  for (let el: HTMLElement | null = node; el && el !== document.body; el = el.parentElement) {
    if (el.matches('[role="listbox"], [role="dialog"], [role="alertdialog"], [data-lenis-prevent]')) return true;
    const overflow = getComputedStyle(el).overflowY;
    if ((overflow === 'auto' || overflow === 'scroll') && el.scrollHeight > el.clientHeight) return true;
  }
  return false;
}

const FROM: Record<string, gsap.TweenVars> = {
  '': { opacity: 0, y: 14 },
  up: { opacity: 0, y: 14 },
  fade: { opacity: 0 },
  scale: { opacity: 0, scale: 0.98 },
};

/**
 * Smooth scrolling (Lenis, driven by GSAP's ticker), elements revealed as they scroll into view (`data-reveal`, or
 * the children of `data-reveal-stagger`), and a short fade between pages. All of it is off when the visitor asks
 * for reduced motion. Server-rendered content is never hidden unless this can run, and content streamed in later
 * (Suspense) is picked up as it arrives.
 */
export function MotionProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const first = useRef(true);

  useEffect(() => {
    if (!motionOn()) return;
    lenis = new Lenis({ autoRaf: false, anchors: true, prevent: scrollsOnItsOwn });
    const tick = (time: number) => lenis?.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);
    return () => {
      gsap.ticker.remove(tick);
      lenis?.destroy();
      lenis = null;
    };
  }, []);

  useEffect(() => {
    if (!motionOn()) return;
    const show = (el: HTMLElement, delay: number) => {
      el.setAttribute('data-revealed', '');
      gsap.fromTo(el, FROM[el.dataset.reveal ?? ''] ?? FROM['']!, { opacity: 1, y: 0, scale: 1, duration: 0.6, delay, ease: 'power2.out', clearProps: 'opacity,transform' });
    };
    const io = new IntersectionObserver(
      (entries) => {
        let order = 0;
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const el = entry.target as HTMLElement;
          io.unobserve(el);
          // Several at once come in one after another; a group's children follow each other.
          const delay = Math.min(order++ * 0.06, 0.3);
          if (el.hasAttribute('data-reveal-stagger')) {
            [...el.children].forEach((child, i) => show(child as HTMLElement, delay + Math.min(i * 0.05, 0.4)));
          } else {
            show(el, delay);
          }
        }
      },
      { rootMargin: '0px 0px -6% 0px' },
    );
    const watch = (root: ParentNode) =>
      root.querySelectorAll<HTMLElement>('[data-reveal]:not([data-revealed]), [data-reveal-stagger]').forEach((el) => io.observe(el));
    watch(document);
    const mo = new MutationObserver((records) => {
      for (const r of records) r.addedNodes.forEach((n) => n instanceof HTMLElement && (n.matches('[data-reveal], [data-reveal-stagger]') ? io.observe(n) : watch(n)));
    });
    mo.observe(document.body, { childList: true, subtree: true });
    return () => {
      io.disconnect();
      mo.disconnect();
    };
  }, []);

  // A short fade between pages, before the new page is painted (never on the first load, which is server-rendered).
  useLayoutEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (!motionOn()) return;
    const content = document.querySelector<HTMLElement>('main > div') ?? document.querySelector<HTMLElement>('main');
    if (content) gsap.fromTo(content, { opacity: 0, y: 6 }, { opacity: 1, y: 0, duration: 0.32, ease: 'power2.out', clearProps: 'opacity,transform' });
    lenis?.resize();
  }, [pathname]);

  return children;
}

/**
 * Marks the page as able to animate before it is painted, so revealed elements start hidden instead of flashing.
 * Without JavaScript, or with reduced motion asked for, nothing is ever hidden.
 */
export function MotionScript() {
  return (
    <script
      // A fixed, tiny script of our own: no user content.
      dangerouslySetInnerHTML={{
        __html: "try{if(!matchMedia('(prefers-reduced-motion: reduce)').matches)document.documentElement.classList.add('motion')}catch(e){}",
      }}
    />
  );
}
