'use client';

import { useEffect, useState } from 'react';
import { Icon } from '@/components/ui/icon';
import { format, type Dictionary } from '@/lib/i18n/locale';
import { SheetCrop } from './sheet-crop';

type T = Dictionary['site']['highlights'];
const ROTATE_MS = 5000;
// Which Rimau each slide shows from the sheet: magnifying glass, laptop, compass.
const POSE = [
  { col: 1, row: 0 },
  { col: 0, row: 0 },
  { col: 2, row: 0 },
] as const;

/**
 * The navy highlights carousel: arrows, dots, and a turn every five seconds that stops while the pointer or focus is
 * inside, when the reader pauses it, or when they prefer reduced motion.
 */
export function Highlights({ t }: { t: T }) {
  const count = t.items.length;
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [hover, setHover] = useState(false);
  const [still, setStill] = useState(true);

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setStill(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    if (paused || hover || still) return;
    const id = window.setTimeout(() => setIndex((i) => (i + 1) % count), ROTATE_MS);
    return () => window.clearTimeout(id);
  }, [index, paused, hover, still, count]);

  const go = (i: number) => setIndex((i + count) % count);
  const item = t.items[index]!;
  const pose = POSE[index]!;

  return (
    <section
      aria-roledescription="carousel"
      aria-label={t.label}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onFocus={() => setHover(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setHover(false);
      }}
      className="grid grid-cols-[minmax(0,1fr)] items-center gap-8 overflow-hidden rounded-[36px] bg-navy px-6 py-10 sm:px-12 lg:min-h-[520px] lg:grid-cols-[minmax(0,1fr)_540px] lg:gap-10 lg:py-14 lg:pl-16 lg:pr-12"
    >
      <div aria-live={paused || still ? 'polite' : 'off'} className="flex flex-col items-start gap-5">
        <p className="text-sm font-semibold text-yellow">
          {String(index + 1).padStart(2, '0')} / {String(count).padStart(2, '0')}
        </p>
        <h2 className="text-[32px] font-bold leading-[1.1] tracking-[-0.02em] text-white lg:text-[44px]">{item.title}</h2>
        <p className="text-[17px] text-[#c9d3e3] lg:text-[18px]">{item.body}</p>
        <div className="flex items-center gap-3 pt-4">
          <button type="button" onClick={() => go(index - 1)} aria-label={t.previous} className="grid size-[52px] place-items-center rounded-full bg-white/[0.12] hover:bg-white/20">
            <Icon src="/icons/arrow-right-white.svg" size={20} className="rotate-180" />
          </button>
          <button type="button" onClick={() => go(index + 1)} aria-label={t.next} className="grid size-[52px] place-items-center rounded-full bg-white hover:bg-white/90">
            <Icon src="/icons/arrow-right.svg" size={20} />
          </button>
          <div className="flex items-center gap-2 pl-3">
            {t.items.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => go(i)}
                aria-label={format(t.goTo, { n: i + 1 })}
                aria-current={i === index ? 'true' : undefined}
                className={`h-2.5 rounded-[5px] transition-all ${i === index ? 'w-8 bg-yellow' : 'w-2.5 bg-white/35 hover:bg-white/60'}`}
              />
            ))}
          </div>
          {!still && (
            <button type="button" onClick={() => setPaused((p) => !p)} aria-label={paused ? t.play : t.pause} className="ml-1 grid size-10 place-items-center rounded-full text-white/70 hover:bg-white/10 hover:text-white">
              <svg aria-hidden width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                {paused ? <path d="M4 2.5v11l9-5.5z" /> : <path d="M4 2.5h3v11H4zM9 2.5h3v11H9z" />}
              </svg>
            </button>
          )}
        </div>
      </div>
      <div aria-hidden className="relative h-[340px] sm:h-[408px]">
        <div className="absolute left-0 top-6 flex w-[min(360px,100%)] flex-col gap-3 rounded-[22px] bg-white px-[22px] py-5 shadow-[0_24px_50px_rgba(5,15,36,0.35)] sm:top-[70px]">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[13px] font-medium text-muted">{item.card.head}</p>
            <span className="rounded-full bg-bg px-2 py-0.5 text-[11px] font-semibold text-muted">{t.sample}</span>
          </div>
          <Card index={index} t={t} />
        </div>
        <SheetCrop sheet="detective" col={pose.col} row={pose.row} size={300} className="absolute right-[-40px] top-[110px] hidden sm:block lg:left-[250px] lg:right-auto" />
      </div>
    </section>
  );
}

function Card({ index, t }: { index: number; t: T }) {
  const c = t.items[index]!.card;
  if ('line' in c && c.line) {
    return (
      <>
        <div className="flex items-center gap-2.5 rounded-[10px] bg-bg px-3 py-2.5">
          <p className="flex-1 text-[15px] font-semibold">{c.line}</p>
          <Status text={c.status ?? ''} />
        </div>
        <p className="rounded-[10px] bg-cream px-3 py-2.5 text-[13px] font-medium">{c.quote}</p>
        <p className="text-[12px] font-semibold text-[#2f5bd3]">{c.source}</p>
      </>
    );
  }
  if ('steps' in c && c.steps) {
    return (
      <ol className="flex flex-col gap-2">
        {c.steps.map((s, i) => (
          <li key={s} className={`flex items-center gap-2.5 rounded-[10px] px-3 py-2.5 text-[14px] font-semibold ${i === c.steps!.length - 1 ? 'bg-mint' : 'bg-bg'}`}>
            <span className="grid size-6 shrink-0 place-items-center rounded-full bg-navy text-[12px] text-white">{i + 1}</span>
            {s}
          </li>
        ))}
      </ol>
    );
  }
  return (
    <>
      {('rows' in c && c.rows ? c.rows : []).map(([label, value]) => (
        <div key={label} className="flex items-center justify-between rounded-[10px] bg-bg px-3 py-2.5">
          <p className="text-[14px] text-muted">{label}</p>
          <p className="text-[18px] font-bold">{value}</p>
        </div>
      ))}
      <span className="self-start rounded-full bg-cream px-2.5 py-1 text-[12px] font-semibold text-[#6b4f00]">{'status' in c ? c.status : ''}</span>
    </>
  );
}

function Status({ text }: { text: string }) {
  return (
    <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-mint px-2.5 py-1 text-[12px] font-semibold text-[#187a60]">
      <span className="size-1.5 rounded-full bg-current" />
      {text}
    </span>
  );
}
