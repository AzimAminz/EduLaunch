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
export const unreadNotificationCount = (token: string) => call(token, '/me/notifications/unread-count', z.object({ count: z.number() }));
export const markAllNotificationsRead = (token: string) => call(token, '/me/notifications/read-all', z.object({ ok: z.boolean() }), { method: 'POST' });
export const markNotificationRead = (token: string, id: string) => call(token, `/me/notifications/${encodeURIComponent(id)}/read`, z.object({ ok: z.boolean() }), { method: 'POST' });

/** A question a student sent to the EduLaunch team, and the answer once an admin closes it. */
const Ticket = z.object({
  id: z.uuid(),
  userId: z.uuid(),
  category: z.enum(['wrong_data', 'account', 'other']),
  programId: z.uuid().nullable(),
  message: z.string(),
  assignedAdminId: z.uuid().nullable(),
  adminReply: z.string().nullable(),
  status: z.enum(['open', 'in_progress', 'closed']),
  closedAt: z.coerce.date().nullable(),
  createdAt: z.coerce.date().optional(),
});
export type Ticket = z.infer<typeof Ticket>;
export type TicketCategory = Ticket['category'];

/** A refused request with the service's error code (e.g. too_many_open). */
export class EngagementError extends Error {
  constructor(
    readonly status: number,
    readonly code: string | undefined,
  ) {
    super(`Engagement request failed (${status}${code ? `, ${code}` : ''})`);
  }
}

async function send<T extends z.ZodType>(token: string, path: string, schema: T, body?: unknown): Promise<z.infer<T>> {
  const res = await fetch(`${GATEWAY_URL}/api/engagement${path}`, {
    method: 'POST',
    headers: { accept: 'application/json', 'content-type': 'application/json', authorization: `Bearer ${token}` },
    body: JSON.stringify(body ?? {}),
    cache: 'no-store',
  });
  if (!res.ok) {
    const code = await res
      .json()
      .then((b: { code?: unknown }) => (typeof b.code === 'string' ? b.code : undefined))
      .catch(() => undefined);
    throw new EngagementError(res.status, code);
  }
  return schema.parse(await res.json());
}

export const openTicket = (token: string, body: { category: TicketCategory; programId: string | null; message: string }) => send(token, '/tickets', Ticket, body);
export const myTickets = (token: string) => call(token, '/tickets/mine', z.array(Ticket));
/** Admin: questions still open (oldest first) and those answered in the last 30 days. */
export const ticketQueue = (token: string) => call(token, '/tickets/queue', z.array(Ticket));
export const closedTickets = (token: string) => call(token, '/tickets/closed', z.array(Ticket));
export const claimTicket = (token: string, id: string) => send(token, `/tickets/${encodeURIComponent(id)}/claim`, Ticket);
export const closeTicket = (token: string, id: string, reply: string) => send(token, `/tickets/${encodeURIComponent(id)}/close`, Ticket, { reply });
