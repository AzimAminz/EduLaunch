import { GradeScales, HigherQualifications, MuetBands, hasCgpa, hasSubjectGrades, type StudentSnapshot } from '@edulaunch/contracts';
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
 * Form 1–3: school grades (never converted to SPM), one record per year. Form 4–5: SPM targets.
 * After SPM: actual SPM. After pre-university or Diploma: their basic SPM results (the "SPM asas" tab);
 * their qualification itself (CGPA, MUET…) uses the forms further down.
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

export type HistoryKind = 'school' | 'target' | 'actual' | 'stpm' | 'matriculation' | 'foundation' | 'a_level' | 'diploma';

/** How a saved record is named in the history list. */
export const historyKind = (record: { qualification: string; kind: string }): HistoryKind =>
  record.qualification === 'spm' ? (record.kind === 'target' ? 'target' : 'actual') : (record.qualification as HistoryKind);

export const gradesFor = (qualification: RecordForm['qualification']): readonly string[] => GradeScales[qualification];

/** Exam years to choose from, newest first. School results cover Form 1–3 (three years back); targets are ahead. */
export function examYearsFor(form: RecordForm, thisYear: number): number[] {
  if (form.kind === 'target') return [thisYear, thisYear + 1, thisYear + 2];
  if (form.kind === 'school') return [thisYear, thisYear - 1, thisYear - 2];
  return Array.from({ length: 6 }, (_, i) => thisYear - i);
}

export interface SubjectOption {
  id: string;
  name: string;
  category: string | null;
  isMandatory: boolean;
  /** Other names that find this subject when searching (English name, aliases such as "Add Maths"). */
  keywords: string[];
}

export interface SubjectRow {
  subjectId: string;
  grade: string;
  /** Set for a subject the student typed because it is not in the official list. */
  customName?: string | null;
}

/** Compulsory subjects first, then by name, so the table reads like a results slip. Typed subjects go last. */
export function sortRows(rows: SubjectRow[], subjects: SubjectOption[], locale: string): SubjectRow[] {
  const byId = new Map(subjects.map((s) => [s.id, s]));
  const rank = (r: SubjectRow) => (r.customName ? 2 : byId.get(r.subjectId)?.isMandatory ? 0 : 1);
  const name = (r: SubjectRow) => r.customName ?? byId.get(r.subjectId)?.name ?? '';
  return [...rows].sort((a, b) => rank(a) - rank(b) || name(a).localeCompare(name(b), locale));
}

/** A new form starts with the compulsory subjects, without grades. */
export const startingRows = (subjects: SubjectOption[], locale: string): SubjectRow[] =>
  sortRows(
    subjects.filter((s) => s.isMandatory).map((s) => ({ subjectId: s.id, grade: '' })),
    subjects,
    locale,
  );

/** Tidies a typed subject name: "  tasawwuf   islam " → "tasawwuf islam". */
export const cleanSubjectName = (name: string) => name.trim().replace(/\s+/g, ' ').slice(0, 80);

/**
 * A typed name that matches an official subject (its name or another name, any case) becomes that subject,
 * so "add maths" is saved as Matematik Tambahan rather than as a new subject.
 */
export function matchOfficialSubject(name: string, subjects: SubjectOption[]): SubjectOption | undefined {
  const wanted = cleanSubjectName(name).toLocaleLowerCase();
  return subjects.find((s) => [s.name, ...s.keywords].some((w) => w.toLocaleLowerCase() === wanted));
}

export type RecordFormError = 'noSubjects' | 'missingGrade' | 'yearRequired' | 'generic';

const Rows = z.array(z.object({ subjectId: z.uuid(), grade: z.string(), customName: z.string().nullish() }));

/** Reads the submitted form: the rows travel as JSON in one hidden field. */
export function parseRecordSubmission(
  form: FormData,
  grades: readonly string[],
  options: { yearRequired?: boolean } = {},
): { examYear: number | null; subjects: Array<{ subjectId: string; grade: string; customName: string | null }> } | { error: RecordFormError } {
  let rows: z.infer<typeof Rows>;
  try {
    rows = Rows.parse(JSON.parse(String(form.get('subjects') ?? '[]')));
  } catch {
    return { error: 'generic' };
  }
  const year = Number(form.get('examYear'));
  const examYear = Number.isInteger(year) && year >= 2000 && year <= 2100 ? year : null;
  if (options.yearRequired && examYear === null) return { error: 'yearRequired' };
  if (rows.length === 0) return { error: 'noSubjects' };
  if (rows.some((r) => !grades.includes(r.grade))) return { error: 'missingGrade' };
  if (new Set(rows.map((r) => r.subjectId)).size !== rows.length) return { error: 'generic' };

  return { examYear, subjects: rows.map((r) => ({ subjectId: r.subjectId, grade: r.grade, customName: r.customName ? cleanSubjectName(r.customName) : null })) };
}

// ── Results after SPM (pre-university and diploma) ──────────────────────────

export type HigherQualification = (typeof HigherQualifications)[number];

/** The qualifications a level chooses from: STPM, matriculation, foundation or A-Level; or a diploma. */
export const higherChoicesFor = (level: EducationLevel): HigherQualification[] =>
  level === 'after_diploma' ? ['diploma'] : level === 'after_preu' ? ['stpm', 'matriculation', 'foundation', 'a_level'] : [];

/** Reads a typed CGPA: "3.42" or "3,42". Empty means not given. */
export function parseCgpa(text: string): number | null | 'invalid' {
  const cleaned = text.trim().replace(',', '.');
  if (!cleaned) return null;
  if (!/^\d(\.\d{1,2})?$/.test(cleaned)) return 'invalid';
  const value = Number(cleaned);
  return value <= 4 ? value : 'invalid';
}

export type HigherFormError = RecordFormError | 'cgpaRequired' | 'cgpaInvalid';

export interface HigherSubmission {
  examYear: number;
  cgpa: number | null;
  muetBand: number | null;
  fieldId: string | null;
  programmeName: string | null;
  subjects: Array<{ subjectId: string; grade: string; customName: string | null }>;
}

/** Reads the pre-university or diploma form. CGPA is needed except for A-Level; STPM and A-Level also need subject grades. */
export function parseHigherSubmission(form: FormData, qualification: HigherQualification): HigherSubmission | { error: HigherFormError } {
  const year = Number(form.get('examYear'));
  if (!Number.isInteger(year) || year < 2000 || year > 2100) return { error: 'yearRequired' };

  const cgpa = hasCgpa(qualification) ? parseCgpa(String(form.get('cgpa') ?? '')) : null;
  if (cgpa === 'invalid') return { error: 'cgpaInvalid' };
  if (hasCgpa(qualification) && cgpa === null) return { error: 'cgpaRequired' };

  const muet = Number(form.get('muetBand'));
  const muetBand = (MuetBands as readonly number[]).includes(muet) ? muet : null;

  let subjects: HigherSubmission['subjects'] = [];
  if (hasSubjectGrades(qualification)) {
    const parsed = parseRecordSubmission(form, GradeScales[qualification]);
    if ('error' in parsed) return { error: parsed.error };
    subjects = parsed.subjects;
  }

  const fieldId = qualification === 'diploma' ? z.uuid().safeParse(form.get('fieldId')).data ?? null : null;
  const programme = qualification === 'diploma' ? cleanSubjectName(String(form.get('programmeName') ?? '')).slice(0, 120) : '';
  return { examYear: year, cgpa, muetBand, fieldId, programmeName: programme || null, subjects };
}
