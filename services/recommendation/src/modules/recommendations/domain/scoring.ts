import { DomainError } from '@edulaunch/ddd';

export type Riasec = Record<'R' | 'I' | 'A' | 'S' | 'E' | 'C', number>;
export type OfferChance = 'high' | 'medium' | 'low' | 'no_data';

const KEYS = ['R', 'I', 'A', 'S', 'E', 'C'] as const;

export type RiasecType = (typeof KEYS)[number];
export type FitLevel = 'high' | 'medium' | 'low';

/**
 * How well a student's interests follow a field's profile, 0–1: the correlation of the two six-type profiles,
 * moved from -1…1 to 0…1. Only the shape counts (which types are high and which are low), so a student who answers
 * everything high is not a good fit for every field. (Cosine similarity of the raw scores was 0.7–0.95 for almost any
 * pair, which could not tell fields apart.) Neutral 0.5 when the test is not done, the field has no weights, or a
 * profile is flat.
 */
export function interestFit(student: Riasec | null, field: Riasec | null): number {
  if (!student || !field) return 0.5;
  const centred = (v: Riasec) => {
    const mean = KEYS.reduce((s, k) => s + v[k], 0) / KEYS.length;
    return KEYS.map((k) => v[k] - mean);
  };
  const a = centred(student);
  const b = centred(field);
  const norm = (v: number[]) => Math.sqrt(v.reduce((s, x) => s + x * x, 0));
  const d = norm(a) * norm(b);
  if (d === 0) return 0.5;
  const r = a.reduce((s, x, i) => s + x * b[i]!, 0) / d;
  return Math.round(((r + 1) / 2) * 1000) / 1000;
}

/** Fit shown to students: high from 0.75 (correlation 0.5), medium from 0.55 (0.1). A house rule, tuned after testing. */
export function fitLevel(fit: number): FitLevel {
  return fit >= 0.75 ? 'high' : fit >= 0.55 ? 'medium' : 'low';
}

/**
 * The student's strongest types that the field also leans on: of the student's three highest types (the Holland
 * code), those the field weighs above its own average. Used for "Minat Penyiasat & Realistik sepadan bidang …".
 */
export function sharedTypes(student: Riasec | null, field: Riasec | null): RiasecType[] {
  if (!student || !field) return [];
  const fieldMean = KEYS.reduce((s, k) => s + field[k], 0) / KEYS.length;
  return [...KEYS]
    .sort((x, y) => student[y] - student[x])
    .slice(0, 3)
    .filter((k) => student[k] > 0 && field[k] > fieldMean);
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
  /** How the programme follows on from the student's earlier study (0–1); null when nothing is known about it. */
  continuity: number | null;
  offerChance: OfferChance;
  preferenceSignal: number;
}

/** Weighted score out of 100. Weights are configuration so they can be tuned after user testing. */
export class MatchScorer {
  private static readonly chanceValue: Record<OfferChance, number> = { high: 1, medium: 0.6, low: 0.2, no_data: 0.5 };

  // Offer chance and preferences are not known here yet (merit is worked out in the web app; preferences are not
  // collected), so the order within each eligibility group is interests, then what the student studied before,
  // then subject strength.
  constructor(private readonly weights = { interest: 40, academic: 35, continuity: 25, offer: 0, preference: 0 }) {
    const total = Object.values(weights).reduce((a, b) => a + b, 0);
    if (total !== 100) throw new DomainError('invalid_weights', `Weights must add up to 100 (got ${total})`);
  }

  score(p: ScoreParts): number {
    const w = { ...this.weights };
    if (p.continuity === null) {
      // Nothing known about earlier study (e.g. a school leaver): its weight goes to interests and subjects, pro rata.
      const base = w.interest + w.academic;
      w.interest += (w.continuity * w.interest) / base;
      w.academic += (w.continuity * w.academic) / base;
      w.continuity = 0;
    }
    const raw =
      w.interest * p.interestFit +
      w.academic * p.academicStrength +
      w.continuity * (p.continuity ?? 0) +
      w.offer * MatchScorer.chanceValue[p.offerChance] +
      w.preference * p.preferenceSignal;
    return Math.round(raw);
  }
}
