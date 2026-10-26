import { describe, expect, it } from 'vitest';
import { examYearsFor, formTabsFor, rowsForStream, higherChoicesFor, matchOfficialSubject, parseCgpa, parseHigherSubmission, parseRecordSubmission, recordFormFor, sortRows, startingRows } from './records';

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
    expect(recordFormFor('after_certificate').variant).toBe('basic');
    expect(recordFormFor('after_preu').variant).toBe('basic');
  });
});

describe('examYearsFor', () => {
  it('looks ahead for targets and back for results', () => {
    expect(examYearsFor(recordFormFor('form4_5'), 2026, 4)).toEqual([2026]);
    expect(examYearsFor(recordFormFor('form4_5'), 2026, 5)).toEqual([2026, 2025]);
    expect(examYearsFor(recordFormFor('form1_3'), 2026, 3)).toEqual([2026, 2025, 2024]);
    expect(examYearsFor(recordFormFor('form1_3'), 2026, 1)).toEqual([2026]);
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
  it('offers certificates after a certificate, and pre-university or diploma qualifications for a degree', () => {
    expect(higherChoicesFor('after_certificate')).toEqual(['certificate', 'svm', 'skm']);
    expect(higherChoicesFor('after_preu')).toEqual(['stpm', 'matriculation', 'foundation', 'a_level', 'diploma', 'dvm', 'dkm']);
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
      qualificationLevel: null,
      stream: null,
      subjects: [],
    });
  });

  it('needs the level for SKM (1–3) and DKM (4–5)', () => {
    expect(parseHigherSubmission(form({ examYear: '2025' }), 'skm')).toEqual({ error: 'levelRequired' });
    expect(parseHigherSubmission(form({ examYear: '2025', qualificationLevel: '4' }), 'skm')).toEqual({ error: 'levelRequired' });
    expect(parseHigherSubmission(form({ examYear: '2025', qualificationLevel: '3' }), 'skm')).toMatchObject({ qualificationLevel: 3, cgpa: null });
    expect(parseHigherSubmission(form({ examYear: '2025', cgpa: '3.1', qualificationLevel: '5' }), 'dkm')).toMatchObject({ qualificationLevel: 5, cgpa: 3.1 });
  });

  it('needs subject grades for STPM and A-Level, on their own scales', () => {
    expect(parseHigherSubmission(form({ examYear: '2026', cgpa: '3', subjects: '[]' }), 'stpm')).toEqual({ error: 'noSubjects' });
    const aLevel = parseHigherSubmission(form({ examYear: '2026', subjects: JSON.stringify([{ subjectId: id(1), grade: 'A*' }]) }), 'a_level');
    expect(aLevel).toMatchObject({ cgpa: null, subjects: [{ subjectId: id(1), grade: 'A*' }] });
    expect(parseHigherSubmission(form({ examYear: '2026', cgpa: '3', subjects: JSON.stringify([{ subjectId: id(1), grade: 'A+' }]) }), 'stpm')).toEqual({ error: 'missingGrade' });
  });

  it('ignores a MUET band that does not exist', () => {
    expect(parseHigherSubmission(form({ examYear: '2026', cgpa: '3', muetBand: '2.2' }), 'foundation')).toMatchObject({ muetBand: null });
  });
});

describe('formTabsFor', () => {
  const school = recordFormFor('form1_3');
  it('has one tab per year in Form 1–3, named by form', () => {
    expect(formTabsFor(school, 1, 2026)).toEqual([{ form: 1, year: 2026 }]);
    expect(formTabsFor(school, 2, 2026)).toEqual([
      { form: 2, year: 2026 },
      { form: 1, year: 2025 },
    ]);
    expect(formTabsFor(school, 3, 2026).map((t) => `${t.form}:${t.year}`)).toEqual(['3:2026', '2:2025', '1:2024']);
  });

  it('shows Form 4 alone, and Form 5 with last year as Form 4', () => {
    const upper = recordFormFor('form4_5');
    expect(formTabsFor(upper, 4, 2026)).toEqual([{ form: 4, year: 2026 }]);
    expect(formTabsFor(upper, 5, 2026)).toEqual([
      { form: 5, year: 2026 },
      { form: 4, year: 2025 },
    ]);
  });
});

describe('matriculation', () => {
  const options = ['Matematik', 'Kimia', 'Fizik', 'Biologi', 'Sains Komputer'].map((n, i) => {
    const name = `${n} (Matrikulasi)`;
    return { id: id(i + 1), name, category: 'science', isMandatory: false, keywords: [name] };
  });

  it('fills in the subjects of a stream, keeping grades already entered', () => {
    const rows = rowsForStream('science_2', options, [{ subjectId: id(1), grade: 'A' }, { subjectId: id(4), grade: 'B' }]);
    expect(rows).toEqual([
      { subjectId: id(1), grade: 'A' },
      { subjectId: id(2), grade: '' },
      { subjectId: id(3), grade: '' },
      { subjectId: id(5), grade: '' },
      { subjectId: id(4), grade: 'B' },
    ]);
  });

  it('needs the stream, and saves only subjects with a grade', () => {
    expect(parseHigherSubmission(form({ examYear: '2026', cgpa: '3.5' }), 'matriculation')).toEqual({ error: 'streamRequired' });
    const rows = JSON.stringify([{ subjectId: id(1), grade: 'A-' }, { subjectId: id(2), grade: '' }]);
    expect(parseHigherSubmission(form({ examYear: '2026', cgpa: '3.5', stream: 'science_1', subjects: rows }), 'matriculation')).toMatchObject({
      stream: 'science_1',
      subjects: [{ subjectId: id(1), grade: 'A-' }],
    });
    expect(parseHigherSubmission(form({ examYear: '2026', cgpa: '3.2', subjects: '[]' }), 'foundation')).toMatchObject({ subjects: [], stream: null });
  });
});
