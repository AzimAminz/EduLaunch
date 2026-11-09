import { SpmMeritSubjects, type SpmSubjectType } from './merit-subjects.js';

/**
 * Merit marks as the official calculator on ePanduan (Kementerian Pendidikan Tinggi) works them out, read from the
 * calculator's own code on 8 Nov 2026:
 *   SPM:  https://online.mohe.gov.my/epanduan/kalkulatorMerit/spm
 *   STPM, matriculation, foundation, STAM and diploma: https://online.mohe.gov.my/epanduan/kalkulatorMerit/stpm
 * Every result is a percentage rounded to two decimals, as the calculator shows it.
 */
export const MeritSources = {
  spm: 'https://online.mohe.gov.my/epanduan/kalkulatorMerit/spm',
  cgpa: 'https://online.mohe.gov.my/epanduan/kalkulatorMerit/stpm',
  checkedOn: '2026-11-08',
} as const;

const round2 = (n: number) => Number(n.toFixed(2));
const clamp = (n: number, min: number, max: number) => Math.min(Math.max(n, min), max);

/** Points per SPM grade. EduLaunch stores a fail as "G" (9G); a missing subject scores 0. */
export const SpmGradePoints: Record<string, number> = { 'A+': 18, A: 16, 'A-': 14, 'B+': 12, B: 10, 'C+': 8, C: 6, D: 4, E: 2, G: 0, F: 0 };

/** The four subjects every SPM merit counts (40% of the academic mark). */
export const SpmUniversalSubjects = ['BAHASA MELAYU', 'BAHASA INGGERIS', 'MATEMATIK', 'SEJARAH'] as const;

/**
 * Streams as the calculator offers them, with the subject types that may fill the "package" row (30%). STEM C
 * counts one package subject; the others count two.
 */
export const SpmStreams = {
  stem_a: { package: ['PA'], count: 2 },
  stem_b: { package: ['PA', 'PB'], count: 2 },
  stem_c: { package: ['PC', 'PB'], count: 1 },
  humanities: { package: ['KB', 'KP', 'KS', 'PK'], count: 2 },
} as const satisfies Record<string, { package: readonly SpmSubjectType[]; count: number }>;
export type SpmStream = keyof typeof SpmStreams;

/** Our subject names that the calculator spells differently. */
const SPELLINGS: Record<string, string> = {
  'BAHASA ARAB': 'BAHASA ARAB / BAHASA ARAB TINGGI',
  'BAHASA ARAB TINGGI': 'BAHASA ARAB / BAHASA ARAB TINGGI',
  'PENDIDIKAN AL-QURAN DAN AS-SUNNAH': 'PENDIDIKAN AL-QURAN DAN AL-SUNNAH',
  'PENDIDIKAN SYARIAH ISLAMIAH': "PENDIDIKAN SYARI'AH ISLAMIAH",
};

const normalise = (name: string) => name.replace(/&/g, 'DAN').replace(/\s+/g, ' ').trim().toUpperCase();
const BY_NAME = new Map(SpmMeritSubjects.map((s) => [normalise(s.name), s]));

/** The calculator's entry for a subject name (ours or an alias), or null when it is a universal or unknown subject. */
export function spmMeritSubject(name: string): (typeof SpmMeritSubjects)[number] | null {
  const key = normalise(name);
  return BY_NAME.get(key) ?? BY_NAME.get(normalise(SPELLINGS[key] ?? '')) ?? null;
}

export const isSpmUniversal = (name: string) => (SpmUniversalSubjects as readonly string[]).includes(normalise(name));

export interface SpmResult {
  /** The subject's name, as recorded (one of its names or aliases). */
  subject: string;
  grade: string;
}

/**
 * The stream a student's subjects suggest: two science subjects is STEM A; science and technical subjects make two
 * for STEM B; one vocational or technical subject is STEM C; otherwise humanities. The student may choose another.
 */
export function suggestSpmStream(results: SpmResult[]): SpmStream {
  const types = results.map((r) => spmMeritSubject(r.subject)?.type).filter((t): t is SpmSubjectType => !!t);
  const count = (...of: SpmSubjectType[]) => types.filter((t) => of.includes(t)).length;
  if (count('PA') >= 2) return 'stem_a';
  if (count('PA', 'PB') >= 2) return 'stem_b';
  if (count('PC', 'PB') >= 1) return 'stem_c';
  return 'humanities';
}

export interface MeritPart {
  /** The subjects counted, best first, with their points. */
  subjects: Array<{ subject: string; grade: string; points: number }>;
  points: number;
  maxPoints: number;
  /** This part's share of the academic mark (out of 40, 30 or 10). */
  mark: number;
}

export interface SpmMerit {
  stream: SpmStream;
  universal: MeritPart & { missing: string[] };
  package: MeritPart;
  additional: MeritPart;
  /** Out of 90. */
  academic: number;
  /** Out of 10. */
  cocurricular: number;
  /** Out of 100. */
  merit: number;
}

const pointsOf = (grade: string) => SpmGradePoints[grade.trim().toUpperCase()] ?? 0;
const best = (rows: Array<{ subject: string; grade: string; points: number }>, n: number) => [...rows].sort((a, b) => b.points - a.points).slice(0, n);

/**
 * The SPM merit, exactly as the calculator adds it up:
 *   universal = (points of the four universal subjects / 72) × 40
 *   package   = (points of the stream's best package subjects / 36) × 30   (STEM C: one subject, / 18)
 *   additional= (points of the two best other subjects / 36) × 10
 *   academic  = (universal + package + additional) / 80 × 90
 *   merit     = academic + co-curricular (0–10)
 * The calculator lets the student pick the subjects; here the best ones are picked for them, which is what a
 * student filling it in would do.
 */
export function spmMerit(results: SpmResult[], stream: SpmStream, cocurricular: number): SpmMerit {
  const rows = results.map((r) => ({ subject: r.subject, grade: r.grade, points: pointsOf(r.grade) }));
  const universalRows = SpmUniversalSubjects.map((u) => rows.filter((r) => normalise(r.subject) === u).sort((a, b) => b.points - a.points)[0]);
  const universal = universalRows.filter((r): r is NonNullable<typeof r> => !!r);
  const missing = SpmUniversalSubjects.filter((_, i) => !universalRows[i]);

  const rule = SpmStreams[stream];
  const others = rows.filter((r) => !isSpmUniversal(r.subject) && spmMeritSubject(r.subject));
  const packageRows = best(
    others.filter((r) => (rule.package as readonly string[]).includes(spmMeritSubject(r.subject)!.type)),
    rule.count,
  );
  const additionalRows = best(
    others.filter((r) => !packageRows.includes(r)),
    2,
  );

  const sum = (xs: Array<{ points: number }>) => xs.reduce((n, x) => n + x.points, 0);
  const packageMax = rule.count * 18;
  const universalMark = (sum(universal) / 72) * 40;
  const packageMark = (sum(packageRows) / packageMax) * 30;
  const additionalMark = (sum(additionalRows) / 36) * 10;
  const academic = ((universalMark + packageMark + additionalMark) / 80) * 90;
  const koko = clamp(Number.isFinite(cocurricular) ? cocurricular : 0, 0, 10);
  return {
    stream,
    universal: { subjects: universal, points: sum(universal), maxPoints: 72, mark: round2(universalMark), missing: [...missing] },
    package: { subjects: packageRows, points: sum(packageRows), maxPoints: packageMax, mark: round2(packageMark) },
    additional: { subjects: additionalRows, points: sum(additionalRows), maxPoints: 36, mark: round2(additionalMark) },
    academic: round2(academic),
    cocurricular: round2(koko),
    merit: round2(academic + koko),
  };
}

/** STPM, matriculation and foundation: academic = (CGPA / 4.00) × 90, plus co-curricular (0–10). */
export function cgpaMerit(cgpa: number, cocurricular: number): { academic: number; cocurricular: number; merit: number } {
  const academic = (clamp(cgpa, 0, 4) / 4) * 90;
  const koko = clamp(Number.isFinite(cocurricular) ? cocurricular : 0, 0, 10);
  return { academic: round2(academic), cocurricular: round2(koko), merit: round2(academic + koko) };
}

/** Diploma and equivalent: merit = (CGPA / 4.00) × 100, with no co-curricular mark. */
export function diplomaMerit(cgpa: number): number {
  return round2((clamp(cgpa, 0, 4) / 4) * 100);
}

/** STAM levels and the CGPA the calculator gives each. */
export const StamLevels = { mumtaz: 4, jayyid_jiddan: 3, jayyid: 2, maqbul: 1, rasib: 0 } as const;
export type StamLevel = keyof typeof StamLevels;

/** STAM: the level becomes a CGPA, then as STPM. */
export function stamMerit(level: StamLevel, cocurricular: number) {
  return cgpaMerit(StamLevels[level], cocurricular);
}
