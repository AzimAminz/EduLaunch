import type { PublishedRequirement } from '@edulaunch/contracts';
import { bestOf, requirementsFor, routesFor } from './entry-route.js';

const req = (entryRoute: string, sourceCategory: string | null = null): PublishedRequirement => ({ requirementId: `00000000-0000-4000-8000-${entryRoute.padStart(12, '0').slice(-12).replace(/[^0-9]/g, '0')}`, programId: '00000000-0000-4000-8000-0000000000bb', entryRoute, versionNo: 1, sourceCategory, rules: [] });

describe('routesFor', () => {
  it('maps each level and qualification to its entry route', () => {
    expect(routesFor({ educationLevel: 'form1_3' })).toEqual(['form3']);
    expect(routesFor({ educationLevel: 'form4_5' })).toEqual(['spm']);
    expect(routesFor({ educationLevel: 'after_spm' })).toEqual(['spm']);
    expect(routesFor({ educationLevel: 'after_certificate', higherQualification: 'certificate' })).toEqual(['sijil', 'spm']);
    expect(routesFor({ educationLevel: 'after_certificate', higherQualification: 'svm' })).toEqual(['svm', 'sijil', 'spm']);
    expect(routesFor({ educationLevel: 'after_certificate', higherQualification: 'skm' })).toEqual(['skm', 'spm']);
    expect(routesFor({ educationLevel: 'after_preu', higherQualification: 'stpm' })).toEqual(['stpm']);
    expect(routesFor({ educationLevel: 'after_preu', higherQualification: 'foundation' })).toEqual(['matrikulasi']);
    expect(routesFor({ educationLevel: 'after_preu', higherQualification: 'diploma' })).toEqual(['diploma']);
    expect(routesFor({ educationLevel: 'after_preu', higherQualification: 'dvm' })).toEqual(['dvm', 'diploma']);
    expect(routesFor({ educationLevel: 'after_preu', higherQualification: 'dkm' })).toEqual(['dkm', 'diploma']);
    expect(routesFor({ educationLevel: 'after_preu', higherQualification: null })).toEqual([]);
  });
});

describe('requirementsFor', () => {
  it('takes the requirements for the student route, or none', () => {
    const both = [req('spm'), req('diploma')];
    expect(requirementsFor(both, { educationLevel: 'after_preu', higherQualification: 'diploma' }).map((r) => r.entryRoute)).toEqual(['diploma']);
    expect(requirementsFor(both, { educationLevel: 'after_spm' }).map((r) => r.entryRoute)).toEqual(['spm']);
    expect(requirementsFor([req('spm')], { educationLevel: 'after_preu', higherQualification: 'stpm' })).toEqual([]);
  });

  it('lets certificate holders use the SPM route when there is no certificate route', () => {
    expect(requirementsFor([req('spm')], { educationLevel: 'after_certificate', higherQualification: 'certificate' }).map((r) => r.entryRoute)).toEqual(['spm']);
    expect(requirementsFor([req('spm'), req('sijil')], { educationLevel: 'after_certificate', higherQualification: 'certificate' }).map((r) => r.entryRoute)).toEqual(['sijil']);
  });

  it('keeps every candidate category of the route (STPM Sains and STPM Sastera)', () => {
    const stpm = [req('stpm', 'stpm:S'), req('stpm', 'stpm:A'), req('spm')];
    expect(requirementsFor(stpm, { educationLevel: 'after_preu', higherQualification: 'stpm' }).map((r) => r.sourceCategory)).toEqual(['stpm:S', 'stpm:A']);
  });
});

describe('bestOf', () => {
  it('keeps the category the student does best in, and fewer misses on a tie', () => {
    const [sains, sastera] = [req('stpm', 'stpm:S'), req('stpm', 'stpm:A')];
    const results = new Map([
      [sains.sourceCategory, { status: 'almost' as const, missing: ['Physics'] }],
      [sastera.sourceCategory, { status: 'eligible' as const, missing: [] }],
    ]);
    expect(bestOf([sains, sastera], (r) => results.get(r.sourceCategory)!)?.requirement.sourceCategory).toBe('stpm:A');
    const tie = new Map([
      [sains.sourceCategory, { status: 'not_yet' as const, missing: ['a', 'b'] }],
      [sastera.sourceCategory, { status: 'not_yet' as const, missing: ['a'] }],
    ]);
    expect(bestOf([sains, sastera], (r) => tie.get(r.sourceCategory)!)?.requirement.sourceCategory).toBe('stpm:A');
    expect(bestOf([], () => ({ status: 'eligible' as const, missing: [] }))).toBeNull();
  });
});
