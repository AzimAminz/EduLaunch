'use client';

import { useFormStatus } from 'react-dom';

/** "Kira semula" in the "worked out from" bar; shows that it is working and cannot be pressed twice. */
export function RefreshButton({ label, busyLabel }: { label: string; busyLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending || undefined}
      className="rounded-full border border-line px-3 py-1.5 text-[13px] font-semibold text-navy hover:bg-bg disabled:cursor-wait disabled:opacity-70"
    >
      {pending ? busyLabel : label}
    </button>
  );
}
