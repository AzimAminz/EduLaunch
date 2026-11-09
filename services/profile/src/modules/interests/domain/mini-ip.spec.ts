import { describe, expect, it } from 'vitest';
import { DomainError } from '@edulaunch/ddd';
import { hollandCode, scoreInterestTest, RIASEC_TYPES } from './mini-ip.js';

// Five questions per type, as in the Mini-IP.
const questions = RIASEC_TYPES.flatMap((t) => Array.from({ length: 5 }, (_, i) => ({ id: `${t}${i}`, riasecType: t })));
const all = (value: (type: string) => number) => new Map(questions.map((q) => [q.id, value(q.riasecType)]));

describe('scoreInterestTest', () => {
  it('sums the five answers of each type, 0 to 20', () => {
    const scores = scoreInterestTest(questions, all((t) => (t === 'I' ? 4 : t === 'A' ? 3 : 0)));
    expect(scores).toEqual({ R: 0, I: 20, A: 15, S: 0, E: 0, C: 0 });
  });

  it('refuses a test with a question left out', () => {
    const answers = all(() => 2);
    answers.delete('S3');
    expect(() => scoreInterestTest(questions, answers)).toThrow(DomainError);
  });

  it('refuses an answer outside 0–4', () => {
    expect(() => scoreInterestTest(questions, all((t) => (t === 'C' ? 5 : 1)))).toThrow(DomainError);
  });
});

describe('hollandCode', () => {
  it('takes the three highest types', () => {
    expect(hollandCode({ R: 3, I: 18, A: 12, S: 15, E: 4, C: 9 })).toBe('ISA');
  });

  it('keeps tied types in RIASEC order', () => {
    expect(hollandCode({ R: 10, I: 10, A: 10, S: 10, E: 10, C: 10 })).toBe('RIA');
  });
});
