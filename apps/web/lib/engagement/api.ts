import 'server-only';
import { z } from 'zod';

const GATEWAY_URL = process.env.GATEWAY_URL ?? 'http://127.0.0.1:4000';

/** A notice for the student. `type` decides the wording (in the page language); `message` is the stored English text. */
const Notification = z.object({
  id: z.uuid(),
  programId: z.uuid().nullable(),
  type: z.string(),
  message: z.string(),
  readAt: z.coerce.date().nullable(),
  createdAt: z.coerce.date(),
});
export type Notification = z.infer<typeof Notification>;

async function call<T extends z.ZodType>(token: string, path: string, schema: T, init: RequestInit = {}): Promise<z.infer<T>> {
  const res = await fetch(`${GATEWAY_URL}/api/engagement${path}`, {
    ...init,
    headers: { accept: 'application/json', authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`Engagement request failed (${res.status}) for ${path}`);
  return schema.parse(await res.json());
}

/** The student's latest notices (up to 50), newest first. */
export const listNotifications = (token: string) => call(token, '/me/notifications', z.array(Notification));
export const markNotificationRead = (token: string, id: string) => call(token, `/me/notifications/${encodeURIComponent(id)}/read`, z.object({ ok: z.boolean() }), { method: 'POST' });
