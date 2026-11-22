'use server';

import { z } from 'zod';
import { getAccessToken } from '../supabase/server';
import type { SlipRow } from './slip';

const GATEWAY_URL = process.env.GATEWAY_URL ?? 'http://127.0.0.1:4000';
const TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
/** After the browser shrinks a photo, a slip is well under this. */
const MAX_BYTES = 3.5 * 1024 * 1024;

const Reading = z.object({
  source: z.enum(['text', 'ocr']),
  examYear: z.number().int().nullable(),
  rows: z.array(z.object({ code: z.string(), name: z.string(), grade: z.string().nullable(), confidence: z.number() })).max(40),
});

export type SlipResult = { ok: true; source: 'text' | 'ocr'; examYear: number | null; rows: SlipRow[] } | { ok: false; error: 'type' | 'size' | 'busy' | 'unreadable' | 'none' | 'generic' };

/**
 * Sends a result slip to be read on our own server (the content service) and returns the rows for the form. The file
 * is not stored anywhere: it is read for this request only, and the student checks every row before saving.
 */
export async function readSlip(form: FormData): Promise<SlipResult> {
  const file = form.get('slip');
  if (!(file instanceof File) || file.size === 0) return { ok: false, error: 'generic' };
  if (!TYPES.includes(file.type)) return { ok: false, error: 'type' };
  if (file.size > MAX_BYTES) return { ok: false, error: 'size' };
  const token = await getAccessToken();
  if (!token) return { ok: false, error: 'generic' };
  let res: Response;
  try {
    res = await fetch(`${GATEWAY_URL}/api/content/slips/read`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
      body: JSON.stringify({ mime: file.type, data: Buffer.from(await file.arrayBuffer()).toString('base64') }),
      cache: 'no-store',
    });
  } catch {
    return { ok: false, error: 'generic' };
  }
  if (res.status === 429) return { ok: false, error: 'busy' };
  if (res.status === 413) return { ok: false, error: 'size' };
  if (res.status === 422) return { ok: false, error: 'unreadable' };
  if (!res.ok) return { ok: false, error: 'generic' };
  const parsed = Reading.safeParse(await res.json().catch(() => null));
  if (!parsed.success) return { ok: false, error: 'generic' };
  if (parsed.data.rows.length === 0) return { ok: false, error: 'none' };
  return { ok: true, ...parsed.data };
}
