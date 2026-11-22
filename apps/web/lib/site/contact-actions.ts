'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { EngagementError, markContactHandled, sendContactMessage } from '../engagement/api';
import { getAccessToken } from '../supabase/server';

export interface ContactFormState {
  sentAt?: number;
  error?: 'invalid' | 'tooMany' | 'busy' | 'generic';
}

const Body = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.email().max(200),
  category: z.enum(['usage', 'data', 'privacy', 'other']),
  message: z.string().trim().min(10).max(2000),
  website: z.string().max(200),
});

/** The public contact form: no account needed; the engagement service limits how often it can be used. */
export async function sendContact(_prev: ContactFormState, form: FormData): Promise<ContactFormState> {
  const parsed = Body.safeParse({
    name: form.get('name') ?? '',
    email: String(form.get('email') ?? '').trim(),
    category: form.get('category') ?? '',
    message: form.get('message') ?? '',
    website: form.get('website') ?? '',
  });
  if (!parsed.success) return { error: 'invalid' };
  try {
    await sendContactMessage(parsed.data);
  } catch (e) {
    const code = e instanceof EngagementError ? e.code : undefined;
    return { error: code === 'too_many_messages' ? 'tooMany' : code === 'contact_busy' ? 'busy' : code === 'invalid_input' ? 'invalid' : 'generic' };
  }
  return { sentAt: Date.now() };
}

export interface HandledState {
  doneAt?: number;
  error?: 'taken' | 'generic';
}

/** An admin marks a contact message as handled after replying to it by e-mail. */
export async function markHandled(_prev: HandledState, form: FormData): Promise<HandledState> {
  const id = z.uuid().safeParse(form.get('id'));
  const token = await getAccessToken();
  if (!id.success || !token) return { error: 'generic' };
  try {
    await markContactHandled(token, id.data);
  } catch (e) {
    return { error: e instanceof EngagementError && e.code === 'already_handled' ? 'taken' : 'generic' };
  }
  revalidatePath('/[lang]/admin/sokongan', 'page');
  return { doneAt: Date.now() };
}
