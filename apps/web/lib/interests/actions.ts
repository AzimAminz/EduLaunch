'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { isLocale } from '../i18n/locale';
import { getAccessToken } from '../supabase/server';
import { restartInterestTest, saveInterestAnswers, submitInterestTest } from './api';

const Answers = z.array(z.object({ questionId: z.uuid(), answer: z.number().int().min(0).max(4) })).max(60);

export type InterestActionResult = { ok: true } | { ok: false; error: 'generic' | 'incomplete' };

async function token(locale: string) {
  const t = await getAccessToken();
  if (!t) redirect(`/${isLocale(locale) ? locale : 'ms'}/log-masuk`);
  return t;
}

/** Saves one step's answers; with `finish`, also works out the result. */
export async function saveInterestStep(locale: string, answers: unknown, finish: boolean): Promise<InterestActionResult> {
  const parsed = Answers.safeParse(answers);
  if (!parsed.success) return { ok: false, error: 'generic' };
  const t = await token(locale);
  try {
    await saveInterestAnswers(t, parsed.data);
    if (finish) {
      await submitInterestTest(t);
      // The result feeds recommendations and the dashboard.
      revalidatePath('/[lang]', 'layout');
    }
  } catch (e) {
    return { ok: false, error: finish && String(e).includes('(422)') ? 'incomplete' : 'generic' };
  }
  return { ok: true };
}

/** Clears the answers and opens the test again; the last result stays until the new one is worked out. */
export async function retakeInterestTest(form: FormData): Promise<void> {
  const locale = String(form.get('locale'));
  const t = await token(locale);
  await restartInterestTest(t);
  redirect(`/${isLocale(locale) ? locale : 'ms'}/penilaian-minat?ulang=1`);
}
