'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { getAccessToken } from '../supabase/server';
import { markAllNotificationsRead, markNotificationRead } from './api';

/** Marks one notice read (opening it, or "mark as read"); quietly does nothing if it cannot. */
export async function readNotification(id: string): Promise<void> {
  if (!z.uuid().safeParse(id).success) return;
  const token = await getAccessToken();
  if (!token) return;
  await markNotificationRead(token, id).catch(() => null);
  // The menu badge and the home page count unread notices.
  revalidatePath('/[lang]', 'layout');
}

export async function readAllNotifications(): Promise<{ ok: boolean }> {
  const token = await getAccessToken();
  if (!token) return { ok: false };
  try {
    await markAllNotificationsRead(token);
  } catch {
    return { ok: false };
  }
  revalidatePath('/[lang]', 'layout');
  return { ok: true };
}
