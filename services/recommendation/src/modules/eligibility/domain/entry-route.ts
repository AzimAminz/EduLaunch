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

/** The programme's requirement for the student's route, or null when it publishes none for that route. */
export function pickRequirement(requirements: PublishedRequirement[], snapshot: Pick<StudentSnapshot, 'educationLevel' | 'higherQualification'>): PublishedRequirement | null {
  for (const route of routesFor(snapshot)) {
    const match = requirements.find((r) => r.entryRoute === route);
    if (match) return match;
  }
  return null;
}
