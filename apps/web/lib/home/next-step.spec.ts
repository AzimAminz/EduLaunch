import { describe, expect, it } from 'vitest';
import { dayPart, nextStep, type HomeState } from './next-step';

const base: HomeState = { level: 'after_spm', hasResults: true, interest: { done: true, answered: 30, total: 30 }, savedCount: 2, recommendationCount: 10 };

describe('nextStep', () => {
  it('asks for the education level first', () => {
    expect(nextStep({ ...base, level: null, hasResults: false })).toEqual({ kind: 'level' });
  });

  it('asks a school leaver for results before the interest test', () => {
    expect(nextStep({ ...base, hasResults: false, interest: { done: false, answered: 4, total: 30 } })).toEqual({ kind: 'results' });
  });

  it('asks a diploma holder without SPM results for them before the interest test', () => {
    expect(nextStep({ ...base, level: 'after_preu', spmMissing: true, interest: { done: false, answered: 0, total: 30 } })).toEqual({ kind: 'spm' });
  });

  it('asks a Form 1–3 student for the interest test before school results', () => {
    expect(nextStep({ ...base, level: 'form1_3', hasResults: false, interest: { done: false, answered: 4, total: 30 } })).toEqual({ kind: 'interest', answered: 4, total: 30 });
  });

  it('suggests saving a programme once everything is in', () => {
    expect(nextStep({ ...base, savedCount: 0 })).toEqual({ kind: 'save' });
  });

  it('has nothing to ask when the profile is complete', () => {
    expect(nextStep(base)).toBeNull();
  });
});

describe('dayPart', () => {
  // 00:30 UTC is 08:30 in Malaysia (UTC+8).
  it('reads the hour in Malaysia', () => {
    expect(dayPart(new Date('2026-11-21T00:30:00Z'))).toBe('morning');
    expect(dayPart(new Date('2026-11-21T05:00:00Z'))).toBe('noon');
    expect(dayPart(new Date('2026-11-21T09:00:00Z'))).toBe('evening');
    expect(dayPart(new Date('2026-11-21T13:00:00Z'))).toBe('night');
  });
});
