import type { HigherQualification, StudentSnapshot } from '@edulaunch/contracts';

type EducationLevel = StudentSnapshot['educationLevel'];

/** The order of the cards on the onboarding screen, and the form years each level asks for. */
export const EDUCATION_LEVELS: Array<{ level: EducationLevel; forms?: number[] }> = [
  { level: 'form1_3', forms: [1, 2, 3] },
  { level: 'form4_5', forms: [4, 5] },
  { level: 'after_spm' },
  { level: 'after_preu' },
  { level: 'after_diploma' },
];

export const formsFor = (level: EducationLevel) => EDUCATION_LEVELS.find((l) => l.level === level)?.forms;

/** The qualifications a student chooses from after pre-university (asked in a dialog). */
export const PRE_UNIVERSITY: HigherQualification[] = ['stpm', 'matriculation', 'foundation', 'a_level'];

export interface LevelChoice {
  level: EducationLevel;
  formYear: number | null;
  higherQualification: HigherQualification | null;
}

/** Levels after SPM ask which qualification in a dialog before saving. */
export const asksQualification = (level: EducationLevel | null) => level === 'after_preu' || level === 'after_diploma';

/** Validates a submitted level, form and qualification; the profile service checks the same rules again. */
export function parseLevelChoice(form: FormData): LevelChoice | { error: 'levelRequired' | 'formRequired' | 'qualificationRequired' } {
  const level = EDUCATION_LEVELS.find((l) => l.level === form.get('level'));
  if (!level) return { error: 'levelRequired' };
  if (level.level === 'after_diploma') return { level: level.level, formYear: null, higherQualification: 'diploma' };
  if (level.level === 'after_preu') {
    const q = PRE_UNIVERSITY.find((x) => x === form.get('higherQualification'));
    return q ? { level: level.level, formYear: null, higherQualification: q } : { error: 'qualificationRequired' };
  }
  if (!level.forms) return { level: level.level, formYear: null, higherQualification: null };
  const formYear = Number(form.get('formYear'));
  return level.forms.includes(formYear) ? { level: level.level, formYear, higherQualification: null } : { error: 'formRequired' };
}
