import { MatchScorer, OfferChanceEstimator, fitLevel, interestFit, sharedTypes } from './scoring.js';

describe('OfferChanceEstimator', () => {
  const est = new OfferChanceEstimator();
  it('uses margin bands against the last three years', () => {
    expect(est.estimate(80, [70, 74, 76, 75]).band).toBe('high'); // avg of last 3 = 75, margin +5
    expect(est.estimate(74, [75, 75, 75]).band).toBe('medium');
    expect(est.estimate(70, [75, 75, 75]).band).toBe('low');
  });
  it('says "no data" instead of guessing', () => {
    expect(est.estimate(80, [])).toEqual({ band: 'no_data', margin: null });
  });
});

describe('MatchScorer', () => {
  it('weights interests 40, subject strength 35 and earlier study 25 by default, and rejects weights that do not add up to 100', () => {
    expect(new MatchScorer().score({ interestFit: 1, academicStrength: 1, continuity: 1, offerChance: 'high', preferenceSignal: 1 })).toBe(100);
    expect(new MatchScorer().score({ interestFit: 1, academicStrength: 0, continuity: 0, offerChance: 'no_data', preferenceSignal: 0 })).toBe(40);
    expect(() => new MatchScorer({ interest: 50, academic: 30, continuity: 0, offer: 15, preference: 10 })).toThrow(/add up to 100/);
  });

  it('gives the earlier-study weight to interests and subjects when nothing is known about it', () => {
    expect(new MatchScorer().score({ interestFit: 1, academicStrength: 0, continuity: null, offerChance: 'no_data', preferenceSignal: 0 })).toBe(53);
    expect(new MatchScorer().score({ interestFit: 0, academicStrength: 1, continuity: null, offerChance: 'no_data', preferenceSignal: 0 })).toBe(47);
  });
});

describe('interestFit', () => {
  it('is 1 for identical profiles and neutral without data', () => {
    const p = { R: 3, I: 5, A: 1, S: 1, E: 1, C: 2 };
    expect(interestFit(p, p)).toBeCloseTo(1);
    expect(interestFit(null, p)).toBe(0.5);
  });
});

describe('interestFit (shape of the profiles)', () => {
  const computing = { R: 3, I: 5, A: 2, S: 1, E: 2, C: 4 };
  const education = { R: 1, I: 2, A: 3, S: 5, E: 2, C: 2 };
  it('tells fields apart for a student who answers high overall', () => {
    const investigative = { R: 15, I: 20, A: 12, S: 10, E: 11, C: 17 };
    expect(interestFit(investigative, computing)).toBeGreaterThan(0.9);
    expect(interestFit(investigative, education)).toBeLessThan(0.4);
  });
  it('is neutral for a flat profile', () => {
    expect(interestFit({ R: 10, I: 10, A: 10, S: 10, E: 10, C: 10 }, computing)).toBe(0.5);
  });
});

describe('fitLevel and sharedTypes', () => {
  it('labels the fit', () => {
    expect([fitLevel(0.9), fitLevel(0.6), fitLevel(0.3)]).toEqual(['high', 'medium', 'low']);
  });
  it("names the student's top types the field also leans on, strongest first", () => {
    const student = { R: 18, I: 19, A: 4, S: 6, E: 5, C: 12 };
    expect(sharedTypes(student, { R: 5, I: 4, A: 1, S: 1, E: 2, C: 3 })).toEqual(['I', 'R', 'C']);
    expect(sharedTypes(student, { R: 1, I: 2, A: 3, S: 5, E: 2, C: 2 })).toEqual([]);
    expect(sharedTypes(null, { R: 1, I: 2, A: 3, S: 5, E: 2, C: 2 })).toEqual([]);
  });
});
