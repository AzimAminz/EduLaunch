import type { FitLevel } from './scoring.js';

/**
 * How a programme follows on from what the student already studied (a diploma in a field, a matriculation stream):
 * the same broad field, a related one, or neither. Null when nothing is known about their earlier study.
 */
export type FieldMatch = 'same' | 'related' | 'none';

export interface PriorStudy {
  fieldId: string | null;
  stream: string | null;
}

/**
 * Broad fields that commonly lead into one another (a diploma in one often continues to a degree in the other),
 * by the field's English name in the catalogue. Symmetric: each pair is read both ways.
 */
const RELATED: ReadonlyArray<readonly [string, string]> = [
  ['Engineering', 'Computing & IT'],
  ['Engineering', 'Technical & Vocational (TVET)'],
  ['Engineering', 'Pure Science'],
  ['Computing & IT', 'Business & Accounting'],
  ['Computing & IT', 'Art & Design'],
  ['Computing & IT', 'Technical & Vocational (TVET)'],
  ['Pure Science', 'Health & Medicine'],
  ['Pure Science', 'Education'],
  ['Business & Accounting', 'Law & Social Science'],
  ['Education', 'Law & Social Science'],
  ['Art & Design', 'Technical & Vocational (TVET)'],
];

/**
 * Where the programme has an NEC code, "related" is decided on it instead of on the broad field: a broad field is too
 * coarse (Engineering holds both Computer Engineering, close to a computing diploma, and Civil Engineering, which is
 * not). By the earlier field's English name: the NEC code prefixes that continue it.
 */
const RELATED_NEC: Record<string, readonly string[]> = {
  'Computing & IT': ['0713', '054', '0211', '0322'],
  Engineering: ['06', '053', '054', '072'],
  'Pure Science': ['09', '0114', '071', '0721', '054', '084'],
  'Health & Medicine': ['05', '0923', '1014', '0114'],
  'Business & Accounting': ['0611', '031', '0421', '0542', '1015', '1013'],
  'Law & Social Science': ['04', '011', '0923', '032'],
  Education: ['02', '03', '0923', '1014'],
  'Art & Design': ['0211', '0212', '0215', '0731', '0611'],
  'Technical & Vocational (TVET)': ['07', '1013', '1015', '1012'],
};

/** The fields a matriculation stream prepares for (science streams: science, health, engineering, computing). */
const STREAM_FIELDS: Record<string, readonly string[]> = {
  science_1: ['Pure Science', 'Health & Medicine', 'Engineering', 'Computing & IT'],
  science_2: ['Pure Science', 'Health & Medicine', 'Engineering', 'Computing & IT'],
  science_3: ['Pure Science', 'Health & Medicine', 'Engineering', 'Computing & IT'],
  engineering: ['Engineering', 'Computing & IT', 'Technical & Vocational (TVET)'],
  accounting: ['Business & Accounting'],
  professional_accounting: ['Business & Accounting'],
};

export class FieldRelations {
  private readonly nameOf: Map<string, string>;

  /** @param fields The catalogue's broad fields: id and English name. */
  constructor(fields: Array<{ id: string; nameEn: string | null }>) {
    this.nameOf = new Map(fields.map((f) => [f.id, f.nameEn ?? '']));
  }

  match(prior: PriorStudy, programmeFieldIds: string[], necCode: string | null = null): FieldMatch | null {
    const priorNames = prior.fieldId ? [this.nameOf.get(prior.fieldId) ?? ''] : prior.stream ? [...(STREAM_FIELDS[prior.stream] ?? [])] : [];
    if (!priorNames.length) return null;
    const names = programmeFieldIds.map((id) => this.nameOf.get(id) ?? '');
    if (prior.fieldId && programmeFieldIds.includes(prior.fieldId)) return 'same';
    if (names.some((n) => priorNames.includes(n))) return 'same';
    if (necCode) return priorNames.some((p) => (RELATED_NEC[p] ?? []).some((prefix) => necCode.startsWith(prefix))) ? 'related' : 'none';
    const related = (a: string, b: string) => RELATED.some(([x, y]) => (x === a && y === b) || (x === b && y === a));
    return names.some((n) => priorNames.some((p) => related(p, n))) ? 'related' : 'none';
  }
}

/**
 * Puts raw similarities (cosine, from a text model) on a 0–1 scale relative to this student's own candidates:
 * 1 for the closest programme, 0 at the average and below. Raw values are bunched (0.79–0.89 for almost any pair
 * of programme names), so only the position among the candidates means anything.
 */
export function relativeSimilarity(raw: number[]): number[] {
  if (raw.length === 0) return [];
  const mean = raw.reduce((a, b) => a + b, 0) / raw.length;
  const max = Math.max(...raw);
  if (max - mean <= 0) return raw.map(() => 0);
  return raw.map((v) => Math.round(Math.max(0, Math.min(1, (v - mean) / (max - mean))) * 1000) / 1000);
}

const MATCH_VALUE: Record<FieldMatch, number> = { same: 1, related: 0.5, none: 0 };

/**
 * Continuity 0–1: the field match carries most of it, the programme-name similarity the rest; either alone when
 * the other is unknown. Null when neither is known.
 */
export function continuityScore(match: FieldMatch | null, textSimilarity: number | null): number | null {
  if (match === null && textSimilarity === null) return null;
  if (match === null) return textSimilarity;
  if (textSimilarity === null) return MATCH_VALUE[match];
  return Math.round((0.65 * MATCH_VALUE[match] + 0.35 * textSimilarity) * 1000) / 1000;
}

/** Shown to students: high from 0.65 (the same field), medium from 0.35 (a related field), low below. */
export function continuityLevel(score: number): FitLevel {
  return score >= 0.65 ? 'high' : score >= 0.35 ? 'medium' : 'low';
}
