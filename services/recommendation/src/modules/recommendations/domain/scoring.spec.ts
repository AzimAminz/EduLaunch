import { MatchScorer, OfferChanceEstimator, interestFit } from './scoring.js';

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
  it('weights 45/30/15/10 and rejects weights that do not add up to 100', () => {
    expect(new MatchScorer().score({ interestFit: 1, academicStrength: 1, offerChance: 'high', preferenceSignal: 1 })).toBe(100);
    expect(() => new MatchScorer({ interest: 50, academic: 30, offer: 15, preference: 10 })).toThrow(/add up to 100/);
  });
});

describe('interestFit', () => {
  it('is 1 for identical profiles and neutral without data', () => {
    const p = { R: 3, I: 5, A: 1, S: 1, E: 1, C: 2 };
    expect(interestFit(p, p)).toBeCloseTo(1);
    expect(interestFit(null, p)).toBe(0.5);
  });
});
