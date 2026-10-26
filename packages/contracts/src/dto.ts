import { z } from 'zod';
import { HigherQualifications } from './grade-scales.js';

export const StudyLevel = z.enum(['form4_stream', 'certificate', 'skills', 'foundation', 'matriculation', 'stpm', 'diploma', 'degree']);
export type StudyLevel = z.infer<typeof StudyLevel>;

export const ProgramSummary = z.object({
  id: z.uuid(),
  institutionId: z.uuid().nullable(),
  name: z.string(),
  studyLevel: StudyLevel,
  durationSemesters: z.number().int().nullable(),
  fieldIds: z.array(z.uuid()),
});
export type ProgramSummary = z.infer<typeof ProgramSummary>;

export const RuleType = z.enum(['min_grade', 'min_credits', 'min_cgpa', 'min_muet', 'key_subject']);
export type RuleType = z.infer<typeof RuleType>;

/** Rules with the same `groupNo` are alternatives ("at least one of"); different groups must all pass. */
export const RequirementRuleDto = z.object({
  id: z.uuid(),
  groupNo: z.number().int(),
  ruleType: RuleType,
  subjectId: z.uuid().nullable(),
  minGrade: z.string().nullable(),
  minValue: z.number().nullable(),
  evidenceQuote: z.string().nullable(),
});
export type RequirementRuleDto = z.infer<typeof RequirementRuleDto>;

export const PublishedRequirement = z.object({
  requirementId: z.uuid(),
  programId: z.uuid(),
  entryRoute: z.string(),
  versionNo: z.number().int(),
  rules: z.array(RequirementRuleDto),
});
export type PublishedRequirement = z.infer<typeof PublishedRequirement>;

/** What the recommendation service needs to know about a student. */
export const StudentSnapshot = z.object({
  studentId: z.uuid(),
  /** after_certificate: Sijil / SVM / SKM. after_preu: STPM, matriculation, foundation, A-Level, diploma, DVM or DKM. */
  educationLevel: z.enum(['form1_3', 'form4_5', 'after_spm', 'after_certificate', 'after_preu']),
  isTargetBased: z.boolean(),
  /** Scale of the main subject grades (SPM, or school grades before SPM); used for "credits" rules. */
  gradeScale: z.enum(['spm', 'school', 'stpm']),
  /** SPM (or school) grades, plus STPM or A-Level grades after pre-university; `scale` says which. */
  grades: z.array(z.object({ subjectId: z.uuid(), grade: z.string(), scale: z.enum(['spm', 'school', 'stpm', 'a_level', 'matriculation', 'foundation']).optional() })),
  /** After SPM: the qualification (certificate, svm, skm, stpm, matriculation, foundation, a_level, diploma, dvm, dkm). */
  higherQualification: z.enum(HigherQualifications).nullable().optional(),
  cgpa: z.number().nullable(),
  muetBand: z.number().nullable(),
  riasec: z.record(z.enum(['R', 'I', 'A', 'S', 'E', 'C']), z.number()).nullable(),
});
export type StudentSnapshot = z.infer<typeof StudentSnapshot>;

export const ApiError = z.object({ code: z.string(), message: z.string() });
export type ApiError = z.infer<typeof ApiError>;
