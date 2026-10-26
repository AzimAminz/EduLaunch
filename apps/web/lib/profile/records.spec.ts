import { describe, expect, it } from 'vitest';
import { examYearsFor, parseRecordSubmission, recordFormFor, sortRows, startingRows } from './records';

const id = (n: number) => `00000000-0000-4000-8000-00000000000${n}`;
const subjects = [
  { id: id(1), name: 'Sejarah', category: 'core', isMandatory: true },
  { id: id(2), name: 'Biologi', category: 'science', isMandatory: false },
  { id: id(3), name: 'Bahasa Melayu', category: 'core', isMandatory: true },
  { id: id(4), name: 'Ekonomi', category: 'business', isMandatory: false },
];

const form = (values: Record<string, string>) => {
  const data = new FormData();
  for (const [k, v] of Object.entries(values)) data.set(k, v);
  return data;
};

describe('recordFormFor', () => {
  it('gives each education level its own results form', () => {
    expect(recordFormFor('form1_3')).toEqual({ variant: 'school', qualification: 'school', kind: 'school' });
    expect(recordFormFor('form4_5')).toEqual({ variant: 'target', qualification: 'spm', kind: 'target' });
    expect(recordFormFor('after_spm')).toEqual({ variant: 'actual', qualification: 'spm', kind: 'actual' });
    expect(recordFormFor('after_diploma').variant).toBe('basic');
  });
});

describe('examYearsFor', () => {
  it('looks ahead for targets and back for results', () => {
    expect(examYearsFor(recordFormFor('form4_5'), 2026)).toEqual([2026, 2027, 2028]);
    expect(examYearsFor(recordFormFor('form1_3'), 2026)).toEqual([2026, 2025]);
    expect(examYearsFor(recordFormFor('after_spm'), 2026)[0]).toBe(2026);
    expect(examYearsFor(recordFormFor('after_spm'), 2026)).toHaveLength(6);
  });
});

describe('rows', () => {
  it('start with the compulsory subjects, without grades', () => {
    expect(startingRows(subjects, 'ms')).toEqual([
      { subjectId: id(3), grade: '' },
      { subjectId: id(1), grade: '' },
    ]);
  });

  it('list compulsory subjects first, then by name', () => {
    const rows = [id(4), id(1), id(2), id(3)].map((subjectId) => ({ subjectId, grade: 'A' }));
    expect(sortRows(rows, subjects, 'ms').map((r) => r.subjectId)).toEqual([id(3), id(1), id(2), id(4)]);
  });
});

describe('parseRecordSubmission', () => {
  const grades = ['A', 'B', 'C'];

  it('reads the rows and the exam year', () => {
    const result = parseRecordSubmission(form({ examYear: '2025', subjects: JSON.stringify([{ subjectId: id(1), grade: 'A' }]) }), grades);
    expect(result).toEqual({ examYear: 2025, subjects: [{ subjectId: id(1), grade: 'A' }] });
  });

  it('needs at least one subject, and a grade for each', () => {
    expect(parseRecordSubmission(form({ subjects: '[]' }), grades)).toEqual({ error: 'noSubjects' });
    expect(parseRecordSubmission(form({ subjects: JSON.stringify([{ subjectId: id(1), grade: '' }]) }), grades)).toEqual({ error: 'missingGrade' });
    expect(parseRecordSubmission(form({ subjects: JSON.stringify([{ subjectId: id(1), grade: 'A+' }]) }), grades)).toEqual({ error: 'missingGrade' });
  });

  it('rejects broken or repeated rows', () => {
    expect(parseRecordSubmission(form({ subjects: 'not json' }), grades)).toEqual({ error: 'generic' });
    const twice = JSON.stringify([{ subjectId: id(1), grade: 'A' }, { subjectId: id(1), grade: 'B' }]);
    expect(parseRecordSubmission(form({ subjects: twice }), grades)).toEqual({ error: 'generic' });
  });

  it('leaves the year empty when none is chosen', () => {
    expect(parseRecordSubmission(form({ examYear: '', subjects: JSON.stringify([{ subjectId: id(1), grade: 'B' }]) }), grades)).toMatchObject({ examYear: null });
  });
});
