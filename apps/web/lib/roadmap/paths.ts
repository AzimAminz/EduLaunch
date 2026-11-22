/**
 * The stages of a student's road from where they are now, by education level, as the Malaysian system runs:
 * Form 1–3 choose a Form 4 stream and sit SPM; after SPM come foundation, matriculation, STPM, a diploma or TVET
 * (certificates and skills); a certificate leads to a diploma; pre-university and a diploma lead to a degree.
 */
export type Route = 'form4_stream' | 'spm' | 'foundation' | 'matriculation' | 'stpm' | 'diploma' | 'tvet' | 'degree';
export type Stage = { kind: 'now' } | { kind: 'routes'; routes: Route[] } | { kind: 'career' };

const AFTER_SPM: Route[] = ['foundation', 'matriculation', 'stpm', 'diploma', 'tvet'];

export function stagesFor(level: string | null): Stage[] {
  switch (level) {
    case 'form1_3':
      return [{ kind: 'now' }, { kind: 'routes', routes: ['form4_stream'] }, { kind: 'routes', routes: ['spm'] }, { kind: 'routes', routes: AFTER_SPM }];
    case 'form4_5':
      return [{ kind: 'now' }, { kind: 'routes', routes: ['spm'] }, { kind: 'routes', routes: AFTER_SPM }, { kind: 'routes', routes: ['degree'] }, { kind: 'career' }];
    case 'after_spm':
      return [{ kind: 'now' }, { kind: 'routes', routes: AFTER_SPM }, { kind: 'routes', routes: ['degree'] }, { kind: 'career' }];
    case 'after_certificate':
      return [{ kind: 'now' }, { kind: 'routes', routes: ['diploma'] }, { kind: 'routes', routes: ['degree'] }, { kind: 'career' }];
    case 'after_preu':
      return [{ kind: 'now' }, { kind: 'routes', routes: ['degree'] }, { kind: 'career' }];
    default:
      return [{ kind: 'now' }];
  }
}

/** The route a catalogue programme belongs to, by its study level (certificates and skills are TVET). */
export function routeOfLevel(studyLevel: string): Route | null {
  if (studyLevel === 'certificate' || studyLevel === 'skills') return 'tvet';
  return (['form4_stream', 'foundation', 'matriculation', 'stpm', 'diploma', 'degree'] as const).find((r) => r === studyLevel) ?? null;
}

/** How many of the student's suggestions they can reach (eligible or almost) on each route. */
export function reachableByRoute(items: Array<{ eligibility: string; details: { studyLevel: string } }>): Partial<Record<Route, number>> {
  const counts: Partial<Record<Route, number>> = {};
  for (const i of items) {
    if (i.eligibility === 'not_yet') continue;
    const route = routeOfLevel(i.details.studyLevel);
    if (route) counts[route] = (counts[route] ?? 0) + 1;
  }
  return counts;
}
