/**
 * How a student's merit stands against a programme's average merit, compared only when both belong to the same
 * group of candidates.
 *
 * The average comes from ePanduan, which shows it for the first candidate category that lists one: SPM categories
 * are read first, then STPM, then matriculation and foundation; diploma, STAM, DKM and DVM categories show none. So a
 * programme that takes SPM leavers has an SPM leavers' average; one that takes only pre-university students has a
 * pre-university (CGPA) average. A merit from another group is never compared with it.
 *
 * The bands are a house rule, not an official one: within 2 below to 3 above the average is "near". The average is
 * the mean merit of the students who were offered a place, so a merit below it can still be offered one.
 */
export type MeritMode = 'spm' | 'cgpa' | 'diploma';

export type MeritComparison =
  | { status: 'comparable'; band: 'above' | 'near' | 'below'; gap: number; average: number; year: number }
  | { status: 'no_average' }
  | { status: 'other_group'; group: 'spm' | 'preu' };

const PREU_ROUTES = ['stpm', 'matrikulasi'];

/** Which candidates a programme's average merit belongs to, from its entry routes; null when it has none to compare. */
export function averageGroup(entryRoutes: string[]): 'spm' | 'preu' | null {
  if (entryRoutes.includes('spm')) return 'spm';
  if (entryRoutes.some((r) => PREU_ROUTES.includes(r))) return 'preu';
  return null;
}

export function compareMerit(student: { mode: MeritMode; merit: number }, programme: { entryRoutes: string[]; averageMerit: { intakeYear: number; value: number } | null }): MeritComparison {
  const group = averageGroup(programme.entryRoutes);
  if (!programme.averageMerit || !group) return { status: 'no_average' };
  const mine = student.mode === 'spm' ? 'spm' : student.mode === 'cgpa' ? 'preu' : null;
  if (mine !== group) return { status: 'other_group', group };
  const gap = Math.round((student.merit - programme.averageMerit.value) * 100) / 100;
  const band = gap >= 3 ? 'above' : gap >= -2 ? 'near' : 'below';
  return { status: 'comparable', band, gap, average: programme.averageMerit.value, year: programme.averageMerit.intakeYear };
}
