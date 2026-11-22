'use client';

import { useState, useTransition } from 'react';
import type { Dictionary, Locale } from '@/lib/i18n/locale';
import { setProgrammeSaved } from '@/lib/profile/saved-actions';

type T = Dictionary['saved']['button'];

/**
 * Saves or unsaves a programme. The button changes at once and goes back if the save fails, with the reason in a
 * small line under it. Saved programmes are followed: the student is told when their requirements change.
 */
export function SaveButton({ locale, programId, initialSaved, t, tone = 'light', className = '' }: { locale: Locale; programId: string; initialSaved: boolean; t: T; tone?: 'light' | 'outline' | 'dark' | 'icon'; className?: string }) {
  const [saved, setSaved] = useState(initialSaved);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const toggle = () => {
    const next = !saved;
    setSaved(next);
    setError(null);
    start(async () => {
      const result = await setProgrammeSaved(locale, programId, next);
      if (!result.ok) {
        setSaved(!next);
        setError(result.error === 'limit' ? t.limit : t.error);
      }
    });
  };
  const icon = tone === 'icon';
  const look =
    icon
      ? saved
        ? 'bg-navy text-white'
        : 'bg-white/90 text-navy ring-1 ring-line hover:bg-blue'
      : tone === 'dark'
      ? saved
        ? 'bg-yellow text-navy'
        : 'bg-white/10 text-white hover:bg-white/20'
      : tone === 'outline'
        ? saved
          ? 'border border-navy bg-navy text-white'
          : 'border border-line bg-white hover:bg-bg'
        : saved
          ? 'bg-navy text-white'
          : 'bg-bg hover:bg-blue';
  return (
    <span className={`relative z-10 inline-flex flex-col ${className}`}>
      <button
        type="button"
        onClick={toggle}
        aria-pressed={saved}
        aria-busy={pending || undefined}
        aria-label={icon ? (saved ? t.saved : t.save) : undefined}
        title={icon ? (saved ? t.saved : t.save) : undefined}
        className={`inline-flex h-11 items-center justify-center gap-2 text-sm font-semibold transition-colors ${icon ? 'w-11 rounded-full' : 'rounded-[12px] px-4'} ${look}`}
      >
        <svg aria-hidden width="16" height="16" viewBox="0 0 24 24" fill={saved ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinejoin="round">
          <path d="M6 3h12v18l-6-4-6 4z" />
        </svg>
        {!icon && (saved ? t.saved : t.save)}
      </button>
      {error && (
        <span role="alert" className={`mt-1 text-[12px] text-[#b33a35] ${icon ? 'absolute right-0 top-full w-48 rounded-[8px] bg-white p-2 shadow-lg' : ''}`}>
          {error}
        </span>
      )}
    </span>
  );
}
