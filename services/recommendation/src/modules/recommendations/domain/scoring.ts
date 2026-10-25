import { DomainError } from '@edulaunch/ddd';

export type Riasec = Record<'R' | 'I' | 'A' | 'S' | 'E' | 'C', number>;
export type OfferChance = 'high' | 'medium' | 'low' | 'no_data';

const KEYS = ['R', 'I', 'A', 'S', 'E', 'C'] as const;

/** Cosine similarity between a student's interests and a field's weights, 0–1. */
export function interestFit(student: Riasec | null, field: Riasec | null): number {
  if (!student || !field) return 0.5; // neutral when the test is not done or the field has no weights
  const dot = KEYS.reduce((s, k) => s + student[k] * field[k], 0);
  const norm = (v: Riasec) => Math.sqrt(KEYS.reduce((s, k) => s + v[k] ** 2, 0));
  const d = norm(student) * norm(field);
  return d === 0 ? 0.5 : dot / d;
}

/** Offer chance from the margin between the student's merit and the average lowest merit offered. */
export class OfferChanceEstimator {
  estimate(studentMerit: number | null, pastLowestMerits: number[]): { band: OfferChance; margin: number | null } {
    if (studentMerit === null || pastLowestMerits.length === 0) return { band: 'no_data', margin: null };
    const recent = pastLowestMerits.slice(-3);
    const margin = Math.round((studentMerit - recent.reduce((a, b) => a + b, 0) / recent.length) * 10) / 10;
    const band: OfferChance = margin >= 3 ? 'high' : margin >= -2 ? 'medium' : 'low';
    return { band, margin };
  }
}

export interface ScoreParts {
  interestFit: number;
  academicStrength: number;
  offerChance: OfferChance;
  preferenceSignal: number;
}

/** Weighted score out of 100. Weights are configuration so they can be tuned after user testing. */
export class MatchScorer {
  private static readonly chanceValue: Record<OfferChance, number> = { high: 1, medium: 0.6, low: 0.2, no_data: 0.5 };

  constructor(private readonly weights = { interest: 45, academic: 30, offer: 15, preference: 10 }) {
    const total = Object.values(weights).reduce((a, b) => a + b, 0);
    if (total !== 100) throw new DomainError('invalid_weights', `Weights must add up to 100 (got ${total})`);
  }

  score(p: ScoreParts): number {
    const w = this.weights;
    const raw = w.interest * p.interestFit + w.academic * p.academicStrength + w.offer * MatchScorer.chanceValue[p.offerChance] + w.preference * p.preferenceSignal;
    return Math.round(raw);
  }
}
