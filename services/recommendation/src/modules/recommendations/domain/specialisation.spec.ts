import { describe, expect, it } from 'vitest';
import { interestFit } from './scoring.js';
import { programmeProfile, specialisationOf } from './specialisation.js';

const computing = { R: 3, I: 5, A: 2, S: 1, E: 2, C: 4 };
// Likes to investigate and keep order, little interest in art (like f1@test.com's leaning).
const investigator = { R: 8, I: 18, A: 3, S: 5, E: 8, C: 17 };

describe('specialisationOf', () => {
  it('reads the specialisation from Malay and English names, most specific first', () => {
    expect(specialisationOf('Ijazah Sarjana Muda Sains Komputer (Keselamatan Komputer) dengan Kepujian')?.key).toBe('cyber_security');
    expect(specialisationOf('Sarjana Muda Sains Komputer (Rangkaian & Keselamatan Komputer)')?.key).toBe('cyber_security');
    expect(specialisationOf('Sarjana Muda Kejuruteraan Perisian dengan Kepujian')?.key).toBe('software');
    expect(specialisationOf('Bachelor of Software Engineering')?.key).toBe('software');
    expect(specialisationOf('Ijazah Sarjana Muda Sains Komputer (Media Interaktif)')?.key).toBe('creative_media');
    expect(specialisationOf('Diploma Kulinari')?.key).toBe('hospitality');
    expect(specialisationOf('Sarjana Muda Sains Komputer')).toBeNull();
  });
});

describe('programmeProfile', () => {
  it('leans on the specialisation, so programmes in one field no longer share one interest fit', () => {
    const security = programmeProfile(computing, specialisationOf('Sains Komputer (Keselamatan Komputer)'));
    const media = programmeProfile(computing, specialisationOf('Sains Komputer (Media Interaktif)'));
    expect(interestFit(investigator, security)).toBeGreaterThan(interestFit(investigator, media));
    expect(interestFit(investigator, security)).toBeGreaterThan(interestFit(investigator, computing));
  });

  it('keeps the field profile when the name says nothing more, and the specialisation alone without a field', () => {
    expect(programmeProfile(computing, null)).toBe(computing);
    expect(programmeProfile(null, specialisationOf('Kejuruteraan Perisian'))).toEqual(specialisationOf('Perisian')!.weights);
    expect(programmeProfile(null, null)).toBeNull();
  });
});
