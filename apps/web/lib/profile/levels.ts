import type { StudentSnapshot } from '@edulaunch/contracts';

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

/** Validates a submitted level and form year; the profile service checks the same rule again. */
export function parseLevelChoice(form: FormData): { level: EducationLevel; formYear: number | null } | { error: 'levelRequired' | 'formRequired' } {
  const level = EDUCATION_LEVELS.find((l) => l.level === form.get('level'));
  if (!level) return { error: 'levelRequired' };
  if (!level.forms) return { level: level.level, formYear: null };
  const formYear = Number(form.get('formYear'));
  return level.forms.includes(formYear) ? { level: level.level, formYear } : { error: 'formRequired' };
}
