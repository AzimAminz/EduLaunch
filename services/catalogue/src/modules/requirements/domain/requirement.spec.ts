import { DomainError } from '@edulaunch/ddd';
import { Events } from '@edulaunch/contracts';
import { Requirement, type RequirementRule } from './requirement.js';

const rule = (over: Partial<RequirementRule> = {}): RequirementRule => ({
  id: 'r1',
  groupNo: 1,
  ruleType: 'min_grade',
  subjectId: 'math',
  minGrade: 'B',
  minValue: null,
  evidenceQuote: 'sekurang-kurangnya gred B dalam Matematik',
  ...over,
});

const draft = () =>
  Requirement.draft('req1', { programId: 'p1', entryRoute: 'spm', versionNo: 2, sourceId: null, preparedBy: 'aina', rules: [rule()] });

describe('Requirement', () => {
  it('rejects a rule without evidence from the source', () => {
    expect(() => Requirement.draft('x', { programId: 'p1', entryRoute: 'spm', versionNo: 1, sourceId: null, preparedBy: 'aina', rules: [rule({ evidenceQuote: ' ' })] })).toThrow(DomainError);
  });

  it('does not let the preparer approve their own draft', () => {
    const req = draft();
    req.submitForReview('aina');
    expect(() => req.approve('aina')).toThrow(/Another admin/);
  });

  it('publishes when another admin approves, and raises an event', () => {
    const req = draft();
    req.submitForReview('aina');
    req.approve('faiz');
    expect(req.status).toBe('published');
    expect(req.pullEvents().map((e) => e.name)).toEqual([Events.RequirementPublished]);
  });

  it('needs a reason to return a draft, then allows editing again', () => {
    const req = draft();
    req.submitForReview('aina');
    expect(() => req.returnToPreparer('faiz', '')).toThrow(DomainError);
    req.returnToPreparer('faiz', 'Prospektus 2027 says B, not C');
    expect(req.status).toBe('returned');
    req.replaceRules([rule({ minGrade: 'C' })]);
    expect(req.rules[0]?.minGrade).toBe('C');
  });

  it('cannot be edited once published', () => {
    const req = draft();
    req.submitForReview('aina');
    req.approve('faiz');
    expect(() => req.replaceRules([rule()])).toThrow(/new version/);
  });
});
