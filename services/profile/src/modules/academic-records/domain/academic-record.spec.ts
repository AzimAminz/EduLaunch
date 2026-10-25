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

  it('goes back to draft when a confirmed grade is changed', () => {
    const r = spm();
    r.setGrade('math', 'B');
    r.confirm();
    r.setGrade('math', 'C');
    expect(r.isConfirmed).toBe(false);
  });
});
