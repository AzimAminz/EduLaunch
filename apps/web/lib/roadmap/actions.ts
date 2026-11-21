'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { getProgramme } from '../catalogue/api';
import { getAccessToken } from '../supabase/server';
import { saveRoadmap } from '../profile/api';
import { routeOfLevel } from './paths';

export interface PlanState {
  savedAt?: number;
  error?: 'generic';
}

/**
 * Saves the plan from the chosen target programme and career: the route the programme belongs to, the programme and
 * the career. The programme's name and careers are read again from the catalogue, so only real ones are saved.
 */
export async function savePlan(_prev: PlanState, form: FormData): Promise<PlanState> {
  const programId = z.uuid().safeParse(form.get('target'));
  if (!programId.success) return { error: 'generic' };
  const token = await getAccessToken();
  if (!token) return { error: 'generic' };
  try {
    const programme = await getProgramme(programId.data);
    const career = String(form.get('career') ?? '');
    const route = routeOfLevel(programme.studyLevel);
    await saveRoadmap(token, [
      ...(route ? [{ type: 'route' as const, label: route }] : []),
      { type: 'programme' as const, programId: programme.id, label: programme.name },
      ...(career && programme.details.careers.includes(career) ? [{ type: 'career' as const, label: career }] : []),
    ]);
  } catch {
    return { error: 'generic' };
  }
  revalidatePath('/[lang]/roadmap', 'page');
  return { savedAt: Date.now() };
}

export async function clearPlan(): Promise<{ ok: boolean }> {
  const token = await getAccessToken();
  if (!token) return { ok: false };
  try {
    await saveRoadmap(token, []);
  } catch {
    return { ok: false };
  }
  revalidatePath('/[lang]/roadmap', 'page');
  return { ok: true };
}
