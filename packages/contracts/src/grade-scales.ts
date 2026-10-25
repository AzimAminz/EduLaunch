/** Grade scales, best grade first. Kept as data so admins can extend them later. */
export const GradeScales = {
  spm: ['A+', 'A', 'A-', 'B+', 'B', 'C+', 'C', 'D', 'E', 'G'],
  /** Form 1–3 school exams (PBD/UASA style letters). Never converted to SPM grades. */
  school: ['A', 'B', 'C', 'D', 'E', 'F'],
  stpm: ['A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D', 'F'],
} as const;

export type Qualification = keyof typeof GradeScales;

export function isValidGrade(qualification: Qualification, grade: string): boolean {
  return (GradeScales[qualification] as readonly string[]).includes(grade);
}
