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
  Requirement.draft('req1', { programId: 'p1', entryRoute: 'spm', versionNo: 2, sourceId: null, sourceUrl: 'https://contoh.edu.my/prospektus', preparedBy: 'aina', rules: [rule()] });

describe('Requirement', () => {
  it('rejects a rule without evidence from the source', () => {
    expect(() => Requirement.draft('x', { programId: 'p1', entryRoute: 'spm', versionNo: 1, sourceId: null, preparedBy: 'aina', rules: [rule({ evidenceQuote: ' ' })] })).toThrow(DomainError);
  });

  it('does not let the preparer approve their own draft', () => {
    const req = draft();
    req.submitForReview('aina');
    expect(() => req.approve('aina')).toThrow(/Another admin/);
  });

  it('lets a super admin approve their own draft', () => {
    const req = draft();
    req.submitForReview('aina');
    req.approve('aina', 'allowed');
    expect(req.status).toBe('published');
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

  it('accepts known entry routes only', () => {
    expect(() => Requirement.draft('x', { programId: 'p1', entryRoute: 'upu', versionNo: 1, sourceId: null, preparedBy: 'aina', rules: [] })).toThrow(/entry route/);
    expect(() => Requirement.draft('x', { programId: 'p1', entryRoute: 'svm', versionNo: 1, sourceId: null, preparedBy: 'aina', rules: [] })).not.toThrow();
  });

  it('needs a link to the official source before review', () => {
    const req = Requirement.draft('x', { programId: 'p1', entryRoute: 'spm', versionNo: 1, sourceId: null, preparedBy: 'aina', rules: [rule()] });
    expect(() => req.submitForReview('aina')).toThrow(/link to the official source/);
    expect(() => req.edit('aina', { rules: [rule()], sourceUrl: 'prospektus.pdf' })).toThrow(/web link/);
    req.edit('aina', { rules: [rule()], sourceUrl: ' https://contoh.edu.my/a.pdf ' });
    expect(req.toSnapshot().sourceUrl).toBe('https://contoh.edu.my/a.pdf');
    req.submitForReview('aina');
    expect(req.status).toBe('in_review');
  });

  it('lets only the preparer edit a draft', () => {
    expect(() => draft().edit('faiz', { rules: [rule()], sourceUrl: null })).toThrow(/Only the admin/);
  });

  it('checks the value of CGPA, MUET and credit rules', () => {
    const value = (ruleType: RequirementRule['ruleType'], minValue: number | null) => () => draft().replaceRules([rule({ ruleType, subjectId: null, minGrade: null, minValue })]);
    expect(value('min_cgpa', 4.5)).toThrow(/between 0 and 4/);
    expect(value('min_muet', 0)).toThrow(/between 1 and 6/);
    expect(value('min_credits', 2.5)).toThrow(/between 1 and 20/);
    expect(value('min_credits', null)).toThrow(/needs a minimum value/);
    expect(value('min_cgpa', 2.75)).not.toThrow();
  });

  it('starts the next version from the published rules', () => {
    const req = draft();
    req.submitForReview('aina');
    req.approve('faiz');
    let n = 0;
    const next = Requirement.nextVersion('req2', req, 3, 'faiz', () => `new-${++n}`);
    expect(next.status).toBe('draft');
    expect(next.preparedBy).toBe('faiz');
    expect(next.toSnapshot().versionNo).toBe(3);
    expect(next.toSnapshot().sourceUrl).toBe('https://contoh.edu.my/prospektus');
    expect(next.rules.map((r) => [r.id, r.minGrade])).toEqual([['new-1', 'B']]);
  });
});
