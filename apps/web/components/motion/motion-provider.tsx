'use client';

import { Suspense, useEffect, type ReactNode } from 'react';
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
 * Smooth scrolling (Lenis, driven by GSAP's ticker) (off when the visitor asks for reduced motion). Pages are not
 * faded on navigation: a page that is ready shows at once, and its loading parts fade in on their own (Pending). Revealing on scroll is pure CSS (scroll-driven animations, see globals.css), so nothing here
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
        <NavProgress />
      </Suspense>
    </>
  );
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
