import { SpmCoreSubjects, SpmMeritSubjects, spmSubjectByCode } from '@edulaunch/contracts';
import type { SubjectOption, SubjectRow } from '@/lib/profile/records';

/** One row read from a result slip by the content service. */
export interface SlipRow {
  code: string;
  name: string;
  grade: string | null;
  confidence: number;
}

/**
 * Why a row needs the student's eye: the reading was unsure, the grade is missing or not on the scale, the code is
 * not an SPM code we know, the name read does not match that code's official name (a sign of a misread), or the
 * subject is not in our list (kept under the name read).
 */
export type SlipFlag = 'low_confidence' | 'no_grade' | 'unknown_code' | 'name_differs' | 'not_in_list';

export interface MatchedSlipRow extends SubjectRow {
  flags: SlipFlag[];
}

/** Below this, a row is marked for checking. */
export const SURE_ENOUGH = 0.9;
/** A row with no code is taken only when its name is at least this close to an official SPM subject. */
const NAME_MATCH = 0.8;

const norm = (s: string) => s.toLocaleUpperCase('ms').replace(/[^A-Z]/g, '');

/** How alike two names are, 0 to 1 (edit distance over the longer length). */
export function similarity(a: string, b: string): number {
  const x = norm(a);
  const y = norm(b);
  if (!x || !y) return 0;
  const prev = Array.from({ length: y.length + 1 }, (_, j) => j);
  for (let i = 1; i <= x.length; i++) {
    let diag = prev[0]!;
    prev[0] = i;
    for (let j = 1; j <= y.length; j++) {
      const up = prev[j]!;
      prev[j] = Math.min(prev[j]! + 1, prev[j - 1]! + 1, diag + (x[i - 1] === y[j - 1] ? 0 : 1));
      diag = up;
    }
  }
  return 1 - prev[y.length]! / Math.max(x.length, y.length);
}

/** The official SPM subject a name read from a slip is closest to, when it is close enough. */
function officialByName(name: string): { name: string; score: number } | null {
  let best: { name: string; score: number } | null = null;
  for (const s of [...SpmCoreSubjects, ...SpmMeritSubjects]) {
    const score = similarity(name, s.name);
    if (!best || score > best.score) best = { name: s.name, score };
  }
  return best && best.score >= NAME_MATCH ? best : null;
}

const titleCase = (s: string) => s.toLocaleLowerCase('ms').replace(/(^|\s)\S/g, (c) => c.toLocaleUpperCase('ms'));

/**
 * Rows read from a slip, as rows of the results form: each code is looked up in the official SPM subject codes and
 * then in our subject list; a row without a code (a school's slip) is found by its name among the official
 * subjects, and dropped when it is not one of them (a stray line of the slip); anything unsure is flagged. Nothing is saved here: the student checks the form and
 * saves it as usual.
 */
export function matchSlipRows(read: SlipRow[], subjects: SubjectOption[], grades: readonly string[]): MatchedSlipRow[] {
  const out: MatchedSlipRow[] = [];
  for (const r of read) {
    const byCode = r.code ? spmSubjectByCode(r.code) : null;
    const byName = r.code ? null : officialByName(r.name);
    if (!r.code && !byName) continue;
    const official = byCode ?? byName?.name ?? null;
    const wanted = official ?? r.name;
    const subject = subjects.find((s) => norm(s.name) === norm(wanted) || s.keywords.some((k) => norm(k) === norm(wanted)));
    const grade = r.grade && grades.includes(r.grade) ? r.grade : '';
    const flags: SlipFlag[] = [];
    if (r.confidence < SURE_ENOUGH) flags.push('low_confidence');
    if (!grade) flags.push('no_grade');
    if (r.code && !official) flags.push('unknown_code');
    else if (official && similarity(r.name, official) < (byName ? 0.95 : 0.75)) flags.push('name_differs');
    if (!subject) flags.push('not_in_list');
    // A subject read twice (a misread code) is kept once, the first time.
    if (subject && out.some((o) => o.subjectId === subject.id)) continue;
    out.push(
      subject
        ? { subjectId: subject.id, grade, flags }
        : { subjectId: crypto.randomUUID(), grade, customName: titleCase(wanted).slice(0, 80), flags },
    );
  }
  return out;
}
