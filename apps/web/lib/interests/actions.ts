'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { isLocale } from '../i18n/locale';
import { getAccessToken } from '../supabase/server';
import { restartInterestTest, saveInterestAnswers, saveInterestProgress, submitInterestTest } from './api';

const Answer = z.object({ questionId: z.uuid(), answer: z.number().int().min(0).max(4) });
const Progress = z.object({ current: z.number().int().min(0).max(59), flags: z.array(z.uuid()).max(60) });

export type InterestActionResult = { ok: true } | { ok: false; error: 'generic' | 'incomplete' };

async function token(locale: string) {
  const t = await getAccessToken();
  if (!t) redirect(`/${isLocale(locale) ? locale : 'ms'}/log-masuk`);
  return t;
}

/** Saves one answer and where the student is (the question open, the flags), so a reload carries on from there. */
export async function saveInterestAnswer(locale: string, answer: unknown, progress: unknown): Promise<InterestActionResult> {
  const a = answer === null ? null : Answer.safeParse(answer);
  const p = Progress.safeParse(progress);
  if ((a && !a.success) || !p.success) return { ok: false, error: 'generic' };
  const t = await token(locale);
  try {
    await Promise.all([a?.success ? saveInterestAnswers(t, [a.data]) : null, saveInterestProgress(t, p.data)]);
  } catch {
    return { ok: false, error: 'generic' };
  }
  return { ok: true };
}

/** Works out the result from the saved answers. */
export async function finishInterestTest(locale: string): Promise<InterestActionResult> {
  const t = await token(locale);
  try {
    await submitInterestTest(t);
  } catch (e) {
    return { ok: false, error: String(e).includes('(422)') ? 'incomplete' : 'generic' };
  }
  // The result feeds recommendations and the dashboard.
  revalidatePath('/[lang]', 'layout');
  return { ok: true };
}

/** Clears the answers and opens the test again; the last result stays until the new one is worked out. */
export async function retakeInterestTest(form: FormData): Promise<void> {
  const locale = String(form.get('locale'));
  const t = await token(locale);
  await restartInterestTest(t);
  redirect(`/${isLocale(locale) ? locale : 'ms'}/penilaian-minat?ulang=1`);
}
