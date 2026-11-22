'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { readAllNotifications, readNotification } from '@/lib/engagement/actions';

/** "View programme": marks the notice read, then opens the programme. */
export function OpenNotice({ id, href, unread, label }: { id: string; href: string; unread: boolean; label: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        start(async () => {
          if (unread) await readNotification(id);
          router.push(href);
        })
      }
      className="inline-flex h-10 items-center rounded-[10px] bg-navy px-4 text-sm font-semibold text-white hover:bg-navy/90 disabled:opacity-60"
    >
      {label} →
    </button>
  );
}

export function MarkRead({ id, label }: { id: string; label: string }) {
  const [pending, start] = useTransition();
  return (
    <button type="button" disabled={pending} onClick={() => start(() => readNotification(id))} className="inline-flex h-10 items-center rounded-[10px] px-3 text-sm font-semibold text-[#2f5bd3] hover:bg-blue disabled:opacity-60">
      {label}
    </button>
  );
}

export function MarkAllRead({ label, failed }: { label: string; failed: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState(false);
  return (
    <span className="inline-flex flex-col items-end gap-1">
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const { ok } = await readAllNotifications();
            setError(!ok);
          })
        }
        className="inline-flex h-11 items-center rounded-[12px] border border-line bg-white px-4 text-sm font-semibold hover:bg-bg disabled:opacity-60"
      >
        {label}
      </button>
      {error && (
        <span role="alert" className="text-[12px] text-[#b33a35]">
          {failed}
        </span>
      )}
    </span>
  );
}
