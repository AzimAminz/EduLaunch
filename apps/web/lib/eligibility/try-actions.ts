'use server';

import { z } from 'zod';
import { getAccessToken } from '../supabase/server';
import { tryEligibility, type EligibilityAnswer } from '../recommendation/api';

const Body = z.object({
  programId: z.uuid(),
  grades: z.array(z.object({ subjectId: z.uuid(), grade: z.string().min(1).max(3) })).max(30),
  cgpa: z.number().min(0).max(4).nullable().optional(),
});

export type TryResult = { ok: true; answer: EligibilityAnswer } | { ok: false };

/** Runs the eligibility check with the grades the student is trying; their profile is not changed. */
export async function checkWithGrades(input: unknown): Promise<TryResult> {
  const parsed = Body.safeParse(input);
  if (!parsed.success) return { ok: false };
  const token = await getAccessToken();
  if (!token) return { ok: false };
  try {
    const { programId, ...body } = parsed.data;
    return { ok: true, answer: await tryEligibility(token, programId, body) };
  } catch {
    return { ok: false };
  }
}
