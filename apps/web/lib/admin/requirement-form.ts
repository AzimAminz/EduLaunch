import { GradeScales, RouteSubjectQualifications, hasSubjectGrades, type EntryRoute, type RecordQualification, type RequirementPart } from '@edulaunch/contracts';
import { z } from 'zod';
import { format } from '../i18n/locale';

/**
 * The requirement editor's model, shaped like an official source (JPT ePanduan): Syarat Am and Syarat Khas, each a
 * list of lines under section headings (SPM, STPM, MUET), joined by DAN (all must pass) or ATAU (one of them).
 * Every line keeps the official sentence; checkable lines also carry the rule a student's results are matched with.
 */
export const EditorRuleTypes = ['min_grade', 'subjects_from_list', 'min_credits', 'min_cgpa', 'min_muet', 'declaration', 'note'] as const;
export type EditorRuleType = (typeof EditorRuleTypes)[number];

/** Read, not checked: they stand alone (never in an ATAU). */
export const isUnchecked = (type: EditorRuleType) => type === 'declaration' || type === 'note';

/** Headings offered for a line, as official sources use them. */
export const SectionSuggestions = ['SPM', 'STPM', 'MATRIKULASI / ASASI', 'DIPLOMA', 'MUET', 'STAM', 'A-LEVEL', 'LAIN-LAIN'] as const;

export interface EditorLine {
  /** Stable while editing (React key); not saved. */
  key: string;
  part: RequirementPart;
  /** Heading the line sits under ('' for none). */
  section: string;
  type: EditorRuleType;
  subjectId: string | null;
  /** subjects_from_list: the subjects to choose from. */
  subjectIds: string[];
  /** Minimum grade (grade and list rules), or the credit grade (credit rules). */
  grade: string | null;
  /** CGPA, MUET band or number of credits, as typed. */
  value: string;
  /** subjects_from_list: how many of the listed subjects, as typed. */
  count: string;
  /** The official sentence (evidence for checked lines, the text itself for notes and declarations). */
  text: string;
  /** How this line relates to the line before it in the same part. */
  join: 'and' | 'or';
}

const Line = z.object({
  part: z.enum(['general', 'special']),
  section: z.string().max(60),
  type: z.enum(EditorRuleTypes),
  subjectId: z.string().nullable(),
  subjectIds: z.array(z.string()).max(40),
  grade: z.string().max(3).nullable(),
  value: z.string().max(10),
  count: z.string().max(3),
  text: z.string().max(1500),
  join: z.enum(['and', 'or']),
});

export const EditorState = z.object({
  sourceUrl: z.string().max(600),
  sourceCategory: z.string().max(20).nullable(),
  lines: z.array(Line).max(80),
});
export type EditorState = z.infer<typeof EditorState>;

let counter = 0;
const nextKey = () => `line-${++counter}`;

export const newLine = (part: RequirementPart, over: Partial<EditorLine> = {}): EditorLine => ({
  key: nextKey(),
  part,
  section: '',
  type: 'min_grade',
  subjectId: null,
  subjectIds: [],
  grade: null,
  value: '',
  count: '1',
  text: '',
  join: 'and',
  ...over,
});

interface StoredRule {
  groupNo: number;
  ruleType: 'min_grade' | 'key_subject' | 'min_credits' | 'min_cgpa' | 'min_muet' | 'subjects_from_list' | 'declaration' | 'note';
  subjectId: string | null;
  minGrade: string | null;
  minValue: number | null;
  evidenceQuote: string | null;
  part?: RequirementPart;
  section?: string | null;
  subjectIds?: string[];
  minCount?: number | null;
  position?: number;
}

/** Stored rules → editor lines: Syarat Am first, then Syarat Khas; rules sharing a group become lines joined by ATAU. */
export function linesFromRules(rules: StoredRule[]): EditorLine[] {
  const partOrder = (r: StoredRule) => (r.part === 'general' ? 0 : 1);
  const sorted = [...rules].sort((a, b) => partOrder(a) - partOrder(b) || a.groupNo - b.groupNo || (a.position ?? 0) - (b.position ?? 0));
  return sorted.map((r, i) => {
    const previous = sorted[i - 1];
    const type: EditorRuleType = r.ruleType === 'key_subject' ? 'min_grade' : r.ruleType;
    return newLine(r.part ?? 'special', {
      section: r.section ?? '',
      type,
      subjectId: r.subjectId,
      subjectIds: r.subjectIds ?? [],
      grade: r.minGrade,
      // CGPA keeps two decimals and MUET one, as official sources write them ("2.00", "Band 2.0").
      value: r.minValue === null || type === 'subjects_from_list' ? '' : type === 'min_cgpa' ? r.minValue.toFixed(2) : type === 'min_muet' ? r.minValue.toFixed(1) : String(r.minValue),
      count: String(r.minCount ?? 1),
      text: r.evidenceQuote ?? '',
      join: previous && previous.groupNo === r.groupNo && (previous.part ?? 'special') === (r.part ?? 'special') ? 'or' : 'and',
    });
  });
}

/** What is wrong with one line, as a dictionary key. */
export type LineProblem = 'subjectRequired' | 'subjectsRequired' | 'gradeRequired' | 'countRange' | 'cgpaRange' | 'muetRange' | 'creditsRange' | 'textRequired';

export interface SavedRule {
  groupNo: number;
  ruleType: EditorRuleType;
  subjectId: string | null;
  minGrade: string | null;
  minValue: number | null;
  evidenceQuote: string;
  part: RequirementPart;
  section: string | null;
  subjectIds: string[];
  minCount: number | null;
  position: number;
}

export interface CheckedLines {
  rules: SavedRule[];
  /** Problems by line index. */
  problems: Array<{ line: number; problem: LineProblem }>;
}

const number = (text: string) => {
  const n = Number(text.trim().replace(',', '.'));
  return text.trim() === '' || Number.isNaN(n) ? null : n;
};

/**
 * Editor lines → rules to save, with every problem found (the catalogue service checks again). Lines joined by ATAU
 * share a group; a note or declaration always starts its own group, and so does the first line of each part and
 * of each section (sections are joined by DAN, as on the official page).
 */
export function checkLines(lines: EditorLine[]): CheckedLines {
  const problems: CheckedLines['problems'] = [];
  const rules: SavedRule[] = [];
  const ordered = [...lines.filter((l) => l.part === 'general'), ...lines.filter((l) => l.part === 'special')];
  let group = 0;
  ordered.forEach((line, position) => {
    const index = lines.indexOf(line);
    const problem = (p: LineProblem) => problems.push({ line: index, problem: p });
    const previous = ordered[position - 1];
    const alternative = line.join === 'or' && previous && previous.part === line.part && previous.section === line.section && !isUnchecked(line.type) && !isUnchecked(previous.type);
    if (!alternative) group += 1;
    const text = line.text.trim();
    if (text.length < 2) problem('textRequired');
    const value = number(line.value);
    const count = number(line.count);
    switch (line.type) {
      case 'min_grade':
        if (!line.subjectId) problem('subjectRequired');
        if (!line.grade) problem('gradeRequired');
        break;
      case 'subjects_from_list':
        if (line.subjectIds.length === 0) problem('subjectsRequired');
        if (!line.grade) problem('gradeRequired');
        if (count === null || !Number.isInteger(count) || count < 1 || count > Math.max(1, line.subjectIds.length)) problem('countRange');
        break;
      case 'min_cgpa':
        if (value === null || value < 0 || value > 4) problem('cgpaRange');
        break;
      case 'min_muet':
        if (value === null || value < 1 || value > 6) problem('muetRange');
        break;
      case 'min_credits':
        if (value === null || value < 1 || value > 20 || !Number.isInteger(value)) problem('creditsRange');
        break;
    }
    rules.push({
      groupNo: group,
      ruleType: line.type,
      subjectId: line.type === 'min_grade' ? line.subjectId : null,
      minGrade: line.type === 'min_grade' || line.type === 'subjects_from_list' || line.type === 'min_credits' ? line.grade || (line.type === 'min_credits' ? 'C' : null) : null,
      minValue: line.type === 'min_cgpa' || line.type === 'min_muet' || line.type === 'min_credits' ? value : null,
      evidenceQuote: text,
      part: line.part,
      section: line.section.trim() || null,
      subjectIds: line.type === 'subjects_from_list' ? line.subjectIds : [],
      minCount: line.type === 'subjects_from_list' ? count : null,
      position,
    });
  });
  return { rules, problems };
}

/** Qualifications whose subjects a rule on this route may name (SPM, plus STPM after STPM…). */
export const subjectQualificationsFor = (route: EntryRoute): readonly RecordQualification[] => RouteSubjectQualifications[route];

/** Grades for a subject of this qualification, best first; SPM grades when unknown. */
export function gradesFor(qualification: string | undefined): readonly string[] {
  const q = (qualification ?? 'spm') as RecordQualification;
  return hasSubjectGrades(q) ? GradeScales[q] : GradeScales.spm;
}

/** Texts a line summary needs (dict.admin.requirement). */
export interface SummaryTexts {
  summaryOf: { grade: string; list: string; credits: string; cgpa: string; muet: string };
  kinds: Record<EditorRuleType, string>;
}

/** "Bahasa Melayu ≥ C", "2 daripada [Physics, Chemistry] ≥ C", "PNGK ≥ 2.00", or the kind of a text line. */
export function lineSummary(line: EditorLine, name: (subjectId: string | null) => string, t: SummaryTexts): string {
  const s = t.summaryOf;
  switch (line.type) {
    case 'min_grade':
      return format(s.grade, { subject: name(line.subjectId), grade: line.grade ?? '?' });
    case 'subjects_from_list':
      return format(s.list, { count: line.count || '?', grade: line.grade ?? '?', subjects: line.subjectIds.map(name).join(', ') || '?' });
    case 'min_credits':
      return format(s.credits, { n: line.value || '?', grade: line.grade ?? 'C' });
    case 'min_cgpa':
      return format(s.cgpa, { value: line.value || '?' });
    case 'min_muet':
      return format(s.muet, { value: line.value || '?' });
    default:
      return t.kinds[line.type];
  }
}
