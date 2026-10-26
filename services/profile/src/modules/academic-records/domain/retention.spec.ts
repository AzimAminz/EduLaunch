import { recordsToRemove, schoolYearsFor, type RecordSummary } from './retention.js';

const school = (year: number): RecordSummary => ({ id: `school-${year}`, qualification: 'school', kind: 'school', examYear: year });
const target: RecordSummary = { id: 'target', qualification: 'spm', kind: 'target', examYear: 2027 };
const spm: RecordSummary = { id: 'spm', qualification: 'spm', kind: 'actual', examYear: 2025 };
const foundation: RecordSummary = { id: 'foundation', qualification: 'foundation', kind: 'actual', examYear: 2026 };
const diploma: RecordSummary = { id: 'diploma', qualification: 'diploma', kind: 'actual', examYear: 2026 };
const certificate: RecordSummary = { id: 'certificate', qualification: 'certificate', kind: 'actual', examYear: 2025 };
const svm: RecordSummary = { id: 'svm', qualification: 'svm', kind: 'actual', examYear: 2025 };
const all = [school(2024), school(2025), school(2026), target, spm, foundation, diploma];
const removed = (records: RecordSummary[], next: Parameters<typeof recordsToRemove>[1]) => recordsToRemove(records, next, 2026).map((r) => r.id);

describe('schoolYearsFor', () => {
  it('gives Form 1 one year, Form 2 two years, Form 3 three years', () => {
    expect(schoolYearsFor(1, 2026)).toEqual([2026]);
    expect(schoolYearsFor(2, 2026)).toEqual([2026, 2025]);
    expect(schoolYearsFor(3, 2026)).toEqual([2026, 2025, 2024]);
  });
});

describe('recordsToRemove', () => {
  it('keeps everything when a student moves up', () => {
    expect(removed([school(2026)], { level: 'form1_3', formYear: 2, higherQualification: null })).toEqual([]);
    expect(removed([school(2024), school(2025), school(2026)], { level: 'form4_5', formYear: 4, higherQualification: null })).toEqual([]);
    expect(removed([school(2024), target], { level: 'after_spm', formYear: null, higherQualification: null })).toEqual([]);
    expect(removed([target, spm], { level: 'after_preu', formYear: null, higherQualification: 'foundation' })).toEqual([]);
  });

  it('keeps only the school years of the chosen form (Form 2 back to Form 1)', () => {
    expect(removed([school(2025), school(2026)], { level: 'form1_3', formYear: 1, higherQualification: null })).toEqual(['school-2025']);
  });

  it('removes the records of higher stages when a student moves down', () => {
    expect(removed(all, { level: 'form4_5', formYear: 5, higherQualification: null })).toEqual(['spm', 'foundation', 'diploma']);
    expect(removed(all, { level: 'form1_3', formYear: 3, higherQualification: null })).toEqual(['target', 'spm', 'foundation', 'diploma']);
    expect(removed(all, { level: 'after_spm', formYear: null, higherQualification: null })).toEqual(['foundation', 'diploma']);
  });

  it('removes the other qualification when switching after SPM, and keeps SPM', () => {
    expect(removed([spm, foundation], { level: 'after_preu', formYear: null, higherQualification: 'diploma' })).toEqual(['foundation']);
    expect(removed([spm, diploma], { level: 'after_preu', formYear: null, higherQualification: 'stpm' })).toEqual(['diploma']);
  });

  it('keeps a certificate when moving on to a diploma', () => {
    expect(removed([spm, certificate], { level: 'after_preu', formYear: null, higherQualification: 'diploma' })).toEqual([]);
  });

  it('removes diploma-stage records when moving back to a certificate, and the other certificate when switching', () => {
    expect(removed([spm, certificate, diploma], { level: 'after_certificate', formYear: null, higherQualification: 'certificate' })).toEqual(['diploma']);
    expect(removed([spm, svm], { level: 'after_certificate', formYear: null, higherQualification: 'skm' })).toEqual(['svm']);
    expect(removed([spm, svm], { level: 'after_spm', formYear: null, higherQualification: null })).toEqual(['svm']);
  });

  it('keeps SPM targets when moving between Form 4 and Form 5', () => {
    expect(removed([target], { level: 'form4_5', formYear: 4, higherQualification: null })).toEqual([]);
  });
});
