import { describe, expect, it } from 'vitest';
import { recordLabel, rowsForSpmStream, type SubjectOption } from './records';

const subject = (id: string, name: string, isMandatory = false): SubjectOption => ({ id, name, category: 'x', isMandatory, keywords: [name] });
const subjects = [
  subject('bm', 'Bahasa Melayu', true),
  subject('math', 'Matematik', true),
  subject('am', 'Matematik Tambahan'),
  subject('phy', 'Fizik'),
  subject('chem', 'Kimia'),
  subject('bio', 'Biologi'),
  subject('cs', 'Sains Komputer'),
  subject('sci', 'Sains'),
  subject('eko', 'Ekonomi'),
];
const ids = (rows: { subjectId: string }[]) => rows.map((r) => r.subjectId).sort();

describe('rowsForSpmStream', () => {
  it('adds the compulsory subjects and the STEM A sciences', () => {
    expect(ids(rowsForSpmStream('stem_a', subjects, [], 'ms'))).toEqual(['am', 'bio', 'bm', 'chem', 'math', 'phy']);
  });

  it('keeps grades already entered and any graded extra subject', () => {
    const rows = rowsForSpmStream('stem_a', subjects, [{ subjectId: 'phy', grade: 'A' }, { subjectId: 'eko', grade: 'B' }], 'ms');
    expect(rows.find((r) => r.subjectId === 'phy')?.grade).toBe('A');
    expect(ids(rows)).toContain('eko');
  });

  it('drops ungraded electives of the stream chosen before', () => {
    const first = rowsForSpmStream('stem_a', subjects, [], 'ms');
    const second = rowsForSpmStream('humanities', subjects, first, 'ms');
    expect(ids(second)).toEqual(['bm', 'eko', 'math', 'sci']);
  });
});

describe('recordLabel', () => {
  const names = { labels: { school: 'Prestasi sekolah {year}', target: 'Gred Tingkatan 4–5 {year}', actual: 'Keputusan SPM {year}' } as never, withForm: { school: 'Prestasi Tingkatan {form} ({year})', target: 'Gred sasaran Tingkatan {form} ({year})' }, noYear: '' };

  it('names the form when it is known', () => {
    expect(recordLabel({ qualification: 'school', kind: 'school', examYear: 2026, formLevel: 3 }, names)).toBe('Prestasi Tingkatan 3 (2026)');
  });

  it('falls back to the year alone for an older record without a form', () => {
    expect(recordLabel({ qualification: 'school', kind: 'school', examYear: 2026, formLevel: null }, names)).toBe('Prestasi sekolah 2026');
  });
});
