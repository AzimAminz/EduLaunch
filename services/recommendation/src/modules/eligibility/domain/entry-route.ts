import type { EntryRoute, PublishedRequirement, StudentSnapshot } from '@edulaunch/contracts';

/**
 * Which entry routes apply to a student, best match first. A programme can publish requirements
 * per route (after SPM, after STPM, after matriculation/foundation, after diploma, Form 3 streams).
 * SVM, SKM, DVM and DKM holders use their own route when the programme has one, then the closest general
 * route: SVM → certificate → SPM, SKM → SPM, DVM/DKM → diploma.
 */
export function routesFor(snapshot: Pick<StudentSnapshot, 'educationLevel' | 'higherQualification'>): EntryRoute[] {
  switch (snapshot.educationLevel) {
    case 'form1_3':
      return ['form3'];
    case 'form4_5':
    case 'after_spm':
      return ['spm'];
    case 'after_certificate':
      switch (snapshot.higherQualification) {
        case 'svm':
          return ['svm', 'sijil', 'spm'];
        case 'skm':
          return ['skm', 'spm'];
        default:
          return ['sijil', 'spm'];
      }
    case 'after_preu':
      switch (snapshot.higherQualification) {
        case 'stpm':
          return ['stpm'];
        case 'a_level':
          return ['a_level', 'stpm'];
        case 'matriculation':
        case 'foundation':
          return ['matrikulasi'];
        case 'diploma':
          return ['diploma'];
        case 'dvm':
          return ['dvm', 'diploma'];
        case 'dkm':
          return ['dkm', 'diploma'];
        default:
          return [];
      }
  }
}

/**
 * The programme's requirements for the student's route: one per official candidate category of that route (STPM
 * Sains and STPM Sastera can differ), empty when it publishes none for the route. The first route with any wins.
 */
export function requirementsFor(requirements: PublishedRequirement[], snapshot: Pick<StudentSnapshot, 'educationLevel' | 'higherQualification'>): PublishedRequirement[] {
  for (const route of routesFor(snapshot)) {
    const matches = requirements.filter((r) => r.entryRoute === route);
    if (matches.length) return matches;
  }
  return [];
}

const RANK = { eligible: 0, almost: 1, not_yet: 2 } as const;

/**
 * Checks the student against each category's requirement and keeps the best result: a candidate applies through
 * whichever category they qualify for. Ties keep the requirement with fewer missed rules.
 */
export function bestOf<R extends { status: keyof typeof RANK; missing: unknown[] }>(
  requirements: PublishedRequirement[],
  check: (requirement: PublishedRequirement) => R,
): { requirement: PublishedRequirement; result: R } | null {
  let best: { requirement: PublishedRequirement; result: R } | null = null;
  for (const requirement of requirements) {
    const result = check(requirement);
    if (!best || RANK[result.status] < RANK[best.result.status] || (RANK[result.status] === RANK[best.result.status] && result.missing.length < best.result.missing.length)) {
      best = { requirement, result };
    }
  }
  return best;
}
