'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { AdminIcon } from './icons';

/**
 * One filter of a list (institution, status) as a plain select: choosing an option opens that address. Each option
 * carries its own address, already built by the page, so the list's other filters and sort are kept.
 */
export function FilterSelect({ label, value, options }: { label: string; value: string; options: Array<{ value: string; label: string; href: string }> }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <label className="relative flex min-w-0 items-center">
      <span className="sr-only">{label}</span>
      <select
        value={value}
        aria-busy={pending || undefined}
        onChange={(e) => {
          const next = options.find((o) => o.value === e.target.value);
          if (next) start(() => router.push(next.href));
        }}
        className={`h-9 min-w-0 appearance-none rounded-[6px] border border-[#d1d5db] bg-white py-0 pl-3 pr-8 text-sm text-navy outline-none transition-colors hover:border-navy/40 focus-visible:border-navy focus-visible:ring-2 focus-visible:ring-navy/15 ${
          value ? 'font-semibold' : ''
        }`}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <AdminIcon name="chevronDown" size={14} className="pointer-events-none absolute right-2.5 text-muted" />
    </label>
  );
}
