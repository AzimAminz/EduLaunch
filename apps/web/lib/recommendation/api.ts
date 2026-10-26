import 'server-only';
import { z } from 'zod';

const GATEWAY_URL = process.env.GATEWAY_URL ?? 'http://127.0.0.1:4000';

const RuleDetail = z.object({
  type: z.enum(['min_grade', 'key_subject', 'min_credits', 'min_cgpa', 'min_muet']),
  subjectId: z.string().nullable(),
  required: z.union([z.string(), z.number()]).nullable(),
  actual: z.union([z.string(), z.number()]).nullable(),
  passed: z.boolean(),
});
export type RuleDetail = z.infer<typeof RuleDetail>;

const Group = z.object({ passed: z.boolean(), rules: z.array(RuleDetail) });
export type EligibilityGroup = z.infer<typeof Group>;

export const EligibilityAnswer = z.discriminatedUnion('state', [
  z.object({ state: z.literal('no_requirement') }),
  z.object({ state: z.literal('no_route'), routes: z.array(z.string()) }),
  z.object({ state: z.literal('no_results'), entryRoute: z.string() }),
  z.object({ state: z.literal('checked'), entryRoute: z.string(), status: z.enum(['eligible', 'almost', 'not_yet']), isTargetBased: z.boolean(), groups: z.array(Group) }),
]);
export type EligibilityAnswer = z.infer<typeof EligibilityAnswer>;

/** "Can I enter this programme?" for the signed-in student (recommendation service, through the gateway). */
export async function getEligibility(token: string, programId: string): Promise<EligibilityAnswer> {
  const res = await fetch(`${GATEWAY_URL}/api/recommendation/me/eligibility/${encodeURIComponent(programId)}`, {
    headers: { accept: 'application/json', authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`Eligibility request failed (${res.status})`);
  return EligibilityAnswer.parse(await res.json());
}
