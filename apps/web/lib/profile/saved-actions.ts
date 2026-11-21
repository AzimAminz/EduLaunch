'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { isLocale } from '../i18n/locale';
import { getAccessToken } from '../supabase/server';
import { ProfileRequestError, saveProgramme, unsaveProgramme } from './api';

export type SaveResult = { ok: true; saved: boolean } | { ok: false; error: 'limit' | 'generic' };

/** Saves or unsaves a programme for the signed-in student. */
export async function setProgrammeSaved(locale: string, programId: string, saved: boolean): Promise<SaveResult> {
  if (!z.uuid().safeParse(programId).success) return { ok: false, error: 'generic' };
  const token = await getAccessToken();
  if (!token) redirect(`/${isLocale(locale) ? locale : 'ms'}/log-masuk`);
  try {
    const result = saved ? await saveProgramme(token, programId) : await unsaveProgramme(token, programId);
    // The home page and Pilihan disimpan show the saved list.
    revalidatePath('/[lang]/utama', 'page');
    revalidatePath('/[lang]/simpanan', 'page');
    return { ok: true, saved: result.saved };
  } catch (e) {
    return { ok: false, error: e instanceof ProfileRequestError && e.code === 'too_many_saved' ? 'limit' : 'generic' };
  }
}
