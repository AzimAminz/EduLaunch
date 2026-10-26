'use client';

import { useEffect, useState } from 'react';

const VISIBLE_MS = 4000;
const FADE_MS = 300;

/**
 * A short confirmation ("Saved") that fades in, stays a few seconds and fades out.
 * `showKey` changes on every save (a timestamp), so saving twice shows it twice.
 * With "reduce motion" on, it appears and disappears without moving.
 */
export function Notice({ showKey, children, className = '' }: { showKey: number | undefined; children: string; className?: string }) {
  const [phase, setPhase] = useState<'hidden' | 'shown' | 'leaving'>('hidden');
  const [seenKey, setSeenKey] = useState(showKey);
  if (showKey !== seenKey) {
    setSeenKey(showKey);
    setPhase(showKey ? 'shown' : 'hidden');
  }

  useEffect(() => {
    if (phase === 'shown') {
      const timer = setTimeout(() => setPhase('leaving'), VISIBLE_MS);
      return () => clearTimeout(timer);
    }
    if (phase === 'leaving') {
      const timer = setTimeout(() => setPhase('hidden'), FADE_MS);
      return () => clearTimeout(timer);
    }
  }, [phase]);

  return (
    <p role="status" aria-live="polite" className={`min-h-5 ${className}`}>
      {phase !== 'hidden' && (
        <span key={showKey} className={`inline-flex items-center gap-1.5 text-sm font-medium text-[#2e7d57] ${phase === 'leaving' ? 'animate-notice-out' : 'animate-notice-in'}`}>
          <span aria-hidden>✓</span>
          {children}
        </span>
      )}
    </p>
  );
}
