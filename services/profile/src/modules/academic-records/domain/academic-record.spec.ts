import { DomainError } from '@edulaunch/ddd';
import { Events } from '@edulaunch/contracts';
import { AcademicRecord } from './academic-record.js';

const spm = () => AcademicRecord.start('rec1', { studentId: 's1', qualification: 'spm', kind: 'actual', examYear: 2026 });

describe('AcademicRecord', () => {
  it('accepts SPM grades and normalises case', () => {
    const r = spm();
    r.setGrade('math', 'a+');
    expect(r.subjects).toEqual([{ subjectId: 'math', grade: 'A+', readConfidence: null }]);
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

  it('goes back to draft when a confirmed grade is changed', () => {
    const r = spm();
    r.setGrade('math', 'B');
    r.confirm();
    r.setGrade('math', 'C');
    expect(r.isConfirmed).toBe(false);
  });
});
