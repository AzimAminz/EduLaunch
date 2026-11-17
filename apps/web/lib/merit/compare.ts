/**
 * How a student's merit stands against a programme's average merit, compared only when both belong to the same
 * group of candidates.
 *
 * The average comes from ePanduan. For a degree programme UPU publishes one average merit percentage, and that same
 * percentage applies to every candidate category after SPM: STPM, matriculation, foundation (asasi) and diploma (and
 * DKM/DVM) leavers. Each category works out its merit with its own formula; the resulting percentage is compared with
 * that one average. SPM leavers (applying for foundation, matriculation or diploma) have their own SPM merit and
 * average, and a merit from the other group is never compared with it.
 *
 * The bands are a house rule, not an official one: within 2 below to 3 above the average is "near". The average is
 * the mean merit of the students who were offered a place, so a merit below it can still be offered one.
 */
export type MeritMode = 'spm' | 'cgpa' | 'diploma';

export type MeritComparison =
  | { status: 'comparable'; band: 'above' | 'near' | 'below'; gap: number; average: number; year: number }
  | { status: 'no_average' }
  | { status: 'other_group'; group: 'spm' | 'preu' };

/** Candidate categories after SPM: the programme's one published average applies to all of them. */
const AFTER_SPM_ROUTES = ['stpm', 'matrikulasi', 'asasi', 'diploma', 'dkm', 'dvm'];

/** Which candidates a programme's average merit belongs to, from its entry routes; null when it has none to compare. */
export function averageGroup(entryRoutes: string[]): 'spm' | 'preu' | null {
  if (entryRoutes.includes('spm')) return 'spm';
  if (entryRoutes.some((r) => AFTER_SPM_ROUTES.includes(r))) return 'preu';
  return null;
}

export function compareMerit(student: { mode: MeritMode; merit: number }, programme: { entryRoutes: string[]; averageMerit: { intakeYear: number; value: number } | null }): MeritComparison {
  const group = averageGroup(programme.entryRoutes);
  if (!programme.averageMerit || !group) return { status: 'no_average' };
  // Every category after SPM (pre-university or diploma) is held against the same published average.
  const mine = student.mode === 'spm' ? 'spm' : 'preu';
  if (mine !== group) return { status: 'other_group', group };
  const gap = Math.round((student.merit - programme.averageMerit.value) * 100) / 100;
  const band = gap >= 3 ? 'above' : gap >= -2 ? 'near' : 'below';
  return { status: 'comparable', band, gap, average: programme.averageMerit.value, year: programme.averageMerit.intakeYear };
}
