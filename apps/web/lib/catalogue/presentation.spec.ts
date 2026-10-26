import { describe, expect, it } from 'vitest';
import en from '../../dictionaries/en.json';
import ms from '../../dictionaries/ms.json';
import { programmeMeta as meta_, studyLevelLabel as label_, worldForFields } from './presentation';

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

describe('worldForFields', () => {
  it('picks the illustration and background used in the design', () => {
    expect(worldForFields(['Computing & IT'])).toEqual({ world: 'technology', background: '#e3ecff' });
    expect(worldForFields(['Engineering'])).toEqual({ world: 'science', background: '#ffd84d' });
    expect(worldForFields(['Art & Design', 'Computing & IT'])).toEqual({ world: 'design', background: '#ddf4e9' });
  });

  it('uses the campus illustration when no field matches', () => {
    expect(worldForFields([])).toEqual({ world: 'campus', background: '#fff4c7' });
    expect(worldForFields(['Business & Accounting'])).toEqual({ world: 'campus', background: '#fff4c7' });
  });

  it('prefers the core science picture for Pure Science even when computing is also listed', () => {
    expect(worldForFields(['Sains Tulen', 'Perubatan & Kesihatan', 'Kejuruteraan', 'Komputer & Teknologi Maklumat'])).toEqual({ world: 'science', background: '#ffd84d' });
  });

  it('does not treat "Sains Sosial" (social science) as science', () => {
    expect(worldForFields(['Undang-undang & Sains Sosial', 'Pendidikan'])).toEqual({ world: 'campus', background: '#fff4c7' });
  });

  it('uses the technology picture for software engineering', () => {
    expect(worldForFields(['Komputer & Teknologi Maklumat', 'Kejuruteraan'])).toEqual({ world: 'technology', background: '#e3ecff' });
  });

  it('recognises Malay field names as well', () => {
    expect(worldForFields(['Komputer & IT'])).toEqual({ world: 'technology', background: '#e3ecff' });
    expect(worldForFields(['Kejuruteraan'])).toEqual({ world: 'science', background: '#ffd84d' });
  });
});
