'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { getAccessToken } from '../supabase/server';
import { claimTicket, closeTicket, EngagementError, openTicket } from './api';

export interface TicketFormState {
  sentAt?: number;
  error?: 'short' | 'programme' | 'tooMany' | 'generic';
}

const Open = z.object({
  category: z.enum(['wrong_data', 'account', 'other']),
  programId: z.union([z.uuid(), z.literal('')]).transform((v) => v || null),
  message: z.string().trim().max(2000),
});

/** A student's question to the EduLaunch team. */
export async function sendQuestion(_prev: TicketFormState, form: FormData): Promise<TicketFormState> {
  const parsed = Open.safeParse({ category: form.get('category'), programId: form.get('programId') ?? '', message: form.get('message') ?? '' });
  if (!parsed.success) return { error: 'generic' };
  if (parsed.data.message.length < 10) return { error: 'short' };
  if (parsed.data.category === 'wrong_data' && !parsed.data.programId) return { error: 'programme' };
  const token = await getAccessToken();
  if (!token) return { error: 'generic' };
  try {
    await openTicket(token, parsed.data);
  } catch (e) {
    return { error: e instanceof EngagementError && e.code === 'too_many_open' ? 'tooMany' : 'generic' };
  }
  revalidatePath('/[lang]/bantuan', 'page');
  return { sentAt: Date.now() };
}

export interface AdminTicketState {
  doneAt?: number;
  error?: 'short' | 'taken' | 'generic';
}

/** Admin: take a question, so others know it is being handled. */
export async function takeQuestion(id: string): Promise<{ ok: boolean }> {
  if (!z.uuid().safeParse(id).success) return { ok: false };
  const token = await getAccessToken();
  if (!token) return { ok: false };
  try {
    await claimTicket(token, id);
  } catch {
    return { ok: false };
  }
  revalidatePath('/[lang]/admin', 'layout');
  return { ok: true };
}

/** Admin: answer a question and close it; the student is notified. */
export async function answerQuestion(_prev: AdminTicketState, form: FormData): Promise<AdminTicketState> {
  const id = String(form.get('id') ?? '');
  const reply = String(form.get('reply') ?? '').trim();
  if (!z.uuid().safeParse(id).success) return { error: 'generic' };
  if (reply.length < 5) return { error: 'short' };
  const token = await getAccessToken();
  if (!token) return { error: 'generic' };
  try {
    await closeTicket(token, id, reply.slice(0, 2000));
  } catch (e) {
    return { error: e instanceof EngagementError && e.code === 'forbidden' ? 'taken' : 'generic' };
  }
  revalidatePath('/[lang]/admin', 'layout');
  return { doneAt: Date.now() };
}
