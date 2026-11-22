import { describe, expect, it } from 'vitest';
import { matchSlipRows, similarity, type SlipRow } from './slip';
import type { SubjectOption } from '@/lib/profile/records';

const subject = (id: string, name: string): SubjectOption => ({ id, name, category: 'core', isMandatory: false, keywords: [name] });
const subjects = [subject('bm', 'Bahasa Melayu'), subject('sej', 'Sejarah'), subject('am', 'Matematik Tambahan'), subject('bio', 'Biologi')];
const GRADES = ['A+', 'A', 'A-', 'B+', 'B', 'C+', 'C', 'D', 'E', 'G'];
const row = (code: string, name: string, grade: string | null, confidence = 0.99): SlipRow => ({ code, name, grade, confidence });

describe('matchSlipRows', () => {
  it('finds each subject by its official code, with nothing to check on a clean reading', () => {
    const rows = matchSlipRows([row('1103', 'BAHASA MELAYU', 'A'), row('3472', 'MATEMATIK TAMBAHAN', 'B+')], subjects, GRADES);
    expect(rows).toEqual([
      { subjectId: 'bm', grade: 'A', flags: [] },
      { subjectId: 'am', grade: 'B+', flags: [] },
    ]);
  });

  it('trusts the code over a misread name, but flags the difference', () => {
    const [r] = matchSlipRows([row('4551', 'B1OL0', 'C')], subjects, GRADES);
    expect(r).toMatchObject({ subjectId: 'bio', grade: 'C' });
    expect(r!.flags).toContain('name_differs');
  });

  it('leaves a grade that is not on the scale empty and flags an unsure reading', () => {
    const [r] = matchSlipRows([row('3472', 'MATEMATIK TAMBAHAN 8', null, 0.66)], subjects, GRADES);
    expect(r).toMatchObject({ subjectId: 'am', grade: '' });
    expect(r!.flags).toEqual(expect.arrayContaining(['low_confidence', 'no_grade']));
  });

  it('keeps a subject that is not in our list under its official name, flagged', () => {
    const [r] = matchSlipRows([row('2280', 'GEOGRAFI', 'A')], subjects, GRADES);
    expect(r).toMatchObject({ customName: 'Geografi', grade: 'A' });
    expect(r!.flags).toContain('not_in_list');
  });

  it('flags a code that is not an SPM code and does not repeat a subject', () => {
    const rows = matchSlipRows([row('9999', 'SEJARAH', 'B'), row('1249', 'SEJARAH', 'B')], subjects, GRADES);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.flags).toContain('unknown_code');
  });
});

describe('similarity', () => {
  it('scores alike names high and different names low', () => {
    expect(similarity('BAHASA MELAYU', 'Bahasa Melayu')).toBe(1);
    expect(similarity('BAHASA MELAYV', 'BAHASA MELAYU')).toBeGreaterThan(0.9);
    expect(similarity('FIZIK', 'SEJARAH')).toBeLessThan(0.4);
  });
});
