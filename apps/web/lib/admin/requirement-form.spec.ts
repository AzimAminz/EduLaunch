import { describe, expect, it } from 'vitest';
import { checkGroups, gradesFor, groupsFromRules, newRule, subjectQualificationsFor, type EditorGroup } from './requirement-form';

const MATH = '00000000-0000-4000-8000-000000000001';
const PHYS = '00000000-0000-4000-8000-000000000002';

describe('groupsFromRules', () => {
  it('turns stored rules into lines in group order, alternatives together, key subjects as grade rules', () => {
    const groups = groupsFromRules([
      { groupNo: 2, ruleType: 'key_subject', subjectId: PHYS, minGrade: 'C', minValue: null, evidenceQuote: 'C dalam Fizik atau Matematik' },
      { groupNo: 1, ruleType: 'min_cgpa', subjectId: null, minGrade: null, minValue: 2.75, evidenceQuote: 'PNGK 2.75' },
      { groupNo: 2, ruleType: 'min_grade', subjectId: MATH, minGrade: 'C', minValue: null, evidenceQuote: null },
    ]);
    expect(groups).toEqual([
      { quote: 'PNGK 2.75', rules: [{ type: 'min_cgpa', subjectId: null, grade: null, value: '2.75' }] },
      {
        quote: 'C dalam Fizik atau Matematik',
        rules: [
          { type: 'min_grade', subjectId: PHYS, grade: 'C', value: '' },
          { type: 'min_grade', subjectId: MATH, grade: 'C', value: '' },
        ],
      },
    ]);
  });
});

describe('checkGroups', () => {
  it('numbers the lines from 1 and copies each line source sentence to its rules', () => {
    const groups: EditorGroup[] = [
      { quote: ' Kepujian dalam lima subjek ', rules: [{ type: 'min_credits', subjectId: null, grade: 'C', value: '5' }] },
      { quote: 'B dalam Matematik', rules: [{ type: 'min_grade', subjectId: MATH, grade: 'B', value: '' }] },
      { quote: 'PNGK sekurang-kurangnya 2,75', rules: [{ type: 'min_cgpa', subjectId: MATH, grade: 'A', value: '2,75' }] },
    ];
    const { rules, problems } = checkGroups(groups);
    expect(problems).toEqual([]);
    expect(rules).toEqual([
      { groupNo: 1, ruleType: 'min_credits', subjectId: null, minGrade: 'C', minValue: 5, evidenceQuote: 'Kepujian dalam lima subjek' },
      { groupNo: 2, ruleType: 'min_grade', subjectId: MATH, minGrade: 'B', minValue: null, evidenceQuote: 'B dalam Matematik' },
      // Leftovers from another rule type are dropped; a comma works as the decimal point.
      { groupNo: 3, ruleType: 'min_cgpa', subjectId: null, minGrade: null, minValue: 2.75, evidenceQuote: 'PNGK sekurang-kurangnya 2,75' },
    ]);
  });

  it('reports each missing or out-of-range part by line and rule', () => {
    const { problems } = checkGroups([
      { quote: 'abc', rules: [newRule('min_grade')] },
      { quote: 'Sumber yang sah', rules: [{ ...newRule('min_cgpa'), value: '4.5' }, { ...newRule('min_muet'), value: '0' }, { ...newRule('min_credits'), value: '2.5' }] },
    ]);
    expect(problems).toEqual([
      { group: 0, rule: -1, problem: 'quoteRequired' },
      { group: 0, rule: 0, problem: 'subjectRequired' },
      { group: 0, rule: 0, problem: 'gradeRequired' },
      { group: 1, rule: 0, problem: 'cgpaRange' },
      { group: 1, rule: 1, problem: 'muetRange' },
      { group: 1, rule: 2, problem: 'creditsRange' },
    ]);
  });
});

describe('subjects and grades', () => {
  it('offers the route own subjects plus SPM', () => {
    expect(subjectQualificationsFor('spm')).toEqual(['spm']);
    expect(subjectQualificationsFor('stpm')).toEqual(['stpm', 'spm']);
    expect(subjectQualificationsFor('matrikulasi')).toEqual(['matriculation', 'foundation', 'spm']);
  });

  it('lists the grades of the subject exam, SPM when unknown', () => {
    expect(gradesFor('stpm')).toContain('B-');
    expect(gradesFor('a_level')[0]).toBe('A*');
    expect(gradesFor(undefined)[0]).toBe('A+');
  });
});
