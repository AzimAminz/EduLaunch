import { describe, expect, it } from 'vitest';
import { checkLines, gradesFor, linesFromRules, newLine, subjectQualificationsFor } from './requirement-form';

describe('linesFromRules', () => {
  it('puts Syarat Am first, keeps sections, and turns a shared group into lines joined by ATAU', () => {
    const lines = linesFromRules([
      { orGroup: 3, conditionType: 'min_grade', subjectId: 'phy', minGrade: 'C', minValue: null, officialText: 'Fizik atau Sains', part: 'special', position: 0 },
      { orGroup: 3, conditionType: 'key_subject', subjectId: 'sci', minGrade: 'C', minValue: null, officialText: 'Fizik atau Sains', part: 'special', position: 1 },
      { orGroup: 1, conditionType: 'note', subjectId: null, minGrade: null, minValue: null, officialText: 'Memiliki SPM:-', part: 'general', section: 'SPM' },
      { orGroup: 2, conditionType: 'subjects_from_list', subjectId: null, minGrade: 'C', minValue: null, officialText: 'Gred C dalam DUA (2)', part: 'special', subjectIds: ['a', 'b', 'c'], minCount: 2 },
    ]);
    expect(lines.map((l) => [l.part, l.type, l.join])).toEqual([
      ['general', 'note', 'and'],
      ['special', 'subjects_from_list', 'and'],
      ['special', 'min_grade', 'and'],
      ['special', 'min_grade', 'or'],
    ]);
    expect(lines[0]!.section).toBe('SPM');
    expect(lines[1]).toMatchObject({ subjectIds: ['a', 'b', 'c'], count: '2', grade: 'C' });
  });
});

describe('checkLines', () => {
  it('numbers groups across both parts, joins ATAU lines into one group, and keeps notes on their own', () => {
    const { rules, problems } = checkLines([
      newLine('special', { type: 'min_grade', subjectId: 'bm', grade: 'C', text: 'Gred C BM' }),
      newLine('general', { type: 'note', text: 'Memiliki SPM:-', section: 'SPM' }),
      newLine('special', { type: 'min_grade', subjectId: 'phy', grade: 'C', text: 'Fizik', join: 'or' }),
      newLine('special', { type: 'declaration', text: 'Lulus temu duga', join: 'or' }),
      newLine('special', { type: 'subjects_from_list', subjectIds: ['a', 'b', 'c'], grade: 'C', count: '2', text: 'Gred C dalam DUA (2)' }),
    ]);
    expect(problems).toEqual([]);
    expect(rules.map((r) => [r.part, r.orGroup, r.conditionType, r.position])).toEqual([
      ['general', 1, 'note', 0],
      ['special', 2, 'min_grade', 1],
      ['special', 2, 'min_grade', 2],
      ['special', 3, 'declaration', 3],
      ['special', 4, 'subjects_from_list', 4],
    ]);
    expect(rules[0]!.section).toBe('SPM');
    expect(rules[4]).toMatchObject({ subjectIds: ['a', 'b', 'c'], minCount: 2, minGrade: 'C', minValue: null });
  });

  it('reports each missing or out-of-range value by line', () => {
    const { problems } = checkLines([
      newLine('special', { type: 'min_grade', text: '' }),
      newLine('special', { type: 'subjects_from_list', subjectIds: ['a'], grade: 'C', count: '3', text: 'Senarai' }),
      newLine('special', { type: 'min_cgpa', value: '5', text: 'PNGK' }),
      newLine('special', { type: 'min_muet', value: '0.5', text: 'MUET' }),
      newLine('special', { type: 'min_credits', value: '2.5', text: 'Kredit' }),
    ]);
    expect(problems).toEqual([
      { line: 0, problem: 'textRequired' },
      { line: 0, problem: 'subjectRequired' },
      { line: 0, problem: 'gradeRequired' },
      { line: 1, problem: 'countRange' },
      { line: 2, problem: 'cgpaRange' },
      { line: 3, problem: 'muetRange' },
      { line: 4, problem: 'creditsRange' },
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
