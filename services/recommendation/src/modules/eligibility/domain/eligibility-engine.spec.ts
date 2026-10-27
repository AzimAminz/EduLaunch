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
  part: 'special',
  section: null,
  subjectIds: [],
  minCount: null,
  position: 0,
});

// Diploma in Computer Science: BM credit AND Maths B AND (Physics C OR Science C)
const requirement: PublishedRequirement = {
  requirementId: '00000000-0000-4000-8000-0000000000aa',
  programId: '00000000-0000-4000-8000-0000000000bb',
  entryRoute: 'spm',
  versionNo: 2,
  sourceCategory: null,
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

  it('returns every group with its rules as data (required, actual, passed)', () => {
    const r = check({ [ids.bm]: 'B', [ids.math]: 'C+', [ids.phy]: 'B' });
    expect(r.groups).toEqual([
      { passed: true, rules: [{ type: 'min_grade', subjectId: ids.bm, required: 'C', actual: 'B', passed: true }] },
      { passed: false, rules: [{ type: 'min_grade', subjectId: ids.math, required: 'B', actual: 'C+', passed: false }] },
      {
        passed: true,
        rules: [
          { type: 'min_grade', subjectId: ids.phy, required: 'C', actual: 'B', passed: true },
          { type: 'min_grade', subjectId: ids.sci, required: 'C', actual: null, passed: false },
        ],
      },
    ]);
  });

  it('compares an STPM subject on the STPM scale, and counts credits on SPM grades only', () => {
    const stpmMath = '00000000-0000-4000-8000-000000000009';
    const req: PublishedRequirement = {
      ...requirement,
      entryRoute: 'stpm',
      rules: [
        { ...rule(1, stpmMath, 'C'), ruleType: 'min_grade' },
        { ...rule(2, ids.bm, 'C'), ruleType: 'min_credits', subjectId: null, minValue: 2 },
      ],
    };
    const snapshot: StudentSnapshot = {
      ...student({}),
      educationLevel: 'after_preu',
      grades: [
        { subjectId: ids.bm, grade: 'A', scale: 'spm' },
        { subjectId: stpmMath, grade: 'C-', scale: 'stpm' },
        { subjectId: '00000000-0000-4000-8000-000000000010', grade: 'A', scale: 'stpm' },
      ],
    };
    const r = engine.check(req, { snapshot, subjectNames: names });
    expect(r.groups[0]!.rules[0]).toMatchObject({ required: 'C', actual: 'C-', passed: false });
    expect(r.groups[1]!.rules[0]).toMatchObject({ type: 'min_credits', required: 2, actual: 1, passed: false });
  });
});

describe('requirement lines from ePanduan', () => {
  const line = (over: Partial<RequirementRuleDto>): RequirementRuleDto => ({ ...rule(1, ids.bm, 'C'), subjectId: null, minGrade: null, ...over });
  const withLines = (rules: RequirementRuleDto[]): PublishedRequirement => ({ ...requirement, rules });

  it('counts grades in N subjects from a list', () => {
    const twoOf = withLines([line({ groupNo: 1, ruleType: 'subjects_from_list', minGrade: 'C', subjectIds: [ids.math, ids.phy, ids.sci], minCount: 2 })]);
    const result = (g: Record<string, string>) => engine.check(twoOf, { snapshot: student(g), subjectNames: names });
    expect(result({ [ids.math]: 'B', [ids.phy]: 'C', [ids.sci]: 'D' }).status).toBe('eligible');
    const short = result({ [ids.math]: 'B', [ids.phy]: 'D', [ids.bm]: 'A' });
    expect(short.status).toBe('almost');
    expect(short.groups[0]!.rules[0]).toMatchObject({ type: 'subjects_from_list', required: 2, actual: 1, minGrade: 'C' });
  });

  it('lists declarations to confirm and ignores notes, so neither decides eligibility', () => {
    const req = withLines([
      line({ groupNo: 1, ruleType: 'note', evidenceQuote: 'Memiliki SPM dengan mendapat sekurang-kurangnya:-' }),
      rule(2, ids.bm, 'C'),
      line({ groupNo: 3, ruleType: 'declaration', evidenceQuote: 'Lulus ujian dan / atau temu duga' }),
    ]);
    const result = engine.check(req, { snapshot: student({ [ids.bm]: 'B' }), subjectNames: names });
    expect(result.status).toBe('eligible');
    expect(result.groups).toHaveLength(1);
    expect(result.toConfirm).toEqual(['Lulus ujian dan / atau temu duga']);
  });
});

