import 'server-only';
import { StudentSnapshot } from '@edulaunch/contracts';
import { z } from 'zod';

const GATEWAY_URL = process.env.GATEWAY_URL ?? 'http://127.0.0.1:4000';

export const EducationLevel = StudentSnapshot.shape.educationLevel;
export type EducationLevel = z.infer<typeof EducationLevel>;

const Me = z.object({ studentId: z.uuid(), educationLevel: EducationLevel.nullable(), formYear: z.number().nullable() });
export type Me = z.infer<typeof Me>;

/** Calls the profile service through the gateway as the signed-in student. */
async function call(token: string, path: string, init: RequestInit = {}) {
  const res = await fetch(`${GATEWAY_URL}/api/profile${path}`, {
    ...init,
    headers: { accept: 'application/json', 'content-type': 'application/json', authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`Profile request failed (${res.status}) for ${path}`);
  return Me.parse(await res.json());
}

/** Creates the profile on first use. */
export const getMe = (token: string) => call(token, '/me');

export const setEducationLevel = (token: string, level: EducationLevel, formYear: number | null) =>
  call(token, '/me/education-level', { method: 'PATCH', body: JSON.stringify({ level, formYear }) });
