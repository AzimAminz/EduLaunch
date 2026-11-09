import { DomainError } from '@edulaunch/ddd';

/**
 * The O*NET Mini Interest Profiler (Mini-IP): 30 work activities, five for each Holland (RIASEC) type, answered on a
 * five-point scale. Scoring as the developers state it: "0 = strongly dislike, 1 = dislike, 2 = unsure, 3 = like,
 * 4 = strongly like … Scores are computed by summing responses for each of the six Holland types with a score range
 * of … 0 to 20 for the Mini." Source: Rounds, Ming, Cao, Song & Lewis (2016), Development of an O*NET Mini Interest
 * Profiler (Mini-IP) for Mobile Devices, National Center for O*NET Development, https://www.onetcenter.org/dl_files/Mini-IP.pdf
 * Used under the O*NET Tools Developer License (https://www.onetcenter.org/license_toolsdev.html); EduLaunch added a
 * Malay translation, and USDOL/ETA has not approved, endorsed, or tested these modifications.
 */
export const MINI_IP_VERSION = 'onet-mini-ip-2016';
export const RIASEC_TYPES = ['R', 'I', 'A', 'S', 'E', 'C'] as const;
export type RiasecType = (typeof RIASEC_TYPES)[number];
export type RiasecScores = Record<RiasecType, number>;
export const ANSWER_MIN = 0;
export const ANSWER_MAX = 4;

/** Sums each type's answers. Every active question must be answered, each 0–4. */
export function scoreInterestTest(questions: ReadonlyArray<{ id: string; riasecType: string }>, answers: ReadonlyMap<string, number>): RiasecScores {
  const scores: RiasecScores = { R: 0, I: 0, A: 0, S: 0, E: 0, C: 0 };
  for (const q of questions) {
    const answer = answers.get(q.id);
    if (answer === undefined) throw new DomainError('test_incomplete', 'Answer every question before seeing the result');
    if (!Number.isInteger(answer) || answer < ANSWER_MIN || answer > ANSWER_MAX) throw new DomainError('invalid_answer', 'Each answer is from 0 (strongly dislike) to 4 (strongly like)');
    if (!(RIASEC_TYPES as readonly string[]).includes(q.riasecType)) throw new DomainError('invalid_question', `Unknown interest type ${q.riasecType}`);
    scores[q.riasecType as RiasecType] += answer;
  }
  return scores;
}

/** The Holland code: the three highest types, ties kept in R-I-A-S-E-C order (the order of the hexagon). */
export function hollandCode(scores: RiasecScores): string {
  return [...RIASEC_TYPES]
    .sort((a, b) => scores[b] - scores[a] || RIASEC_TYPES.indexOf(a) - RIASEC_TYPES.indexOf(b))
    .slice(0, 3)
    .join('');
}
