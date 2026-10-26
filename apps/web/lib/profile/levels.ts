import { CertificateQualifications, DegreeEntryQualifications, type HigherQualification, type StudentSnapshot } from '@edulaunch/contracts';

type EducationLevel = StudentSnapshot['educationLevel'];

/** The order of the cards on the onboarding screen, and the form years each level asks for. */
export const EDUCATION_LEVELS: Array<{ level: EducationLevel; forms?: number[] }> = [
  { level: 'form1_3', forms: [1, 2, 3] },
  { level: 'form4_5', forms: [4, 5] },
  { level: 'after_spm' },
  { level: 'after_certificate' },
  { level: 'after_preu' },
];

export const formsFor = (level: EducationLevel) => EDUCATION_LEVELS.find((l) => l.level === level)?.forms;

/** The qualifications each level after SPM chooses from (asked in a dialog). */
export const QUALIFICATION_CHOICES: Partial<Record<EducationLevel, readonly HigherQualification[]>> = {
  after_certificate: CertificateQualifications,
  after_preu: DegreeEntryQualifications,
};

export interface LevelChoice {
  level: EducationLevel;
  formYear: number | null;
  higherQualification: HigherQualification | null;
}

/** Levels after SPM ask which qualification in a dialog before saving. */
export const asksQualification = (level: EducationLevel | null) => !!level && level in QUALIFICATION_CHOICES;

/** Validates a submitted level, form and qualification; the profile service checks the same rules again. */
export function parseLevelChoice(form: FormData): LevelChoice | { error: 'levelRequired' | 'formRequired' | 'qualificationRequired' } {
  const level = EDUCATION_LEVELS.find((l) => l.level === form.get('level'));
  if (!level) return { error: 'levelRequired' };
  const choices = QUALIFICATION_CHOICES[level.level];
  if (choices) {
    const q = choices.find((x) => x === form.get('higherQualification'));
    return q ? { level: level.level, formYear: null, higherQualification: q } : { error: 'qualificationRequired' };
  }
  if (!level.forms) return { level: level.level, formYear: null, higherQualification: null };
  const formYear = Number(form.get('formYear'));
  return level.forms.includes(formYear) ? { level: level.level, formYear, higherQualification: null } : { error: 'formRequired' };
}
