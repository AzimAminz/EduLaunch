import { DomainError } from '@edulaunch/ddd';
import { Events } from '@edulaunch/contracts';
import { AcademicRecord } from './academic-record.js';

const spm = () => AcademicRecord.start('rec1', { studentId: 's1', qualification: 'spm', kind: 'actual', examYear: 2026 });

describe('AcademicRecord', () => {
  it('accepts SPM grades and normalises case', () => {
    const r = spm();
    r.setGrade('math', 'a+');
    expect(r.subjects).toEqual([{ subjectId: 'math', grade: 'A+', customName: null, readConfidence: null }]);
  });

  it('rejects grades that are not on the scale', () => {
    expect(() => spm().setGrade('math', 'B1')).toThrow(/not a SPM grade/);
  });

  it('lets students remove a subject they do not take', () => {
    const r = spm();
    r.setGrade('moral', 'B');
    r.setGrade('pai', 'A');
    r.removeSubject('moral');
    expect(r.subjects.map((s) => s.subjectId)).toEqual(['pai']);
  });

  it('needs subjects before confirming, then raises an event', () => {
    const r = spm();
    expect(() => r.confirm()).toThrow(DomainError);
    r.setGrade('math', 'B');
    r.confirm();
    expect(r.isConfirmed).toBe(true);
    expect(r.pullEvents()[0]?.name).toBe(Events.AcademicRecordConfirmed);
  });

  it('replaces the whole subject list, checking every grade', () => {
    const r = spm();
    r.setGrade('moral', 'B');
    r.replaceSubjects([
      { subjectId: 'math', grade: 'a' },
      { subjectId: 'bm', grade: 'B+' },
    ]);
    expect(r.subjects.map((s) => `${s.subjectId}:${s.grade}`)).toEqual(['math:A', 'bm:B+']);
    expect(() => r.replaceSubjects([{ subjectId: 'math', grade: 'F' }])).toThrow(/not a SPM grade/);
  });

  it('keeps subjects that are not in the catalogue under the name the student typed', () => {
    const r = spm();
    r.replaceSubjects([
      { subjectId: 'math', grade: 'A' },
      { subjectId: 'x1', grade: 'B', customName: '  Tasawwur   Islam ' },
    ]);
    expect(r.subjects[1]).toEqual({ subjectId: 'x1', grade: 'B', customName: 'Tasawwur Islam', readConfidence: null });
    expect(() =>
      spm().replaceSubjects([
        { subjectId: 'x1', grade: 'B', customName: 'Tasawwuf' },
        { subjectId: 'x2', grade: 'A', customName: 'tasawwuf' },
      ]),
    ).toThrow(/only be listed once/);
    expect(() => spm().replaceSubjects([{ subjectId: 'x1', grade: 'B', customName: 'x'.repeat(81) }])).toThrow(/at most 80/);
  });

  it('does not accept the same subject twice', () => {
    expect(() =>
      spm().replaceSubjects([
        { subjectId: 'math', grade: 'A' },
        { subjectId: 'math', grade: 'B' },
      ]),
    ).toThrow(/only be listed once/);
  });

  it('checks the exam year', () => {
    const r = spm();
    r.setExamYear(2025);
    expect(r.toSnapshot().examYear).toBe(2025);
    expect(() => r.setExamYear(1990)).toThrow(DomainError);
  });

  it('keeps school grades and SPM grades apart', () => {
    expect(() => AcademicRecord.start('x', { studentId: 's1', qualification: 'spm', kind: 'school', examYear: null })).toThrow(DomainError);
    expect(() => AcademicRecord.start('x', { studentId: 's1', qualification: 'school', kind: 'target', examYear: null })).toThrow(DomainError);
  });

  it('records a diploma by CGPA, MUET and field, without subject grades', () => {
    const r = AcademicRecord.start('d1', { studentId: 's1', qualification: 'diploma', kind: 'actual', examYear: 2026 });
    expect(() => r.setGrade('math', 'A')).toThrow(/without subject grades/);
    expect(() => r.confirm()).toThrow(/CGPA/);
    r.setResultDetails({ cgpa: 3.42, muetBand: 3, fieldId: 'f1', programmeName: ' Diploma Sains Komputer ' });
    r.confirm();
    expect(r.toSnapshot()).toMatchObject({ cgpa: 3.42, muetBand: 3, fieldId: 'f1', programmeName: 'Diploma Sains Komputer', status: 'confirmed' });
  });

  it('checks CGPA and MUET values, and what applies to each qualification', () => {
    const stpm = AcademicRecord.start('t1', { studentId: 's1', qualification: 'stpm', kind: 'actual', examYear: 2026 });
    expect(() => stpm.setResultDetails({ cgpa: 4.5, muetBand: null, fieldId: null, programmeName: null })).toThrow(/0.00 to 4.00/);
    expect(() => stpm.setResultDetails({ cgpa: 3.123, muetBand: null, fieldId: null, programmeName: null })).toThrow(/0.00 to 4.00/);
    expect(() => stpm.setResultDetails({ cgpa: 3, muetBand: 2.2, fieldId: null, programmeName: null })).toThrow(/MUET band/);
    expect(() => stpm.setResultDetails({ cgpa: 3, muetBand: 4, fieldId: 'f1', programmeName: null })).toThrow(/Only a diploma or certificate/);
    expect(() => spm().setResultDetails({ cgpa: 3, muetBand: null, fieldId: null, programmeName: null })).toThrow(/no CGPA/);
    const aLevel = AcademicRecord.start('a1', { studentId: 's1', qualification: 'a_level', kind: 'actual', examYear: 2026 });
    expect(() => aLevel.setResultDetails({ cgpa: 3, muetBand: null, fieldId: null, programmeName: null })).toThrow(/no CGPA/);
    aLevel.setGrade('maths', 'a*');
    expect(aLevel.subjects[0]?.grade).toBe('A*');
  });

  it('records SKM with its level and field, without CGPA', () => {
    const skm = AcademicRecord.start('k1', { studentId: 's1', qualification: 'skm', kind: 'actual', examYear: 2025 });
    expect(() => skm.setResultDetails({ cgpa: 3, muetBand: null, fieldId: null, programmeName: null })).toThrow(/no CGPA/);
    expect(() => skm.setResultDetails({ cgpa: null, muetBand: null, fieldId: null, programmeName: null, qualificationLevel: 4 })).toThrow(/1, 2, 3/);
    expect(() => skm.confirm()).toThrow(/level/);
    skm.setResultDetails({ cgpa: null, muetBand: null, fieldId: 'f1', programmeName: 'SKM Pendawaian Elektrik', qualificationLevel: 3 });
    skm.confirm();
    expect(skm.toSnapshot()).toMatchObject({ qualificationLevel: 3, fieldId: 'f1', status: 'confirmed' });
  });

  it('records a certificate or DKM like a diploma: CGPA, field and (for DKM) level 4 or 5', () => {
    const cert = AcademicRecord.start('c1', { studentId: 's1', qualification: 'certificate', kind: 'actual', examYear: 2025 });
    cert.setResultDetails({ cgpa: 3.2, muetBand: null, fieldId: 'f1', programmeName: 'Sijil Teknologi Elektrik', qualificationLevel: null });
    cert.confirm();
    const dkm = AcademicRecord.start('d2', { studentId: 's1', qualification: 'dkm', kind: 'actual', examYear: 2026 });
    expect(() => dkm.setResultDetails({ cgpa: 3, muetBand: null, fieldId: null, programmeName: null, qualificationLevel: 3 })).toThrow(/4, 5/);
    dkm.setResultDetails({ cgpa: 3, muetBand: null, fieldId: null, programmeName: null, qualificationLevel: 5 });
    dkm.confirm();
    expect(dkm.isConfirmed).toBe(true);
  });

  it('records a matriculation stream and optional subject grades', () => {
    const m = AcademicRecord.start('m1', { studentId: 's1', qualification: 'matriculation', kind: 'actual', examYear: 2026 });
    expect(() => m.setResultDetails({ cgpa: 3.5, muetBand: 4, fieldId: null, programmeName: null, stream: 'medicine' })).toThrow(/stream from the list/);
    m.setResultDetails({ cgpa: 3.5, muetBand: 4, fieldId: null, programmeName: null, stream: null });
    expect(() => m.confirm()).toThrow(/stream/);
    m.setResultDetails({ cgpa: 3.5, muetBand: 4, fieldId: null, programmeName: null, stream: 'science_1' });
    m.confirm();
    expect(m.isConfirmed).toBe(true);
    m.setGrade('bio', 'b+');
    expect(m.subjects[0]?.grade).toBe('B+');
  });

  it('keeps the GPA of each semester for matriculation and foundation only', () => {
    const m = AcademicRecord.start('m2', { studentId: 's1', qualification: 'matriculation', kind: 'actual', examYear: 2026 });
    m.setResultDetails({ cgpa: 3.6, muetBand: null, fieldId: null, programmeName: null, stream: 'science_2', semesterGpas: [3.5, null, 3.7, 3.8] });
    expect(m.toSnapshot().semesterGpas).toEqual([3.5, null, 3.7, 3.8]);
    expect(() => m.setResultDetails({ cgpa: 3.6, muetBand: null, fieldId: null, programmeName: null, stream: 'science_2', semesterGpas: [4.2] })).toThrow(/0.00 to 4.00/);
    expect(() => m.setResultDetails({ cgpa: 3.6, muetBand: null, fieldId: null, programmeName: null, stream: 'science_2', semesterGpas: Array(9).fill(3) })).toThrow(/At most 8/);
    const d = AcademicRecord.start('d3', { studentId: 's1', qualification: 'diploma', kind: 'actual', examYear: 2026 });
    expect(() => d.setResultDetails({ cgpa: 3, muetBand: null, fieldId: null, programmeName: null, semesterGpas: [3] })).toThrow(/no semesters/);
  });

  it('keeps a field the student typed when it is not in the list', () => {
    const f = AcademicRecord.start('f2', { studentId: 's1', qualification: 'foundation', kind: 'actual', examYear: 2026 });
    f.setResultDetails({ cgpa: 3, muetBand: null, fieldId: null, customFieldName: '  Sains   Sukan ', programmeName: 'Asasi Sains Sukan' });
    expect(f.toSnapshot().customFieldName).toBe('Sains Sukan');
    expect(() => f.setResultDetails({ cgpa: 3, muetBand: null, fieldId: 'f1', customFieldName: 'Sains Sukan', programmeName: null })).toThrow(/not both/);
  });

  it('records a foundation programme by field and name, with optional subject grades', () => {
    const f = AcademicRecord.start('f1', { studentId: 's1', qualification: 'foundation', kind: 'actual', examYear: 2026 });
    expect(() => f.setResultDetails({ cgpa: 3, muetBand: null, fieldId: null, programmeName: null, stream: 'science_1' })).toThrow(/Only matriculation/);
    f.setResultDetails({ cgpa: 3.2, muetBand: null, fieldId: 'f1', programmeName: 'Asasi Sains Hayat' });
    f.confirm();
    expect(f.toSnapshot()).toMatchObject({ programmeName: 'Asasi Sains Hayat', status: 'confirmed' });
  });

  it('needs STPM subjects and CGPA before confirming', () => {
    const stpm = AcademicRecord.start('t1', { studentId: 's1', qualification: 'stpm', kind: 'actual', examYear: 2026 });
    stpm.setGrade('pa', 'B');
    expect(() => stpm.confirm()).toThrow(/CGPA/);
    stpm.setResultDetails({ cgpa: 3.1, muetBand: 3.5, fieldId: null, programmeName: null });
    stpm.confirm();
    expect(stpm.isConfirmed).toBe(true);
  });

  it('goes back to draft when a confirmed grade is changed', () => {
    const r = spm();
    r.setGrade('math', 'B');
    r.confirm();
    r.setGrade('math', 'C');
    expect(r.isConfirmed).toBe(false);
  });
});
