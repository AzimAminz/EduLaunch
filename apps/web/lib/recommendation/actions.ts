'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { isLocale } from '../i18n/locale';
import { getAccessToken } from '../supabase/server';
import { refreshRecommendations } from './api';

/** "Kira semula": works the student's list out again now (new programmes, changed requirements). */
export async function recalculateRecommendations(form: FormData): Promise<void> {
  const locale = String(form.get('locale'));
  const lang = isLocale(locale) ? locale : 'ms';
  const token = await getAccessToken();
  if (!token) redirect(`/${lang}/log-masuk`);
  try {
    await refreshRecommendations(token);
  } catch {
    // The page shows the list it has; the student can try again.
  }
  revalidatePath(`/${lang}/cadangan`);
}
