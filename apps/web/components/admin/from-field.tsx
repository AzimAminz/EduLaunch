'use client';

import { useSearchParams } from 'next/navigation';

/**
 * Sends the page's `dari` (the list the admin came from) with a form, so the page the action opens next keeps
 * the same way back. The action checks it before using it.
 */
export function FromField() {
  const from = useSearchParams().get('dari');
  return from ? <input type="hidden" name="dari" value={from} /> : null;
}
