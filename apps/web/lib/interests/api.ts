import 'server-only';
import { z } from 'zod';

const GATEWAY_URL = process.env.GATEWAY_URL ?? 'http://127.0.0.1:4000';

export const RIASEC = ['R', 'I', 'A', 'S', 'E', 'C'] as const;
export type RiasecType = (typeof RIASEC)[number];
const Scores = z.object({ R: z.number(), I: z.number(), A: z.number(), S: z.number(), E: z.number(), C: z.number() });

const InterestTest = z.object({
  questions: z.array(z.object({ id: z.uuid(), text: z.string(), textEn: z.string().nullable() })),
  answers: z.record(z.string(), z.number()),
  result: z.object({ scores: Scores, code: z.string(), completedAt: z.coerce.date().nullable() }).nullable(),
});
export type InterestTest = z.infer<typeof InterestTest>;

async function call<T extends z.ZodType>(token: string, path: string, schema: T, init: RequestInit = {}): Promise<z.infer<T>> {
  const res = await fetch(`${GATEWAY_URL}/api/profile/me/interest-test${path}`, {
    ...init,
    headers: { accept: 'application/json', 'content-type': 'application/json', authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`Interest test request failed (${res.status}) for ${path || '/'}`);
  return schema.parse(res.status === 204 ? null : await res.json());
}

/** The questions, the answers saved so far and the last result. */
export const getInterestTest = (token: string) => call(token, '', InterestTest);
export const saveInterestAnswers = (token: string, answers: Array<{ questionId: string; answer: number }>) =>
  call(token, '/answers', z.object({ saved: z.number() }), { method: 'PUT', body: JSON.stringify({ answers }) });
export const submitInterestTest = (token: string) => call(token, '/submit', z.object({ code: z.string() }).loose(), { method: 'POST' });
export const restartInterestTest = (token: string) => call(token, '/answers', z.null(), { method: 'DELETE' });
