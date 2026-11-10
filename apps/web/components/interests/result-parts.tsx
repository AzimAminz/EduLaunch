'use client';

import { useState, useTransition } from 'react';
import { Modal } from '@/components/ui/modal';
import { format, type Dictionary, type Locale } from '@/lib/i18n/locale';
import { retakeInterestTest } from '@/lib/interests/actions';

type T = Dictionary['interest']['result'];

/** "Jawab semula", after asking: the answers are cleared, the result stays until the new one is worked out. */
export function RetakeButton({ locale, t, takenOn }: { locale: Locale; t: T; takenOn: string | null }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const confirm = () =>
    start(async () => {
      const form = new FormData();
      form.set('locale', locale);
      await retakeInterestTest(form);
    });
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="h-11 rounded-[12px] border border-line bg-white px-5 text-sm font-semibold transition-colors hover:bg-bg">
        {t.retake}
      </button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        busy={pending}
        alert
        tone="warn"
        title={t.retakeTitle}
        description={takenOn ? format(t.retakeBody, { date: takenOn }) : t.retakeBodyNoDate}
        footer={
          <>
            <button type="button" onClick={() => setOpen(false)} disabled={pending} className="h-11 rounded-[12px] border border-line bg-white px-5 text-sm font-semibold hover:bg-bg">
              {t.retakeCancel}
            </button>
            <button type="button" onClick={confirm} disabled={pending} className="h-11 rounded-[12px] bg-navy px-5 text-sm font-semibold text-white hover:bg-navy/90 disabled:opacity-60">
              {pending ? t.retakeStarting : t.retakeConfirm}
            </button>
          </>
        }
      />
    </>
  );
}

/** A short burst of confetti when a result has just been worked out: 18 small pieces, transform and opacity only. */
export function Confetti() {
  const colours = ['#ffd84d', '#2f7d8c', '#c2413b', '#23825a', '#2f5bd3', '#b45a17'];
  return (
    <div aria-hidden className="pointer-events-none absolute left-1/2 top-10 z-10">
      {Array.from({ length: 18 }, (_, i) => {
        const angle = (i / 18) * Math.PI * 2;
        const distance = 90 + (i % 3) * 40;
        return (
          <span
            key={i}
            className="quiz-confetti absolute block h-2.5 w-1.5 rounded-sm"
            style={
              {
                background: colours[i % colours.length],
                '--dx': `${Math.round(Math.cos(angle) * distance)}px`,
                '--dy': `${Math.round(Math.sin(angle) * distance + 40)}px`,
                '--rot': `${(i % 2 ? 1 : -1) * (180 + i * 20)}deg`,
                animationDelay: `${(i % 4) * 30}ms`,
              } as React.CSSProperties
            }
          />
        );
      })}
    </div>
  );
}
