import { describe, expect, it } from 'vitest';
import { FieldRelations, continuityLevel, continuityScore, relativeSimilarity } from './continuity.js';

const fields = [
  { id: 'eng', nameEn: 'Engineering' },
  { id: 'it', nameEn: 'Computing & IT' },
  { id: 'biz', nameEn: 'Business & Accounting' },
  { id: 'art', nameEn: 'Art & Design' },
  { id: 'law', nameEn: 'Law & Social Science' },
];
const relations = new FieldRelations(fields);

describe('FieldRelations', () => {
  it('matches a diploma field exactly, then a related field, otherwise none', () => {
    expect(relations.match({ fieldId: 'it', stream: null }, ['it'])).toBe('same');
    expect(relations.match({ fieldId: 'it', stream: null }, ['eng'])).toBe('related');
    expect(relations.match({ fieldId: 'it', stream: null }, ['biz', 'art'])).toBe('related');
    expect(relations.match({ fieldId: 'eng', stream: null }, ['biz'])).toBe('none');
  });

  it('decides "related" on the NEC code when the programme has one: computer engineering yes, civil engineering no', () => {
    expect(relations.match({ fieldId: 'it', stream: null }, ['eng'], '0713')).toBe('related');
    expect(relations.match({ fieldId: 'it', stream: null }, ['eng'], '0716')).toBe('none');
    expect(relations.match({ fieldId: 'it', stream: null }, ['eng'], '0711')).toBe('none');
    expect(relations.match({ fieldId: 'it', stream: null }, ['it'], '0612')).toBe('same');
  });

  it('uses the matriculation stream when there is no field, and knows nothing otherwise', () => {
    expect(relations.match({ fieldId: null, stream: 'accounting' }, ['biz'])).toBe('same');
    expect(relations.match({ fieldId: null, stream: 'engineering' }, ['it'])).toBe('same');
    expect(relations.match({ fieldId: null, stream: 'science_1' }, ['law'])).toBe('none');
    expect(relations.match({ fieldId: null, stream: null }, ['it'])).toBeNull();
    expect(relations.match({ fieldId: null, stream: 'unknown_stream' }, ['it'])).toBeNull();
  });
});

describe('relativeSimilarity', () => {
  it('scales the closest programme to 1 and the average or less to 0', () => {
    expect(relativeSimilarity([0.8, 0.9, 0.85, 0.75])).toEqual([0, 1, 0.333, 0]);
    expect(relativeSimilarity([0.8, 0.8])).toEqual([0, 0]);
    expect(relativeSimilarity([])).toEqual([]);
  });
});

describe('continuityScore', () => {
  it('weighs the field match 65% and the name similarity 35%, or takes whichever is known', () => {
    expect(continuityScore('same', 1)).toBe(1);
    expect(continuityScore('related', 0)).toBe(0.325);
    expect(continuityScore('none', 1)).toBe(0.35);
    expect(continuityScore('same', null)).toBe(1);
    expect(continuityScore(null, 0.4)).toBe(0.4);
    expect(continuityScore(null, null)).toBeNull();
  });

  it('reads as high for the same field, medium for a related one', () => {
    expect(continuityLevel(1)).toBe('high');
    expect(continuityLevel(0.5)).toBe('medium');
    expect(continuityLevel(0.2)).toBe('low');
  });
});
