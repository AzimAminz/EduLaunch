import { GradeScales, type StudentSnapshot } from '@edulaunch/contracts';
import { z } from 'zod';

type EducationLevel = StudentSnapshot['educationLevel'];

/** Which results form a level fills in. Dictionary keys use the variant name. */
export type RecordVariant = 'school' | 'target' | 'actual' | 'basic';

export interface RecordForm {
  variant: RecordVariant;
  qualification: 'school' | 'spm';
  kind: 'school' | 'target' | 'actual';
}

/**
 * Form 1–3: school grades (never converted to SPM). Form 4–5: SPM targets.
 * After SPM: actual SPM. After pre-university or Diploma: their basic SPM results for now
 * (CGPA, MUET and STPM grades come in Step 6b).
 */
export function recordFormFor(level: EducationLevel): RecordForm {
  switch (level) {
    case 'form1_3':
      return { variant: 'school', qualification: 'school', kind: 'school' };
    case 'form4_5':
      return { variant: 'target', qualification: 'spm', kind: 'target' };
    case 'after_spm':
      return { variant: 'actual', qualification: 'spm', kind: 'actual' };
    default:
      return { variant: 'basic', qualification: 'spm', kind: 'actual' };
  }
}

export const gradesFor = (qualification: RecordForm['qualification']): readonly string[] => GradeScales[qualification];

/** Exam years to choose from, newest first. School results and actual SPM are in the past; targets are ahead. */
export function examYearsFor(form: RecordForm, thisYear: number): number[] {
  if (form.kind === 'target') return [thisYear, thisYear + 1, thisYear + 2];
  if (form.kind === 'school') return [thisYear, thisYear - 1];
  return Array.from({ length: 6 }, (_, i) => thisYear - i);
}

export interface SubjectOption {
  id: string;
  name: string;
  category: string | null;
  isMandatory: boolean;
}

export interface SubjectRow {
  subjectId: string;
  grade: string;
}

/** Compulsory subjects first, then by name, so the table reads like a results slip. */
export function sortRows(rows: SubjectRow[], subjects: SubjectOption[], locale: string): SubjectRow[] {
  const byId = new Map(subjects.map((s) => [s.id, s]));
  return [...rows].sort((a, b) => {
    const sa = byId.get(a.subjectId);
    const sb = byId.get(b.subjectId);
    if (!!sa?.isMandatory !== !!sb?.isMandatory) return sa?.isMandatory ? -1 : 1;
    return (sa?.name ?? '').localeCompare(sb?.name ?? '', locale);
  });
}

/** A new form starts with the compulsory subjects, without grades. */
export const startingRows = (subjects: SubjectOption[], locale: string): SubjectRow[] =>
  sortRows(
    subjects.filter((s) => s.isMandatory).map((s) => ({ subjectId: s.id, grade: '' })),
    subjects,
    locale,
  );

export type RecordFormError = 'noSubjects' | 'missingGrade' | 'generic';

const Rows = z.array(z.object({ subjectId: z.uuid(), grade: z.string() }));

/** Reads the submitted form: the rows travel as JSON in one hidden field. */
export function parseRecordSubmission(form: FormData, grades: readonly string[]): { examYear: number | null; subjects: SubjectRow[] } | { error: RecordFormError } {
  let rows: SubjectRow[];
  try {
    rows = Rows.parse(JSON.parse(String(form.get('subjects') ?? '[]')));
  } catch {
    return { error: 'generic' };
  }
  if (rows.length === 0) return { error: 'noSubjects' };
  if (rows.some((r) => !grades.includes(r.grade))) return { error: 'missingGrade' };
  if (new Set(rows.map((r) => r.subjectId)).size !== rows.length) return { error: 'generic' };

  const year = Number(form.get('examYear'));
  return { examYear: Number.isInteger(year) && year >= 2000 && year <= 2100 ? year : null, subjects: rows };
}
