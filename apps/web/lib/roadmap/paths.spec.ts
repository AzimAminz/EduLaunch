import { describe, expect, it } from 'vitest';
import { reachableByRoute, routeOfLevel, stagesFor } from './paths';

describe('stagesFor', () => {
  it('takes Form 1–3 through a Form 4 stream and SPM to the routes after SPM', () => {
    expect(stagesFor('form1_3').map((s) => (s.kind === 'routes' ? s.routes.join('|') : s.kind))).toEqual(['now', 'form4_stream', 'spm', 'foundation|matriculation|stpm|diploma|tvet']);
  });

  it('takes a diploma or pre-university holder straight to a degree, then careers', () => {
    expect(stagesFor('after_preu').map((s) => (s.kind === 'routes' ? s.routes.join('|') : s.kind))).toEqual(['now', 'degree', 'career']);
  });

  it('takes a certificate holder to a diploma first', () => {
    expect(stagesFor('after_certificate')[1]).toEqual({ kind: 'routes', routes: ['diploma'] });
  });

  it('has only the present before a level is chosen', () => {
    expect(stagesFor(null)).toEqual([{ kind: 'now' }]);
  });
});

describe('routes from programmes', () => {
  it('counts certificates and skills as TVET', () => {
    expect(routeOfLevel('skills')).toBe('tvet');
    expect(routeOfLevel('degree')).toBe('degree');
  });

  it('counts only programmes the student can reach', () => {
    const item = (eligibility: string, studyLevel: string) => ({ eligibility, details: { studyLevel } });
    expect(reachableByRoute([item('eligible', 'diploma'), item('almost', 'diploma'), item('not_yet', 'foundation'), item('eligible', 'certificate')])).toEqual({ diploma: 2, tvet: 1 });
  });
});
