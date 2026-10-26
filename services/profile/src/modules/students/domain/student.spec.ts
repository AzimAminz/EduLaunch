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

  it('asks which qualification after pre-university, and sets the diploma after diploma', () => {
    expect(() => student().setEducationLevel('after_preu', null)).toThrow(/STPM, matriculation, foundation or A-Level/);
    expect(() => student().setEducationLevel('after_preu', null, 'diploma')).toThrow(/STPM/);
    const preu = student();
    preu.setEducationLevel('after_preu', null, 'foundation');
    expect(preu.higherQualification).toBe('foundation');
    const diploma = student();
    diploma.setEducationLevel('after_diploma', null, null);
    expect(diploma.higherQualification).toBe('diploma');
  });

  it('clears the form and qualification for levels without them', () => {
    const s = student();
    s.setEducationLevel('after_preu', null, 'stpm');
    s.setEducationLevel('after_spm', 5, 'stpm');
    expect(s.formYear).toBeNull();
    expect(s.higherQualification).toBeNull();
  });
});
