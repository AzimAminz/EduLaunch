'use client';

import { usePathname } from 'next/navigation';
import { Suspense, useEffect, useLayoutEffect, type ReactNode } from 'react';
import gsap from 'gsap';
import Lenis from 'lenis';
import { NavProgress } from './nav-progress';

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

/**
 * Smooth scrolling (Lenis, driven by GSAP's ticker) and a short fade between pages, both off when the visitor asks
 * for reduced motion. Revealing on scroll is pure CSS (scroll-driven animations, see globals.css), so nothing here
 * touches server-rendered elements before React has hydrated them.
 */
export function MotionProvider({ children }: { children: ReactNode }) {
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

  return (
    <>
      {children}
      {/* The current address is request data: read it inside Suspense (Cache Components), apart from the page. */}
      <Suspense fallback={null}>
        <PageFade />
        <NavProgress />
      </Suspense>
    </>
  );
}

let shownPath: string | null = null;

/**
 * A short fade of the page content after a navigation, before it is painted. Never on the first load (server
 * rendered, still hydrating) and never twice for one path (React runs effects twice in development).
 */
function PageFade() {
  const pathname = usePathname();
  useLayoutEffect(() => {
    const first = shownPath === null;
    const same = shownPath === pathname;
    shownPath = pathname;
    if (first || same || !motionOn()) return;
    const content = document.querySelector<HTMLElement>('main > div') ?? document.querySelector<HTMLElement>('main');
    if (content) gsap.fromTo(content, { opacity: 0, y: 6 }, { opacity: 1, y: 0, duration: 0.32, ease: 'power2.out', clearProps: 'all' });
    lenis?.resize();
  }, [pathname]);
  return null;
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
