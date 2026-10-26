/** Grade scales, best grade first. Kept as data so admins can extend them later. */
export const GradeScales = {
  spm: ['A+', 'A', 'A-', 'B+', 'B', 'C+', 'C', 'D', 'E', 'G'],
  /** Form 1–3 school exams (PBD/UASA style letters). Never converted to SPM grades. */
  school: ['A', 'B', 'C', 'D', 'E', 'F'],
  stpm: ['A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D', 'F'],
  a_level: ['A*', 'A', 'B', 'C', 'D', 'E'],
} as const;

/** Qualifications recorded subject by subject, each with its own grade scale. */
export type Qualification = keyof typeof GradeScales;

export function isValidGrade(qualification: Qualification, grade: string): boolean {
  return (GradeScales[qualification] as readonly string[]).includes(grade);
}

/**
 * Every kind of result a student can record. Only SPM, school, STPM and A-Level have subject grades;
 * the others are judged on CGPA (PNGK), field of study and MUET, plus the student's basic SPM results.
 */
export const RecordQualifications = ['school', 'spm', 'stpm', 'a_level', 'matriculation', 'foundation', 'diploma', 'dvm', 'dkm', 'certificate', 'svm', 'skm'] as const;
export type RecordQualification = (typeof RecordQualifications)[number];

export const hasSubjectGrades = (qualification: RecordQualification): qualification is Qualification => qualification in GradeScales;

/**
 * After SPM, level "after certificate": Sijil Politeknik / Kolej Komuniti, Sijil Vokasional Malaysia (SVM)
 * or Sijil Kemahiran Malaysia (SKM, levels 1–3). These usually lead to a diploma.
 */
export const CertificateQualifications = ['certificate', 'svm', 'skm'] as const satisfies readonly RecordQualification[];

/**
 * After SPM, level "after pre-university / diploma": STPM, matriculation, foundation, A-Level, diploma,
 * Diploma Vokasional Malaysia (DVM) or Diploma Kemahiran Malaysia (DKM, level 4; DLKM, level 5). These lead to a degree.
 */
export const DegreeEntryQualifications = ['stpm', 'matriculation', 'foundation', 'a_level', 'diploma', 'dvm', 'dkm'] as const satisfies readonly RecordQualification[];

/** Every qualification after SPM (certificate stage, then degree-entry stage). */
export const HigherQualifications = [...CertificateQualifications, ...DegreeEntryQualifications] as const;
export type HigherQualification = (typeof HigherQualifications)[number];

/** Qualifications whose results include a CGPA (PNGK). A-Level is graded by subject; SKM by competency. */
export const hasCgpa = (qualification: RecordQualification) =>
  ['stpm', 'matriculation', 'foundation', 'diploma', 'dvm', 'dkm', 'certificate', 'svm'].includes(qualification);

/** Qualifications tied to a programme: the field of study matters ("related field") and the programme has a name. */
export const ProgrammeQualifications = ['diploma', 'dvm', 'dkm', 'certificate', 'svm', 'skm'] as const satisfies readonly RecordQualification[];
export const hasProgramme = (qualification: RecordQualification) => (ProgrammeQualifications as readonly string[]).includes(qualification);

/** MQF levels a qualification can be at: SKM 1–3; DKM 4 or DLKM 5. Others have one level and record none. */
export const qualificationLevelsFor = (qualification: RecordQualification): number[] | null =>
  qualification === 'skm' ? [1, 2, 3] : qualification === 'dkm' ? [4, 5] : null;

/** MUET bands (1.0 to 5.0 in half bands, and 5+ stored as 5.5). */
export const MuetBands = [1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5] as const;
