'use client';

import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import gsap from 'gsap';
import { getLenis, motionOn } from '@/components/motion/motion-provider';

type Tone = 'neutral' | 'danger' | 'warn';

const TONE: Record<Tone, string> = {
  neutral: 'bg-blue text-navy',
  danger: 'bg-red/10 text-[#b33a35]',
  warn: 'bg-cream text-navy',
};

/**
 * A dialog over the page: the backdrop fades and blurs, the panel rises in (and out) with GSAP, Escape and the
 * backdrop close it, focus stays inside while open and goes back where it was after, and the page stops scrolling.
 * It renders nothing on the server (it only opens after an interaction), so it never affects the server render.
 */
export function Modal({ open, onClose, title, description, icon, tone = 'neutral', busy = false, alert = false, children, footer }: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  icon?: ReactNode;
  tone?: Tone;
  /** While true (something is being saved), Escape and the backdrop do not close it. */
  busy?: boolean;
  /** A confirmation that interrupts (role alertdialog). */
  alert?: boolean;
  children?: ReactNode;
  footer?: ReactNode;
}) {
  const [mounted, setMounted] = useState(open);
  if (open && !mounted) setMounted(true);
  const backdrop = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const returnTo = useRef<HTMLElement | null>(null);
  const id = useId();

  useLayoutEffect(() => {
    if (!mounted || !backdrop.current || !panel.current) return;
    const animate = motionOn();
    if (open) {
      returnTo.current = document.activeElement as HTMLElement | null;
      getLenis()?.stop();
      document.documentElement.style.overflow = 'hidden';
      if (animate) {
        gsap.fromTo(backdrop.current, { opacity: 0 }, { opacity: 1, duration: 0.2, ease: 'power1.out' });
        gsap.fromTo(panel.current, { opacity: 0, y: 16, scale: 0.97 }, { opacity: 1, y: 0, scale: 1, duration: 0.32, ease: 'back.out(1.6)' });
      }
      // The first field, or the element marked to take focus, else the panel itself.
      (panel.current.querySelector<HTMLElement>('[data-autofocus]') ?? panel.current.querySelector<HTMLElement>('input, textarea, select') ?? panel.current).focus();
      return;
    }
    const done = () => {
      getLenis()?.start();
      document.documentElement.style.overflow = '';
      returnTo.current?.focus?.();
      setMounted(false);
    };
    if (!animate) return void done();
    gsap.to(backdrop.current, { opacity: 0, duration: 0.16, ease: 'power1.in' });
    gsap.to(panel.current, { opacity: 0, y: 10, scale: 0.98, duration: 0.16, ease: 'power1.in', onComplete: done });
  }, [open, mounted]);

  // Escape closes; Tab stays inside the panel.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy) onClose();
      if (e.key !== 'Tab' || !panel.current) return;
      const focusable = [...panel.current.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])')];
      if (focusable.length === 0) return;
      const [firstEl, lastEl] = [focusable[0]!, focusable[focusable.length - 1]!];
      if (e.shiftKey && document.activeElement === firstEl) {
        e.preventDefault();
        lastEl.focus();
      } else if (!e.shiftKey && document.activeElement === lastEl) {
        e.preventDefault();
        firstEl.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, busy, onClose]);

  if (!mounted) return null;
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center" data-lenis-prevent>
      <div ref={backdrop} aria-hidden className="absolute inset-0 bg-navy/45 backdrop-blur-[3px]" onClick={() => !busy && onClose()} />
      <div
        ref={panel}
        role={alert ? 'alertdialog' : 'dialog'}
        aria-modal="true"
        aria-labelledby={`${id}-title`}
        aria-describedby={description ? `${id}-body` : undefined}
        tabIndex={-1}
        className="relative flex max-h-[calc(100vh-2rem)] w-full max-w-md flex-col gap-4 overflow-y-auto rounded-[20px] bg-white p-5 shadow-2xl outline-none sm:p-6"
      >
        <div className="flex items-start gap-3">
          {icon && <span className={`flex size-11 shrink-0 items-center justify-center rounded-full ${TONE[tone]}`}>{icon}</span>}
          <div className="flex min-w-0 flex-col gap-1">
            <h2 id={`${id}-title`} className="text-lg font-semibold leading-snug">
              {title}
            </h2>
            {description && (
              <div id={`${id}-body`} className="text-sm text-muted">
                {description}
              </div>
            )}
          </div>
        </div>
        {children}
        {footer && <div className="flex flex-wrap justify-end gap-2">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}
