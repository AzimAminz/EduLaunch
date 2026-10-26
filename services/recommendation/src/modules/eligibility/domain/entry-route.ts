import type { PublishedRequirement, StudentSnapshot } from '@edulaunch/contracts';

/**
 * Which entry routes apply to a student, best match first. A programme can publish requirements
 * per route (after SPM, after STPM, after matriculation/foundation, after diploma, Form 3 streams).
 * Certificate holders use a certificate route when the programme has one, otherwise the SPM route.
 */
export function routesFor(snapshot: Pick<StudentSnapshot, 'educationLevel' | 'higherQualification'>): string[] {
  switch (snapshot.educationLevel) {
    case 'form1_3':
      return ['form3'];
    case 'form4_5':
    case 'after_spm':
      return ['spm'];
    case 'after_certificate':
      return ['sijil', 'spm'];
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
        case 'dvm':
        case 'dkm':
          return ['diploma'];
        default:
          return [];
      }
  }
}

/** The programme's requirement for the student's route, or null when it publishes none for that route. */
export function pickRequirement(requirements: PublishedRequirement[], snapshot: Pick<StudentSnapshot, 'educationLevel' | 'higherQualification'>): PublishedRequirement | null {
  for (const route of routesFor(snapshot)) {
    const match = requirements.find((r) => r.entryRoute === route);
    if (match) return match;
  }
  return null;
}
