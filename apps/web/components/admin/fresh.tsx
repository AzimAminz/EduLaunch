'use client';

import { useRouter } from 'next/navigation';
import { Fragment, type ReactNode } from 'react';

/**
 * Starts its children afresh on every new visit (a link or redirect), while the browser's back and forward buttons
 * still return to what the admin left. A second "add programme" never starts with the first one's values, and an edit
 * page opened again starts from what is stored, not from what was typed and discarded. Edit forms are also keyed on
 * the record's data, so a save made elsewhere shows too.
 */
export function FreshOnNavigate({ children }: { children: ReactNode }) {
  const { bfcacheId } = useRouter();
  return <Fragment key={bfcacheId}>{children}</Fragment>;
}
