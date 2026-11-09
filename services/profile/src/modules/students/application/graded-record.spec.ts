import { describe, expect, it } from 'vitest';
import { gradedRecordFor } from './student.use-cases.js';

const rec = (qualification: string, kind: string) => ({ qualification, kind, subjects: [] });
const school = rec('school', 'school');
const target = rec('spm', 'target');
const actual = rec('spm', 'actual');

describe('gradedRecordFor', () => {
  it('reads school results in Form 1–3', () => {
    expect(gradedRecordFor('form1_3', [school, target])).toBe(school);
  });

  it('reads SPM targets in Form 4–5, a trial result saved as actual only when there are no targets', () => {
    expect(gradedRecordFor('form4_5', [actual, target, school])).toBe(target);
    expect(gradedRecordFor('form4_5', [actual, school])).toBe(actual);
  });

  it('reads only actual SPM results after SPM, never school grades or old targets', () => {
    expect(gradedRecordFor('after_spm', [target, school, actual])).toBe(actual);
    expect(gradedRecordFor('after_spm', [target, school])).toBeUndefined();
  });

  it('gives a diploma holder with only Form 3 school results no grades (so they are asked for SPM), not school grades', () => {
    expect(gradedRecordFor('after_preu', [school, rec('diploma', 'actual')])).toBeUndefined();
    expect(gradedRecordFor('after_certificate', [school])).toBeUndefined();
  });
});
