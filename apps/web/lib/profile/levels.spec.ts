import { describe, expect, it } from 'vitest';
import { parseLevelChoice } from './levels';

const form = (values: Record<string, string>) => {
  const data = new FormData();
  for (const [k, v] of Object.entries(values)) data.set(k, v);
  return data;
};

describe('parseLevelChoice', () => {
  it('needs a level', () => {
    expect(parseLevelChoice(form({}))).toEqual({ error: 'levelRequired' });
    expect(parseLevelChoice(form({ level: 'phd' }))).toEqual({ error: 'levelRequired' });
  });

  it('needs a form year that matches the level', () => {
    expect(parseLevelChoice(form({ level: 'form1_3' }))).toEqual({ error: 'formRequired' });
    expect(parseLevelChoice(form({ level: 'form1_3', formYear: '4' }))).toEqual({ error: 'formRequired' });
    expect(parseLevelChoice(form({ level: 'form4_5', formYear: '5' }))).toEqual({ level: 'form4_5', formYear: 5 });
  });

  it('ignores the form year for levels after school', () => {
    expect(parseLevelChoice(form({ level: 'after_spm', formYear: '3' }))).toEqual({ level: 'after_spm', formYear: null });
  });
});
