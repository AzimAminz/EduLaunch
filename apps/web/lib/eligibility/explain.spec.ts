import { describe, expect, it } from 'vitest';
import en from '../../dictionaries/en.json';
import ms from '../../dictionaries/ms.json';
import { explainRule, type CheckedRule } from './explain';

const names = new Map([['m', 'Matematik']]);
const rule = (over: Partial<CheckedRule>): CheckedRule => ({ type: 'min_grade', subjectId: 'm', required: 'B', actual: 'C+', passed: false, ...over });

describe('explainRule', () => {
  it('says what a subject needs and what the student has', () => {
    expect(explainRule(rule({}), names, ms.eligibility)).toBe('Matematik: perlu B, anda C+');
    expect(explainRule(rule({ actual: null }), names, ms.eligibility)).toBe('Matematik: perlu B, tiada dalam keputusan anda');
    expect(explainRule(rule({}), names, en.eligibility)).toBe('Matematik: B needed, you have C+');
  });

  it('explains credits, CGPA and MUET with their numbers', () => {
    expect(explainRule(rule({ type: 'min_credits', subjectId: null, required: 5, actual: 3 }), names, ms.eligibility)).toBe('Kepujian: perlu 5 subjek, anda ada 3');
    expect(explainRule(rule({ type: 'min_cgpa', subjectId: null, required: 2.5, actual: 3.1 }), names, ms.eligibility)).toBe('PNGK: perlu 2.50, anda 3.10');
    expect(explainRule(rule({ type: 'min_cgpa', subjectId: null, required: 2, actual: null }), names, en.eligibility)).toBe('CGPA: 2.00 needed, not entered');
    expect(explainRule(rule({ type: 'min_muet', subjectId: null, required: 2, actual: 3.5 }), names, ms.eligibility)).toBe('MUET: perlu Band 2.0, anda Band 3.5');
  });

  it('falls back to a general word for an unknown subject', () => {
    expect(explainRule(rule({ subjectId: 'x' }), names, ms.eligibility)).toBe('Subjek: perlu B, anda C+');
  });
});
