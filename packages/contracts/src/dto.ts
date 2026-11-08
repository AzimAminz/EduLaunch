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
  /** Entry routes the programme takes candidates from (as the official source lists them). */
  entryRoutes: z.array(z.string()).default([]),
  /** The newest published average merit (ePanduan), for offer chances. */
  averageMerit: z.object({ intakeYear: z.number().int(), value: z.number() }).nullable().default(null),
});
export type ProgramSummary = z.infer<typeof ProgramSummary>;

/**
 * Rule kinds, following how official sources write requirements (JPT ePanduan):
 * - min_grade: grade in one subject ("Gred C bagi Bahasa Melayu"); key_subject is the older name for it.
 * - min_credits: credits in any subjects ("DUA (2) C dalam mana-mana matapelajaran").
 * - subjects_from_list: grade in N subjects from a list ("Gred C dalam TIGA (3): Physics, Chemistry, Biology").
 * - min_cgpa, min_muet: a number at least ("PNGK 2.00", "MUET Band 2.0").
 * - declaration: something the student confirms or the university checks (citizenship, health, interview).
 * - note: context shown with the requirements, never checked ("Memiliki SPM dengan mendapat sekurang-kurangnya:-").
 */
export const ConditionType = z.enum(['min_grade', 'min_credits', 'min_cgpa', 'min_muet', 'key_subject', 'subjects_from_list', 'declaration', 'note']);
export type ConditionType = z.infer<typeof ConditionType>;

/** Syarat Am (general, set per university and route) or Syarat Khas (special, set per programme). */
export const RequirementPart = z.enum(['general', 'special']);
export type RequirementPart = z.infer<typeof RequirementPart>;

/**
 * One requirement line. Rules with the same `orGroup` are alternatives ("ATAU", at least one of); different groups
 * must all pass ("DAN"). Lines are shown by part, then group, then `position`, under their `section` (SPM, STPM, MUET).
 */
export const RequirementRuleDto = z.object({
  id: z.uuid(),
  orGroup: z.number().int(),
  conditionType: ConditionType,
  subjectId: z.uuid().nullable(),
  minGrade: z.string().nullable(),
  minValue: z.number().nullable(),
  officialText: z.string().nullable(),
  part: RequirementPart.default('special'),
  section: z.string().nullable().default(null),
  /** subjects_from_list: the subjects to choose from, and how many must reach `minGrade`. */
  subjectIds: z.array(z.uuid()).default([]),
  minCount: z.number().int().nullable().default(null),
  position: z.number().int().default(0),
});
export type RequirementRuleDto = z.infer<typeof RequirementRuleDto>;

export const PublishedRequirement = z.object({
  requirementId: z.uuid(),
  programId: z.uuid(),
  entryRoute: z.string(),
  versionNo: z.number().int(),
  /** The official candidate category the rules come from (ePanduan, e.g. "stpm:S"). */
  sourceCategory: z.string().nullable().default(null),
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
