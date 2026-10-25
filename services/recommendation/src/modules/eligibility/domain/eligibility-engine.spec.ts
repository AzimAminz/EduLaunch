import type { PublishedRequirement, RequirementRuleDto, StudentSnapshot } from '@edulaunch/contracts';
import { EligibilityEngine } from './eligibility-engine.js';
import { Grade } from './grade.js';

const ids = { bm: '00000000-0000-4000-8000-000000000001', math: '00000000-0000-4000-8000-000000000002', phy: '00000000-0000-4000-8000-000000000003', sci: '00000000-0000-4000-8000-000000000004' };
const names = new Map([[ids.bm, 'Bahasa Melayu'], [ids.math, 'Mathematics'], [ids.phy, 'Physics'], [ids.sci, 'Science']]);

let n = 0;
const rule = (groupNo: number, subjectId: string, minGrade: string): RequirementRuleDto => ({
  id: `00000000-0000-4000-9000-${String(++n).padStart(12, '0')}`,
  groupNo,
  ruleType: 'min_grade',
  subjectId,
  minGrade,
  minValue: null,
  evidenceQuote: 'quote',
});

// Diploma in Computer Science: BM credit AND Maths B AND (Physics C OR Science C)
const requirement: PublishedRequirement = {
  requirementId: '00000000-0000-4000-8000-0000000000aa',
  programId: '00000000-0000-4000-8000-0000000000bb',
  entryRoute: 'spm',
  versionNo: 2,
  rules: [rule(1, ids.bm, 'C'), rule(2, ids.math, 'B'), rule(3, ids.phy, 'C'), rule(3, ids.sci, 'C')],
};

const student = (grades: Record<string, string>): StudentSnapshot => ({
  studentId: '00000000-0000-4000-8000-0000000000cc',
  educationLevel: 'after_spm',
  isTargetBased: false,
  gradeScale: 'spm',
  grades: Object.entries(grades).map(([subjectId, grade]) => ({ subjectId, grade })),
  cgpa: null,
  muetBand: null,
  riasec: null,
});

const engine = new EligibilityEngine();
const check = (g: Record<string, string>) => engine.check(requirement, { snapshot: student(g), subjectNames: names });

describe('Grade', () => {
  it('orders SPM grades and counts steps', () => {
    expect(Grade.of('spm', 'A').meets(Grade.of('spm', 'B'))).toBe(true);
    expect(Grade.of('spm', 'C+').stepsShortOf(Grade.of('spm', 'B'))).toBe(1);
    expect(Grade.of('spm', 'C').stepsShortOf(Grade.of('spm', 'B'))).toBe(2);
  });
});

describe('EligibilityEngine', () => {
  it('is eligible when every group passes (either Physics or Science is enough)', () => {
    const r = check({ [ids.bm]: 'B', [ids.math]: 'A', [ids.sci]: 'C' });
    expect(r.status).toBe('eligible');
    expect(r.missing).toEqual([]);
  });

  it('is almost eligible when one group misses by one grade', () => {
    const r = check({ [ids.bm]: 'B', [ids.math]: 'C+', [ids.phy]: 'B' });
    expect(r.status).toBe('almost');
    expect(r.missing[0]).toMatch(/Mathematics needs B/);
  });

  it('is not yet eligible when a subject is missing or two groups fail', () => {
    expect(check({ [ids.bm]: 'B', [ids.math]: 'A' }).status).toBe('not_yet');
    expect(check({ [ids.bm]: 'D', [ids.math]: 'C', [ids.phy]: 'B' }).status).toBe('not_yet');
  });

  it('explains an either/or group in one line', () => {
    const r = check({ [ids.bm]: 'B', [ids.math]: 'A' });
    expect(r.missing[0]).toMatch(/^One of: Physics .* \/ Science/);
  });
});
