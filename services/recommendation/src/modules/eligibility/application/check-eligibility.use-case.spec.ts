import type { PublishedRequirement, StudentSnapshot } from '@edulaunch/contracts';
import { CheckEligibility } from './check-eligibility.use-case.js';
import type { CatalogueGateway, ProfileGateway } from '../../recommendations/application/ports.js';

const programId = '00000000-0000-4000-8000-0000000000bb';
const bm = '00000000-0000-4000-8000-000000000001';
const caller = { userId: 'u1', role: 'student' as const };

const spmRequirement: PublishedRequirement = {
  requirementId: '00000000-0000-4000-8000-0000000000aa',
  programId,
  entryRoute: 'spm',
  versionNo: 1,
  rules: [{ id: '00000000-0000-4000-9000-000000000001', groupNo: 1, ruleType: 'min_grade', subjectId: bm, minGrade: 'C', minValue: null, evidenceQuote: null }],
};

const snapshot = (over: Partial<StudentSnapshot> = {}): StudentSnapshot => ({
  studentId: '00000000-0000-4000-8000-0000000000cc',
  educationLevel: 'after_spm',
  isTargetBased: false,
  gradeScale: 'spm',
  grades: [{ subjectId: bm, grade: 'B', scale: 'spm' }],
  cgpa: null,
  muetBand: null,
  riasec: null,
  ...over,
});

function useCase(requirements: PublishedRequirement[], student: StudentSnapshot) {
  const profile = { studentIdFor: async () => student.studentId, snapshot: async () => student } as unknown as ProfileGateway;
  const catalogue = { publishedRequirements: async () => requirements, subjectNames: async () => new Map([[bm, 'Bahasa Melayu']]) } as unknown as CatalogueGateway;
  return new CheckEligibility(profile, catalogue);
}

describe('CheckEligibility', () => {
  it('checks the student against the requirement for their route', async () => {
    const answer = await useCase([spmRequirement], snapshot()).execute({ caller, programId });
    expect(answer).toMatchObject({ state: 'checked', entryRoute: 'spm', status: 'eligible', isTargetBased: false });
  });

  it('marks results based on SPM targets', async () => {
    const answer = await useCase([spmRequirement], snapshot({ educationLevel: 'form4_5', isTargetBased: true })).execute({ caller, programId });
    expect(answer).toMatchObject({ state: 'checked', isTargetBased: true });
  });

  it('never guesses without a verified requirement', async () => {
    expect(await useCase([], snapshot()).execute({ caller, programId })).toEqual({ state: 'no_requirement' });
  });

  it('says when the programme has nothing for the student route', async () => {
    const answer = await useCase([spmRequirement], snapshot({ educationLevel: 'after_preu', higherQualification: 'stpm' })).execute({ caller, programId });
    expect(answer).toEqual({ state: 'no_route', routes: ['spm'] });
  });

  it('asks for results when none are confirmed', async () => {
    const answer = await useCase([spmRequirement], snapshot({ grades: [] })).execute({ caller, programId });
    expect(answer).toEqual({ state: 'no_results', entryRoute: 'spm' });
  });
});
