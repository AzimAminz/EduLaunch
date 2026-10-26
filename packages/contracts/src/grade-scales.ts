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
 * Every kind of result a student can record. Matriculation, foundation and diploma have no subject
 * grades: degree programmes judge them on CGPA (PNGK) and MUET, plus the student's basic SPM results.
 */
export const RecordQualifications = ['school', 'spm', 'stpm', 'a_level', 'matriculation', 'foundation', 'diploma'] as const;
export type RecordQualification = (typeof RecordQualifications)[number];

export const hasSubjectGrades = (qualification: RecordQualification): qualification is Qualification => qualification in GradeScales;

/** Results after SPM that lead to a degree (the "after pre-university" and "after diploma" levels). */
export const HigherQualifications = ['stpm', 'matriculation', 'foundation', 'a_level', 'diploma'] as const satisfies readonly RecordQualification[];
export type HigherQualification = (typeof HigherQualifications)[number];

/** Qualifications whose results include a CGPA (PNGK). A-Level is graded by subject only. */
export const hasCgpa = (qualification: RecordQualification) => ['stpm', 'matriculation', 'foundation', 'diploma'].includes(qualification);

/** MUET bands (1.0 to 5.0 in half bands, and 5+ stored as 5.5). */
export const MuetBands = [1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5] as const;
