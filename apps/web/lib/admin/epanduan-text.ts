import type { RequirementPart } from '@edulaunch/contracts';
import { checkLines, newLine, type EditorLine, type SavedRule } from './requirement-form';

/**
 * ePanduan requirement text (Syarat Am / Syarat Khas, kept as plain lines by the content service) read into blocks
 * a person can scan, and into editor lines with the rule each line most likely means. The lines are only a starting
 * point: the admin checks and corrects them, and another admin approves.
 */
export type TextBlock =
  | { kind: 'heading'; text: string }
  | { kind: 'join'; text: 'DAN' | 'ATAU' }
  | { kind: 'item'; text: string; subjects: string[]; section: string | null };

const isHeading = (line: string) =>
  line.length <= 70 && !line.startsWith('•') && line === line.toUpperCase() && /[A-Z]/.test(line) && !/\d\)|\d\.\d/.test(line) && !line.endsWith('.');

export function parseRequirementText(text: string | null | undefined): TextBlock[] {
  const blocks: TextBlock[] = [];
  let section: string | null = null;
  for (const raw of (text ?? '').split('\n')) {
    if (!raw.trim()) continue;
    const last = blocks.at(-1);
    if (raw.startsWith('  - ')) {
      const subject = raw.slice(4).trim();
      if (last?.kind === 'item') last.subjects.push(subject);
      else blocks.push({ kind: 'item', text: subject, subjects: [], section });
      continue;
    }
    const line = raw.trim();
    if (line === 'DAN' || line === 'ATAU') {
      blocks.push({ kind: 'join', text: line });
      continue;
    }
    if (line === 'Catatan:') continue;
    if (isHeading(line)) {
      section = line;
      blocks.push({ kind: 'heading', text: line });
      continue;
    }
    blocks.push({ kind: 'item', text: line.replace(/^•\s*/, ''), subjects: [], section });
  }
  return blocks;
}

/** A subject the editor can choose, with every name it may be written as. */
export interface MatchableSubject {
  id: string;
  qualification: string;
  keywords: string[];
}

type Item = Extract<TextBlock, { kind: 'item' }>;
type Rule = Pick<EditorLine, 'type' | 'subjectId' | 'subjectIds' | 'grade' | 'value' | 'count'>;

/** What one line means: rules (several = "ATAU"), or why it stays text. */
export type Suggestion =
  | { kind: 'rules'; rules: Rule[] }
  /** declaration: a condition to confirm; note: context; subject: a named subject is unknown. */
  | { kind: 'text'; type: 'declaration' | 'note'; reason?: 'subject' };

const WORD_NUMBERS: Record<string, number> = { satu: 1, dua: 2, tiga: 3, empat: 4, lima: 5, enam: 6, tujuh: 7, lapan: 8, sembilan: 9 };
const GRADE = '([A-E][+-]?)';
/** Conditions a student confirms or the university checks rather than results. */
const DECLARATION = /temu duga|temuduga|ujian kelayakan|lulus ujian|warganegara|ketidakupayaan|buta warna|rabun|kesihatan|sihat|bebas daripada|tidak mempunyai|ujian fizikal|ujian bakat|perlu menduduki/i;

const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/\((?:kertas julai|stpm|spm)\)/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

/** Which exam a line is about: said in the line ("di peringkat STPM"), else the section it sits under. */
function levelOf(text: string, section: string | null): string | null {
  const said = text.match(/peringkat\s+(SPM|STPM|Asasi|Matrikulasi|Diploma)/i)?.[1] ?? section?.match(/\b(SPM|STPM|MATRIKULASI|ASASI)\b/)?.[1];
  if (!said) return null;
  const level = said.toLowerCase();
  return level === 'asasi' ? 'foundation' : level === 'matrikulasi' ? 'matriculation' : level;
}

/** The subject a name refers to ("BAHASA MELAYU / BAHASA MELAYU (KERTAS JULAI)" → Bahasa Melayu), at that level. */
export function matchSubject(name: string, level: string | null, subjects: MatchableSubject[]): MatchableSubject | null {
  const names = name.split('/').map(norm).filter(Boolean);
  const pool = level ? subjects.filter((s) => s.qualification === level) : subjects;
  for (const candidate of [pool, subjects]) {
    const hit = candidate.find((s) => s.keywords.some((k) => names.includes(norm(k))));
    if (hit) return hit;
  }
  return null;
}

const numberWord = (word: string, digits?: string) => (digits ? Number(digits) : (WORD_NUMBERS[word.toLowerCase()] ?? NaN));
const blank: Rule = { type: 'min_grade', subjectId: null, subjectIds: [], grade: null, value: '', count: '1' };

/**
 * The rule(s) one requirement line most likely means. Recognised: PNGK / CGPA, MUET band, "Gred C bagi matapelajaran
 * X" (names joined by "/" or "atau" are alternatives), "EMPAT (4) C dalam mana-mana matapelajaran" (credits), and
 * "Gred C dalam TIGA (3) mata pelajaran …" with a subject list (N from the list). Conditions (interview, citizenship,
 * health) become declarations; anything else stays as a note.
 */
export function suggestRules(block: Item, subjects: MatchableSubject[], validGrade: (subjectId: string, grade: string) => boolean): Suggestion {
  const text = block.text;
  const level = levelOf(text, block.section);

  const cgpa = text.match(/(?:PNGK|CGPA|Purata Nilai Gred Kumulatif)[^0-9]{0,30}(\d\.\d{1,2})/i);
  if (cgpa) return { kind: 'rules', rules: [{ ...blank, type: 'min_cgpa', value: cgpa[1]! }] };

  const muet = /MUET|Malaysian University English Test/i.test(text) ? text.match(/BAND\s*(\d(?:\.\d)?)/i) : null;
  if (muet) return { kind: 'rules', rules: [{ ...blank, type: 'min_muet', value: muet[1]! }] };

  const credits = text.match(new RegExp(`\\b([A-Za-z]+)\\s*\\((\\d+)\\)\\s*(?:Gred\\s+)?${GRADE}\\s+dalam\\s+mana-mana`, 'i'));
  if (credits) return { kind: 'rules', rules: [{ ...blank, type: 'min_credits', grade: credits[3]!.toUpperCase(), value: String(numberWord(credits[1]!, credits[2])) }] };

  const fromList = text.match(new RegExp(`Gred\\s+${GRADE}\\s+dalam\\s+([A-Za-z]+)\\s*\\((\\d+)\\)\\s+mata\\s?pelajaran`, 'i'));
  if (fromList && block.subjects.length) {
    const grade = fromList[1]!.toUpperCase();
    const found = block.subjects.map((n) => matchSubject(n, level, subjects));
    const ids = [...new Set(found.filter((s): s is MatchableSubject => !!s).map((s) => s.id))];
    if (ids.length === 0) return { kind: 'text', type: 'note', reason: 'subject' };
    const count = Math.min(numberWord(fromList[2]!, fromList[3]), ids.length);
    const gradeOk = ids.every((id) => validGrade(id, grade));
    return { kind: 'rules', rules: [{ ...blank, type: 'subjects_from_list', subjectIds: ids, grade: gradeOk ? grade : null, count: String(count) }] };
  }

  const named = text.match(new RegExp(`Gred\\s+${GRADE}\\s+(?:bagi|dalam)\\s+(?:mata\\s?pelajaran|matapelajaran)\\s+(.+?)(?:\\s+mulai\\b|\\s+di peringkat\\b|\\.?$)`, 'i'));
  if (named) {
    const grade = named[1]!.toUpperCase();
    const found = named[2]!.split(/\s+atau\s+/i).map((n) => matchSubject(n, level, subjects));
    if (found.some((s) => !s)) return { kind: 'text', type: 'note', reason: 'subject' };
    const unique = [...new Map(found.map((s) => [s!.id, s!])).values()];
    return { kind: 'rules', rules: unique.map((s) => ({ ...blank, subjectId: s.id, grade: validGrade(s.id, grade) ? grade : null })) };
  }

  return { kind: 'text', type: DECLARATION.test(text) ? 'declaration' : 'note' };
}

const sentence = (item: Item) => (item.subjects.length ? `${item.text} ${item.subjects.join('; ')}` : item.text).slice(0, 1500);

/**
 * One part (Syarat Am or Syarat Khas) of ePanduan text as editor lines: headings become each line's section, DAN /
 * ATAU become how a line joins the one before, and several rules from one sentence are joined by ATAU.
 */
export function linesFromText(text: string | null, part: RequirementPart, subjects: MatchableSubject[], validGrade: (subjectId: string, grade: string) => boolean): EditorLine[] {
  const lines: EditorLine[] = [];
  let join: 'and' | 'or' = 'and';
  for (const block of parseRequirementText(text)) {
    if (block.kind === 'heading') continue;
    if (block.kind === 'join') {
      join = block.text === 'ATAU' ? 'or' : 'and';
      continue;
    }
    const suggestion = suggestRules(block, subjects, validGrade);
    const base = { section: block.section ?? '', text: sentence(block) };
    if (suggestion.kind === 'text') {
      lines.push(newLine(part, { ...base, type: suggestion.type, join: 'and' }));
    } else {
      suggestion.rules.forEach((rule, i) => lines.push(newLine(part, { ...base, ...rule, join: i === 0 ? join : 'or' })));
    }
    join = 'and';
  }
  return lines;
}

/** One tab of requirements: the categories that share exactly the same Syarat Am and Syarat Khas. */
export interface CategoryGroup {
  key: string;
  categories: Array<{ jenprog: string; category: string; route: string | null }>;
  general: string | null;
  special: { status: 'pending' | 'done' | 'failed'; text: string | null } | null;
  /** The route of a tab with no ePanduan categories (requirements written without ePanduan). */
  route?: string;
}

/** Categories with identical requirement text are shown once ("STPM Sains · STPM Sastera"), in the order found. */
export function groupCategories(
  categories: Array<{ jenprog: string; category: string; route: string | null; generalRequirements: string | null }>,
  special: Array<{ category: string; status: 'pending' | 'done' | 'failed'; text: string | null }>,
): CategoryGroup[] {
  const byCategory = new Map(special.map((s) => [s.category, s]));
  const groups = new Map<string, CategoryGroup>();
  for (const c of categories) {
    const s = byCategory.get(c.category);
    const key = JSON.stringify([c.generalRequirements, s?.status ?? null, s?.text ?? null]);
    const group = groups.get(key) ?? { key, categories: [], general: c.generalRequirements, special: s ? { status: s.status, text: s.text } : null };
    group.categories.push({ jenprog: c.jenprog, category: c.category, route: c.route });
    groups.set(key, group);
  }
  return [...groups.values()];
}

/** Both parts of one group's text (Syarat Am, and Syarat Khas once read) as editor lines. */
export function linesFromGroup(group: CategoryGroup, subjects: MatchableSubject[], validGrade: (subjectId: string, grade: string) => boolean): EditorLine[] {
  const special = group.special?.status === 'done' ? group.special.text : null;
  return [...linesFromText(group.general, 'general', subjects, validGrade), ...linesFromText(special, 'special', subjects, validGrade)];
}

/**
 * Rules to save as a draft straight from one group's ePanduan text. A line that cannot be checked as read (a subject
 * not known, a grade not on its scale) keeps its sentence as a note, for the admin to finish in the editor.
 */
export function rulesFromGroup(group: CategoryGroup, subjects: MatchableSubject[], validGrade: (subjectId: string, grade: string) => boolean): SavedRule[] {
  const lines = linesFromGroup(group, subjects, validGrade).filter((l) => l.text.trim().length >= 2);
  const bad = new Set(checkLines(lines).problems.map((p) => p.line));
  return checkLines(lines.map((l, i) => (bad.has(i) ? { ...l, type: 'note' as const, join: 'and' as const } : l))).rules;
}

/** The ePanduan list page a group's text comes from (its first category). */
export const groupSourceUrl = (group: CategoryGroup) =>
  `https://online.mohe.gov.my/epanduan/ProgramPengajian/kategoriCalon/${group.categories[0]!.category}?jenprog=${group.categories[0]!.jenprog}`;

