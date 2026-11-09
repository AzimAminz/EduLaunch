import { describe, expect, it } from 'vitest';
import { averageGroup, compareMerit } from './compare';

const avg = (value: number) => ({ intakeYear: 2026, value });

describe('compareMerit', () => {
  it('knows whose average it is from the entry routes', () => {
    expect(averageGroup(['spm'])).toBe('spm');
    expect(averageGroup(['stpm', 'matrikulasi', 'diploma'])).toBe('preu');
    expect(averageGroup(['spm', 'stpm'])).toBe('spm');
    expect(averageGroup(['diploma', 'dkm'])).toBeNull();
  });

  it('compares an SPM merit with an SPM leavers average', () => {
    expect(compareMerit({ mode: 'spm', merit: 90 }, { entryRoutes: ['spm'], averageMerit: avg(85.5) })).toEqual({ status: 'comparable', band: 'above', gap: 4.5, average: 85.5, year: 2026 });
    expect(compareMerit({ mode: 'spm', merit: 84 }, { entryRoutes: ['spm'], averageMerit: avg(85.5) })).toMatchObject({ band: 'near', gap: -1.5 });
    expect(compareMerit({ mode: 'spm', merit: 80 }, { entryRoutes: ['spm'], averageMerit: avg(85.5) })).toMatchObject({ band: 'below', gap: -5.5 });
  });

  it('puts the band edges where the house rule says: +3 is above, -2 is still near', () => {
    expect(compareMerit({ mode: 'cgpa', merit: 93 }, { entryRoutes: ['stpm'], averageMerit: avg(90) })).toMatchObject({ band: 'above' });
    expect(compareMerit({ mode: 'cgpa', merit: 88 }, { entryRoutes: ['stpm'], averageMerit: avg(90) })).toMatchObject({ band: 'near' });
    expect(compareMerit({ mode: 'cgpa', merit: 87.99 }, { entryRoutes: ['stpm'], averageMerit: avg(90) })).toMatchObject({ band: 'below' });
  });

  it('never compares merits from different groups of candidates', () => {
    expect(compareMerit({ mode: 'cgpa', merit: 95 }, { entryRoutes: ['spm'], averageMerit: avg(85) })).toEqual({ status: 'other_group', group: 'spm' });
    expect(compareMerit({ mode: 'spm', merit: 95 }, { entryRoutes: ['stpm'], averageMerit: avg(85) })).toEqual({ status: 'other_group', group: 'preu' });
    expect(compareMerit({ mode: 'diploma', merit: 95 }, { entryRoutes: ['stpm'], averageMerit: avg(85) })).toEqual({ status: 'other_group', group: 'preu' });
  });

  it('says so when there is no average', () => {
    expect(compareMerit({ mode: 'spm', merit: 90 }, { entryRoutes: ['spm'], averageMerit: null })).toEqual({ status: 'no_average' });
    expect(compareMerit({ mode: 'diploma', merit: 90 }, { entryRoutes: ['diploma'], averageMerit: avg(80) })).toEqual({ status: 'no_average' });
  });
});
