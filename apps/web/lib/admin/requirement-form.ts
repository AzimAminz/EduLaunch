import { GradeScales, RouteSubjectQualifications, hasSubjectGrades, type EntryRoute, type RecordQualification } from '@edulaunch/contracts';
import { z } from 'zod';

/** The rule types the editor writes. Stored `key_subject` rules are shown as minimum-grade rules. */
export const EditorRuleTypes = ['min_grade', 'min_credits', 'min_cgpa', 'min_muet'] as const;
export type EditorRuleType = (typeof EditorRuleTypes)[number];

export interface EditorRule {
  type: EditorRuleType;
  subjectId: string | null;
  /** Minimum grade (grade rules), or the credit grade (credit rules). */
  grade: string | null;
  /** Typed number: CGPA, MUET band or number of credits. Kept as text while editing. */
  value: string;
}

/** One requirement line. More than one rule means "at least one of these" (any rule passes). */
export interface EditorGroup {
  rules: EditorRule[];
  /** The sentence from the official source this line is based on. */
  quote: string;
}

export const EditorState = z.object({
  sourceUrl: z.string().max(600),
  groups: z
    .array(
      z.object({
        quote: z.string().max(1000),
        rules: z
          .array(z.object({ type: z.enum(EditorRuleTypes), subjectId: z.string().nullable(), grade: z.string().max(3).nullable(), value: z.string().max(10) }))
          .min(1)
          .max(20),
      }),
    )
    .max(30),
});
export type EditorState = z.infer<typeof EditorState>;

interface StoredRule {
  groupNo: number;
  ruleType: 'min_grade' | 'key_subject' | 'min_credits' | 'min_cgpa' | 'min_muet';
  subjectId: string | null;
  minGrade: string | null;
  minValue: number | null;
  evidenceQuote: string | null;
}

export const newRule = (type: EditorRuleType = 'min_grade'): EditorRule => ({ type, subjectId: null, grade: type === 'min_credits' ? 'C' : null, value: '' });

/** Stored rules → editor lines, in group order. */
export function groupsFromRules(rules: StoredRule[]): EditorGroup[] {
  const byGroup = new Map<number, StoredRule[]>();
  for (const r of rules) byGroup.set(r.groupNo, [...(byGroup.get(r.groupNo) ?? []), r]);
  return [...byGroup.entries()]
    .sort(([a], [b]) => a - b)
    .map(([, list]) => ({
      quote: list.find((r) => r.evidenceQuote)?.evidenceQuote ?? '',
      rules: list.map((r) => ({
        type: r.ruleType === 'key_subject' ? 'min_grade' : r.ruleType,
        subjectId: r.subjectId,
        grade: r.minGrade,
        value: r.minValue === null ? '' : String(r.minValue),
      })),
    }));
}

/** What is wrong with one rule or line, as a dictionary key. */
export type RuleProblem = 'subjectRequired' | 'gradeRequired' | 'cgpaRange' | 'muetRange' | 'creditsRange' | 'quoteRequired';

export interface CheckedState {
  rules: Array<{ groupNo: number; ruleType: EditorRuleType; subjectId: string | null; minGrade: string | null; minValue: number | null; evidenceQuote: string }>;
  /** Problems by line index, then by rule index (-1 for the source sentence of the line). */
  problems: Array<{ group: number; rule: number; problem: RuleProblem }>;
}

const number = (text: string) => {
  const n = Number(text.trim().replace(',', '.'));
  return text.trim() === '' || Number.isNaN(n) ? null : n;
};

/** Editor lines → rules to save, with every problem found (the catalogue service checks again). */
export function checkGroups(groups: EditorGroup[]): CheckedState {
  const problems: CheckedState['problems'] = [];
  const rules: CheckedState['rules'] = [];
  groups.forEach((g, gi) => {
    const quote = g.quote.trim();
    if (quote.length < 5) problems.push({ group: gi, rule: -1, problem: 'quoteRequired' });
    g.rules.forEach((r, ri) => {
      const problem = (p: RuleProblem) => problems.push({ group: gi, rule: ri, problem: p });
      const value = number(r.value);
      switch (r.type) {
        case 'min_grade':
          if (!r.subjectId) problem('subjectRequired');
          if (!r.grade) problem('gradeRequired');
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
        groupNo: gi + 1,
        ruleType: r.type,
        subjectId: r.type === 'min_grade' ? r.subjectId : null,
        minGrade: r.type === 'min_grade' || r.type === 'min_credits' ? r.grade || (r.type === 'min_credits' ? 'C' : null) : null,
        minValue: r.type === 'min_grade' ? null : value,
        evidenceQuote: quote,
      });
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
