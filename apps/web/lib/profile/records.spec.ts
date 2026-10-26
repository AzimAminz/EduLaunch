import { describe, expect, it } from 'vitest';
import { examYearsFor, higherChoicesFor, matchOfficialSubject, parseCgpa, parseHigherSubmission, parseRecordSubmission, recordFormFor, sortRows, startingRows } from './records';

const id = (n: number) => `00000000-0000-4000-8000-00000000000${n}`;
const subjects = [
  { id: id(1), name: 'Sejarah', category: 'core', isMandatory: true, keywords: [] },
  { id: id(2), name: 'Biologi', category: 'science', isMandatory: false, keywords: [] },
  { id: id(3), name: 'Bahasa Melayu', category: 'core', isMandatory: true, keywords: [] },
  { id: id(4), name: 'Ekonomi', category: 'business', isMandatory: false, keywords: [] },
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
    expect(examYearsFor(recordFormFor('form1_3'), 2026)).toEqual([2026, 2025, 2024]);
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
    expect(result).toEqual({ examYear: 2025, subjects: [{ subjectId: id(1), grade: 'A', customName: null }] });
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

  it('needs a year for school results, which are kept per year', () => {
    expect(parseRecordSubmission(form({ subjects: JSON.stringify([{ subjectId: id(1), grade: 'A' }]) }), grades, { yearRequired: true })).toEqual({ error: 'yearRequired' });
  });

  it('tidies the name of a subject the student typed', () => {
    const result = parseRecordSubmission(form({ subjects: JSON.stringify([{ subjectId: id(5), grade: 'A', customName: '  Bahasa   Arab ' }]) }), grades);
    expect(result).toMatchObject({ subjects: [{ customName: 'Bahasa Arab' }] });
  });

  it('leaves the year empty when none is chosen', () => {
    expect(parseRecordSubmission(form({ examYear: '', subjects: JSON.stringify([{ subjectId: id(1), grade: 'B' }]) }), grades)).toMatchObject({ examYear: null });
  });
});

describe('matchOfficialSubject', () => {
  it('finds the official subject by name or another name, ignoring case and spaces', () => {
    const list = [{ id: id(1), name: 'Matematik Tambahan', category: 'science', isMandatory: false, keywords: ['Add Maths'] }];
    expect(matchOfficialSubject('  add   maths ', list)?.id).toBe(id(1));
    expect(matchOfficialSubject('matematik tambahan', list)?.id).toBe(id(1));
    expect(matchOfficialSubject('Tasawwuf', list)).toBeUndefined();
  });
});

describe('results after SPM', () => {
  it('offers STPM, matriculation, foundation or A-Level after pre-university, and a diploma after diploma', () => {
    expect(higherChoicesFor('after_preu')).toEqual(['stpm', 'matriculation', 'foundation', 'a_level']);
    expect(higherChoicesFor('after_diploma')).toEqual(['diploma']);
    expect(higherChoicesFor('after_spm')).toEqual([]);
  });

  it('reads a CGPA written with a dot or a comma', () => {
    expect(parseCgpa('3.42')).toBe(3.42);
    expect(parseCgpa('3,5')).toBe(3.5);
    expect(parseCgpa('4')).toBe(4);
    expect(parseCgpa('')).toBeNull();
    expect(parseCgpa('4.10')).toBe('invalid');
    expect(parseCgpa('3.456')).toBe('invalid');
    expect(parseCgpa('tiga')).toBe('invalid');
  });

  it('needs the year and, except for A-Level, the CGPA', () => {
    expect(parseHigherSubmission(form({ cgpa: '3.2' }), 'diploma')).toEqual({ error: 'yearRequired' });
    expect(parseHigherSubmission(form({ examYear: '2026' }), 'matriculation')).toEqual({ error: 'cgpaRequired' });
    expect(parseHigherSubmission(form({ examYear: '2026', cgpa: '5' }), 'foundation')).toEqual({ error: 'cgpaInvalid' });
  });

  it('keeps the diploma field and programme, but no subjects', () => {
    const field = id(9);
    expect(parseHigherSubmission(form({ examYear: '2026', cgpa: '3.42', muetBand: '3.5', fieldId: field, programmeName: ' Diploma  Sains Komputer ', subjects: '[]' }), 'diploma')).toEqual({
      examYear: 2026,
      cgpa: 3.42,
      muetBand: 3.5,
      fieldId: field,
      programmeName: 'Diploma Sains Komputer',
      subjects: [],
    });
  });

  it('needs subject grades for STPM and A-Level, on their own scales', () => {
    expect(parseHigherSubmission(form({ examYear: '2026', cgpa: '3', subjects: '[]' }), 'stpm')).toEqual({ error: 'noSubjects' });
    const aLevel = parseHigherSubmission(form({ examYear: '2026', subjects: JSON.stringify([{ subjectId: id(1), grade: 'A*' }]) }), 'a_level');
    expect(aLevel).toMatchObject({ cgpa: null, subjects: [{ subjectId: id(1), grade: 'A*' }] });
    expect(parseHigherSubmission(form({ examYear: '2026', cgpa: '3', subjects: JSON.stringify([{ subjectId: id(1), grade: 'A+' }]) }), 'stpm')).toEqual({ error: 'missingGrade' });
  });

  it('ignores a MUET band that does not exist', () => {
    expect(parseHigherSubmission(form({ examYear: '2026', cgpa: '3', muetBand: '2.2' }), 'matriculation')).toMatchObject({ muetBand: null });
  });
});
