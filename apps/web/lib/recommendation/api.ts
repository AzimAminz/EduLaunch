import 'server-only';
import { z } from 'zod';

const GATEWAY_URL = process.env.GATEWAY_URL ?? 'http://127.0.0.1:4000';

const RuleDetail = z.object({
  type: z.enum(['min_grade', 'key_subject', 'min_credits', 'min_cgpa', 'min_muet', 'subjects_from_list']),
  subjectId: z.string().nullable(),
  required: z.union([z.string(), z.number()]).nullable(),
  actual: z.union([z.string(), z.number()]).nullable(),
  passed: z.boolean(),
  minGrade: z.string().nullable().optional(),
  subjectIds: z.array(z.string()).optional(),
});
export type RuleDetail = z.infer<typeof RuleDetail>;

const Group = z.object({ passed: z.boolean(), rules: z.array(RuleDetail) });
export type EligibilityGroup = z.infer<typeof Group>;

export const EligibilityAnswer = z.discriminatedUnion('state', [
  z.object({ state: z.literal('no_requirement') }),
  z.object({ state: z.literal('no_route'), routes: z.array(z.string()) }),
  z.object({ state: z.literal('no_results'), entryRoute: z.string(), missing: z.enum(['grades', 'cgpa']).default('grades') }),
  z.object({
    state: z.literal('checked'),
    entryRoute: z.string(),
    status: z.enum(['eligible', 'almost', 'not_yet']),
    isTargetBased: z.boolean(),
    groups: z.array(Group),
    /** Conditions the student confirms or the university checks (interview, citizenship, health). */
    toConfirm: z.array(z.string()).default([]),
  }),
]);
export type EligibilityAnswer = z.infer<typeof EligibilityAnswer>;

/** The same check with grades (on the student's main scale) and a CGPA to try instead of the saved ones; nothing is saved. */
export async function tryEligibility(token: string, programId: string, body: { grades: Array<{ subjectId: string; grade: string }>; cgpa?: number | null }): Promise<EligibilityAnswer> {
  const res = await fetch(`${GATEWAY_URL}/api/recommendation/me/eligibility/${encodeURIComponent(programId)}/try`, {
    method: 'POST',
    headers: { accept: 'application/json', 'content-type': 'application/json', authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`Eligibility try failed (${res.status})`);
  return EligibilityAnswer.parse(await res.json());
}

/** "Can I enter this programme?" for the signed-in student (recommendation service, through the gateway). */
export async function getEligibility(token: string, programId: string): Promise<EligibilityAnswer> {
  const res = await fetch(`${GATEWAY_URL}/api/recommendation/me/eligibility/${encodeURIComponent(programId)}`, {
    headers: { accept: 'application/json', authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`Eligibility request failed (${res.status})`);
  return EligibilityAnswer.parse(await res.json());
}

const RiasecType = z.enum(['R', 'I', 'A', 'S', 'E', 'C']);

export const Recommendation = z.object({
  programId: z.uuid(),
  programName: z.string(),
  eligibility: z.enum(['eligible', 'almost', 'not_yet']),
  score: z.number(),
  isTopMatch: z.boolean(),
  isTargetBased: z.boolean(),
  details: z.object({
    institutionId: z.uuid().nullable(),
    studyLevel: z.string(),
    durationSemesters: z.number().int().nullable(),
    entryRoute: z.string(),
    entryRoutes: z.array(z.string()),
    averageMerit: z.object({ intakeYear: z.number().int(), value: z.number() }).nullable(),
    interest: z.object({ fit: z.number(), level: z.enum(['high', 'medium', 'low']), sharedTypes: z.array(RiasecType), fieldId: z.uuid().nullable(), specialisation: z.string().nullable().default(null) }).nullable(),
    continuity: z
      .object({ score: z.number(), level: z.enum(['high', 'medium', 'low']), fieldMatch: z.enum(['same', 'related', 'none']).nullable(), textSimilarity: z.number().nullable(), qualification: z.string(), name: z.string().nullable() })
      .nullable()
      .default(null),
    met: z.array(RuleDetail),
    unmet: z.array(z.array(RuleDetail)),
    toConfirm: z.array(z.string()),
  }),
});
export type Recommendation = z.infer<typeof Recommendation>;

const Recommendations = z.object({ items: z.array(Recommendation), generatedAt: z.coerce.date().nullable() });
export type Recommendations = z.infer<typeof Recommendations>;

async function recommendations(token: string, path: '' | '/refresh', method: 'GET' | 'POST'): Promise<Recommendations> {
  const res = await fetch(`${GATEWAY_URL}/api/recommendation/me/recommendations${path}`, {
    method,
    headers: { accept: 'application/json', authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`Recommendations request failed (${res.status})`);
  return Recommendations.parse(await res.json());
}

/** The student's ranked programmes (worked out the first time they are asked for). */
export async function getRecommendations(token: string): Promise<Recommendations> {
  return recommendations(token, '', 'GET');
}

/** Works the list out again now. */
export async function refreshRecommendations(token: string): Promise<Recommendations> {
  return recommendations(token, '/refresh', 'POST');
}
