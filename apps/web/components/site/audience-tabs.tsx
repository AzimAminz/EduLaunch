'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRef, useState, type KeyboardEvent } from 'react';
import { Icon } from '@/components/ui/icon';
import type { Dictionary } from '@/lib/i18n/locale';

const KEYS = ['before', 'results', 'higher'] as const;
type Key = (typeof KEYS)[number];

const VISUAL: Record<Key, { bg: string; img: string; tag: string }> = {
  before: { bg: 'bg-cream', img: '/illustrations/rimau-calculator.png', tag: 'bg-mint text-[#187a60]' },
  results: { bg: 'bg-mint', img: '/illustrations/rimau-compass.png', tag: 'bg-mint text-[#187a60]' },
  higher: { bg: 'bg-blue', img: '/landing/rimau-roadmap.png', tag: 'bg-blue text-navy' },
};

/** "One platform, three starting points": tabs (arrow keys move between them) for before SPM, with results, and pre-U/Diploma. */
export function AudienceTabs({ t, signInHref }: { t: Dictionary['site']['audiences']; signInHref: string }) {
  const [current, setCurrent] = useState<Key>('before');
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const c = t[current];
  const v = VISUAL[current];

  const onKey = (e: KeyboardEvent, i: number) => {
    const step = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    const next = (i + step + KEYS.length) % KEYS.length;
    setCurrent(KEYS[next]!);
    tabs.current[next]?.focus();
  };

  return (
    <div className="flex w-full flex-col gap-6 lg:gap-8">
      <div role="tablist" aria-label={t.tabsLabel} className="flex max-w-full gap-1 self-start overflow-x-auto rounded-full bg-white p-1.5 shadow-[0_4px_16px_rgba(20,38,71,0.08)]">
        {KEYS.map((k, i) => (
          <button
            key={k}
            ref={(el) => {
              tabs.current[i] = el;
            }}
            role="tab"
            id={`tab-${k}`}
            aria-selected={k === current}
            aria-controls="panel-situasi"
            tabIndex={k === current ? 0 : -1}
            onClick={() => setCurrent(k)}
            onKeyDown={(e) => onKey(e, i)}
            className={`shrink-0 rounded-full px-3 py-2.5 text-[14px] transition-colors sm:px-[22px] sm:py-3 sm:text-[15px] ${k === current ? 'bg-navy font-semibold text-white' : 'font-medium text-navy hover:bg-bg'}`}
          >
            {t[k].tab}
          </button>
        ))}
      </div>
      <div
        role="tabpanel"
        id="panel-situasi"
        aria-labelledby={`tab-${current}`}
        className="grid grid-cols-[minmax(0,1fr)] items-center gap-10 rounded-[32px] bg-white p-6 sm:p-10 lg:grid-cols-[minmax(0,1fr)_460px] lg:gap-12 lg:py-12 lg:pl-14 lg:pr-12"
      >
        <div className="flex flex-col items-start gap-[18px]">
          <h3 className="text-[28px] font-bold leading-[1.15] tracking-[-0.02em] lg:text-[36px]">{c.title}</h3>
          <p className="text-[17px] text-muted lg:text-[18px]">{c.body}</p>
          <ul className="flex flex-col gap-3 pb-2 pt-1">
            {c.points.map((p) => (
              <li key={p} className="flex items-center gap-3 text-base font-medium">
                <span aria-hidden className="grid size-[26px] shrink-0 place-items-center rounded-full bg-yellow">
                  <Icon src="/icons/check-navy.svg" size={14} />
                </span>
                {p}
              </li>
            ))}
          </ul>
          <Link href={signInHref} className="inline-flex items-center gap-2 rounded-full bg-yellow px-6 py-3.5 text-base font-semibold text-navy hover:bg-yellow/90">
            {t.cta}
            <Icon src="/icons/arrow-right.svg" size={18} />
          </Link>
        </div>
        <div aria-hidden className={`relative mx-auto h-[320px] w-full max-w-[460px] rounded-[28px] sm:h-[400px] ${v.bg}`}>
          <Image src={v.img} alt="" width={330} height={330} className="absolute bottom-[10px] right-0 size-[240px] object-contain sm:right-[-20px] sm:top-[60px] sm:size-[330px]" />
          <div className="absolute left-3 top-[150px] flex flex-col gap-2.5 rounded-[18px] bg-white px-[18px] py-4 shadow-[0_16px_40px_rgba(20,38,71,0.16)] sm:left-[-24px] sm:top-[230px]">
            <p className="text-[12px] font-medium text-muted">{c.cardLabel}</p>
            <p className="text-[26px] font-bold leading-tight sm:text-[34px]">{c.cardValue}</p>
            <span className={`inline-flex items-center gap-1.5 self-start rounded-full px-2.5 py-1 text-[12px] font-semibold ${v.tag}`}>
              <span className="size-1.5 rounded-full bg-current" />
              {c.cardTag}
            </span>
            <p className="text-[11px] text-muted">{c.cardNote}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
