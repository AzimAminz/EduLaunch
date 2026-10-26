import { Student } from './student.js';

const student = () => Student.register('s1', 'a1', null);

describe('Student.setEducationLevel', () => {
  it('needs the form for Form 1–3 and Form 4–5', () => {
    expect(() => student().setEducationLevel('form1_3', null)).toThrow(/form between 1 and 3/);
    expect(() => student().setEducationLevel('form4_5', 3)).toThrow(/form between 4 and 5/);
    const s = student();
    s.setEducationLevel('form1_3', 2);
    expect(s.formYear).toBe(2);
  });

  it('asks which qualification after pre-university or diploma, including DVM and DKM', () => {
    expect(() => student().setEducationLevel('after_preu', null)).toThrow(/STPM, matriculation, foundation, A-Level, diploma, DVM or DKM/);
    expect(() => student().setEducationLevel('after_preu', null, 'svm')).toThrow(/STPM/);
    for (const q of ['foundation', 'diploma', 'dkm'] as const) {
      const s = student();
      s.setEducationLevel('after_preu', null, q);
      expect(s.higherQualification).toBe(q);
    }
  });

  it('asks which certificate after certificate: Sijil, SVM or SKM', () => {
    expect(() => student().setEducationLevel('after_certificate', null)).toThrow(/certificate, SVM or SKM/);
    expect(() => student().setEducationLevel('after_certificate', null, 'diploma')).toThrow(/certificate, SVM or SKM/);
    const s = student();
    s.setEducationLevel('after_certificate', null, 'skm');
    expect(s.higherQualification).toBe('skm');
  });

  it('clears the form and qualification for levels without them', () => {
    const s = student();
    s.setEducationLevel('after_preu', null, 'stpm');
    s.setEducationLevel('after_spm', 5, 'stpm');
    expect(s.formYear).toBeNull();
    expect(s.higherQualification).toBeNull();
  });
});
