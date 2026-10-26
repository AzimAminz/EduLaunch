import { describe, expect, it } from 'vitest';
import en from '../../dictionaries/en.json';
import ms from '../../dictionaries/ms.json';
import { programmeMeta as meta_, studyLevelLabel as label_ } from './presentation';

const studyLevelLabel = (l: Parameters<typeof label_>[0]) => label_(l, ms);
const programmeMeta = (l: Parameters<typeof meta_>[0], s: number | null) => meta_(l, s, ms);

describe('studyLevelLabel', () => {
  it('uses the words students know', () => {
    expect(studyLevelLabel('form4_stream')).toBe('Aliran Tingkatan 4');
    expect(studyLevelLabel('diploma')).toBe('Diploma');
    expect(studyLevelLabel('degree')).toBe('Ijazah sarjana muda');
  });
});

describe('programmeMeta', () => {
  it('shows the level and the length in years', () => {
    expect(programmeMeta('diploma', 6)).toBe('Diploma • 3 tahun');
    expect(programmeMeta('foundation', 2)).toBe('Asasi • 1 tahun');
    expect(programmeMeta('certificate', 3)).toBe('Sijil • 1.5 tahun');
    expect(programmeMeta('form4_stream', null)).toBe('Aliran Tingkatan 4');
  });

  it('has English labels too', () => {
    expect(label_('degree', en)).toBe("Bachelor's degree");
    expect(meta_('diploma', 6, en)).toBe('Diploma • 3 years');
  });
});
