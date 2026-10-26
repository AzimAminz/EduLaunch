import type { PublishedRequirement } from '@edulaunch/contracts';
import { pickRequirement, routesFor } from './entry-route.js';

const req = (entryRoute: string): PublishedRequirement => ({ requirementId: `00000000-0000-4000-8000-${entryRoute.padStart(12, '0').slice(-12).replace(/[^0-9]/g, '0')}`, programId: '00000000-0000-4000-8000-0000000000bb', entryRoute, versionNo: 1, rules: [] });

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

describe('pickRequirement', () => {
  it('takes the requirement for the student route, or none', () => {
    const both = [req('spm'), req('diploma')];
    expect(pickRequirement(both, { educationLevel: 'after_preu', higherQualification: 'diploma' })?.entryRoute).toBe('diploma');
    expect(pickRequirement(both, { educationLevel: 'after_spm' })?.entryRoute).toBe('spm');
    expect(pickRequirement([req('spm')], { educationLevel: 'after_preu', higherQualification: 'stpm' })).toBeNull();
  });

  it('lets certificate holders use the SPM route when there is no certificate route', () => {
    expect(pickRequirement([req('spm')], { educationLevel: 'after_certificate', higherQualification: 'certificate' })?.entryRoute).toBe('spm');
    expect(pickRequirement([req('spm'), req('sijil')], { educationLevel: 'after_certificate', higherQualification: 'certificate' })?.entryRoute).toBe('sijil');
  });
});
