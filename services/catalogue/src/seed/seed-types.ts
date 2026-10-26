import type { RuleType, StudyLevel } from '@edulaunch/contracts';

type Riasec = Record<'R' | 'I' | 'A' | 'S' | 'E' | 'C', number>;

/** Rows are linked by readable keys; the seeder turns each key into a fixed UUID. */
export interface SeedDataset {
  institutions: Array<{ key: string; name: string; shortName: string; type: string; websiteUrl: string | null }>;
  fields: Array<{ key: string; name: string; nameEn: string; riasec: Riasec }>;
  /** `aliases`: other names students type, such as "Add Maths" (used for search). */
  subjects: Array<{ key: string; name: string; nameEn: string; qualification: 'spm' | 'school' | 'stpm' | 'a_level'; category: string; isMandatory: boolean; aliases?: string[] }>;
  programmes: Array<{ key: string; name: string; institutionKey: string | null; studyLevel: StudyLevel; durationSemesters: number | null; fieldKeys: string[] }>;
  requirements: Array<{
    programmeKey: string;
    entryRoute: string;
    rules: Array<{ groupNo: number; ruleType: RuleType; subjectKey?: string; minGrade?: string; minValue?: number; evidenceQuote: string }>;
  }>;
  pathways: Array<{ fromKey: string; toKey: string; conditionText: string; minCgpa: number | null }>;
  careers: Array<{ key: string; fieldKey: string; title: string; description: string; minStudyLevel: StudyLevel }>;
  activities: Array<{ key: string; fieldKey: string; title: string; type: string }>;
  admissionStats: Array<{ programmeKey: string; intakeYear: number; lowestMerit: number; averageMerit: number; applicants: number; places: number }>;
}
