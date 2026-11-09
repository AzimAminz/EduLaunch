import { describe, expect, it } from 'vitest';
import { rowsForSpmStream, type SubjectOption } from './records';

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
