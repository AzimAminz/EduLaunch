import { describe, expect, it } from 'vitest';
import { cgpaMerit, diplomaMerit, spmMerit, spmMeritSubject, stamMerit, suggestSpmStream, type SpmResult } from '@edulaunch/contracts';

// Expected values are worked out by hand from the official calculator's formula (ePanduan, KPT, read 8 Nov 2026):
// universal /72 × 40, package /36 × 30 (STEM C /18), additional /36 × 10, academic = total / 80 × 90, plus co-curricular.

const universal = (bm: string, bi: string, mt: string, sj: string): SpmResult[] => [
  { subject: 'Bahasa Melayu', grade: bm },
  { subject: 'Bahasa Inggeris', grade: bi },
  { subject: 'Matematik', grade: mt },
  { subject: 'Sejarah', grade: sj },
];

describe('SPM merit', () => {
  it('gives 100 for straight A+ with full co-curricular marks', () => {
    const results = [
      ...universal('A+', 'A+', 'A+', 'A+'),
      { subject: 'Biologi', grade: 'A+' },
      { subject: 'Kimia', grade: 'A+' },
      { subject: 'Fizik', grade: 'A+' },
      { subject: 'Pendidikan Islam', grade: 'A+' },
    ];
    const m = spmMerit(results, 'stem_a', 10);
    expect(m).toMatchObject({ academic: 90, cocurricular: 10, merit: 100 });
    expect(m.universal.mark).toBe(40);
    expect(m.package.mark).toBe(30);
    expect(m.additional.mark).toBe(10);
  });

  it('counts the best two science subjects as the package and the next best two as additional (STEM A)', () => {
    const results = [
      ...universal('A', 'B+', 'A-', 'B'), // 16 + 12 + 14 + 10 = 52 → 28.89
      { subject: 'Biologi', grade: 'A' }, // package
      { subject: 'Kimia', grade: 'B+' }, // package
      { subject: 'Fizik', grade: 'B' }, // additional
      { subject: 'Pendidikan Islam', grade: 'A' }, // additional
      { subject: 'Pendidikan Seni Visual', grade: 'C' }, // not counted
    ];
    const m = spmMerit(results, 'stem_a', 8);
    expect(m.package.subjects.map((s) => s.subject)).toEqual(['Biologi', 'Kimia']);
    expect(m.additional.subjects.map((s) => s.subject)).toEqual(['Pendidikan Islam', 'Fizik']);
    expect(m.universal.mark).toBe(28.89);
    expect(m.package.mark).toBe(23.33);
    expect(m.additional.mark).toBe(7.22);
    // (28.889 + 23.333 + 7.222) / 80 × 90 = 66.875; + 8 = 74.875
    expect(m.academic).toBeCloseTo(66.875, 1);
    expect(m.merit).toBeCloseTo(74.875, 1);
  });

  it('counts one package subject out of 18 for STEM C', () => {
    const results = [
      ...universal('B', 'C+', 'B', 'A'), // 44 → 24.44
      { subject: 'Pengajian Kejuruteraan Mekanikal', grade: 'A-' }, // 14 / 18 × 30 = 23.33
      { subject: 'Pendidikan Moral', grade: 'B+' },
      { subject: 'Sains', grade: 'C' }, // additional 18 / 36 × 10 = 5
    ];
    const m = spmMerit(results, 'stem_c', 7);
    expect(m.package.maxPoints).toBe(18);
    expect(m.package.mark).toBe(23.33);
    expect(m.additional.mark).toBe(5);
    expect(m.academic).toBeCloseTo(59.375, 1);
    expect(m.merit).toBeCloseTo(66.375, 1);
  });

  it('scores a missing universal subject as zero and names it', () => {
    const results = [
      { subject: 'Bahasa Melayu', grade: 'A' },
      { subject: 'Bahasa Inggeris', grade: 'A' },
      { subject: 'Matematik', grade: 'A' },
      { subject: 'Biologi', grade: 'A' },
      { subject: 'Kimia', grade: 'A' },
      { subject: 'Fizik', grade: 'A' },
      { subject: 'Sains', grade: 'A' },
    ];
    const m = spmMerit(results, 'stem_a', 10);
    expect(m.universal.missing).toEqual(['SEJARAH']);
    expect(m.academic).toBeCloseTo(70, 5);
    expect(m.merit).toBeCloseTo(80, 5);
  });

  it('treats a fail (G) as zero points and never lets co-curricular marks pass 10', () => {
    const m = spmMerit([...universal('G', 'G', 'G', 'G')], 'humanities', 25);
    expect(m.universal.points).toBe(0);
    expect(m.cocurricular).toBe(10);
    expect(m.merit).toBe(10);
  });

  it('only lets a stream package subjects of its own types', () => {
    const results = [...universal('A', 'A', 'A', 'A'), { subject: 'Kesusasteraan Melayu Komunikatif', grade: 'A+' }, { subject: 'Biologi', grade: 'B' }];
    expect(spmMerit(results, 'stem_a', 0).package.subjects.map((s) => s.subject)).toEqual(['Biologi']);
    expect(spmMerit(results, 'humanities', 0).package.subjects.map((s) => s.subject)).toEqual(['Kesusasteraan Melayu Komunikatif']);
  });

  it('knows our subject names when the calculator spells them differently', () => {
    expect(spmMeritSubject('Bahasa Arab')?.type).toBe('KB');
    expect(spmMeritSubject('Pendidikan Al-Quran dan As-Sunnah')?.type).toBe('KP');
    expect(spmMeritSubject('Pendidikan Syariah Islamiah')?.type).toBe('KP');
    expect(spmMeritSubject('Matematik Tambahan')?.type).toBe('PA');
    expect(spmMeritSubject('Bahasa Melayu')).toBeNull();
  });

  it('suggests a stream from the subjects taken', () => {
    expect(suggestSpmStream([{ subject: 'Biologi', grade: 'A' }, { subject: 'Kimia', grade: 'A' }])).toBe('stem_a');
    expect(suggestSpmStream([{ subject: 'Fizik', grade: 'A' }, { subject: 'Sains Komputer', grade: 'A' }])).toBe('stem_b');
    expect(suggestSpmStream([{ subject: 'Pembuatan Perabot', grade: 'A' }])).toBe('stem_c');
    expect(suggestSpmStream([{ subject: 'Ekonomi', grade: 'A' }])).toBe('humanities');
  });
});

describe('CGPA-based merit', () => {
  it('STPM, matriculation and foundation: CGPA / 4 × 90 plus co-curricular', () => {
    expect(cgpaMerit(3.5, 9)).toEqual({ academic: 78.75, cocurricular: 9, merit: 87.75 });
    expect(cgpaMerit(4, 10).merit).toBe(100);
    expect(cgpaMerit(5, 12).merit).toBe(100);
  });

  it('diploma: CGPA / 4 × 100, no co-curricular', () => {
    expect(diplomaMerit(3)).toBe(75);
    expect(diplomaMerit(3.67)).toBe(91.75);
    expect(diplomaMerit(0)).toBe(0);
  });

  it('STAM: the level becomes a CGPA (Jayyid = 2.00)', () => {
    expect(stamMerit('jayyid', 10)).toEqual({ academic: 45, cocurricular: 10, merit: 55 });
    expect(stamMerit('mumtaz', 10).merit).toBe(100);
  });
});
