import type { PublishedRequirement, RequirementRuleDto } from '@edulaunch/contracts';
import { format, type Dictionary } from '../i18n/locale';

export interface RequirementItem {
  title: string;
  detail: string;
}

export interface DescribedRequirement {
  entryRoute: string;
  items: RequirementItem[];
  /** True when the rules come from sample data (quotes marked "[Contoh]"). */
  isSample: boolean;
  /** The source sentences, without the sample marker, in rule order. */
  quotes: string[];
}

type Texts = Dictionary['requirements'];

const SAMPLE_MARKER = '[Contoh]';

/** Joins names as "A, B or C" in the current language. */
function joinOr(parts: string[], t: Texts): string {
  return parts.length <= 1 ? (parts[0] ?? '') : `${parts.slice(0, -1).join(', ')} ${t.or} ${parts.at(-1)}`;
}

function subjectName(rule: RequirementRuleDto, names: ReadonlyMap<string, string>, t: Texts): string {
  return (rule.subjectId && names.get(rule.subjectId)) || t.otherSubject;
}

function describeSingle(rule: RequirementRuleDto, names: ReadonlyMap<string, string>, t: Texts): RequirementItem {
  switch (rule.ruleType) {
    case 'min_credits':
      return { title: t.credits, detail: format(t.creditsDetail, { count: rule.minValue ?? 0, grade: rule.minGrade ?? 'C' }) };
    case 'min_cgpa':
      return { title: t.cgpa, detail: format(t.atLeast, { value: rule.minValue?.toFixed(2) ?? '' }) };
    case 'min_muet':
      return { title: t.muet, detail: format(t.atLeastBand, { value: rule.minValue ?? '' }) };
    default:
      return { title: subjectName(rule, names, t), detail: format(t.atLeastGrade, { grade: rule.minGrade ?? '' }) };
  }
}

function describeGroup(rules: RequirementRuleDto[], names: ReadonlyMap<string, string>, t: Texts): RequirementItem {
  if (rules.length === 1) return describeSingle(rules[0]!, names, t);
  const grades = new Set(rules.map((r) => r.minGrade));
  const detail =
    grades.size === 1
      ? format(t.sameGrade, { subjects: joinOr(rules.map((r) => subjectName(r, names, t)), t), grade: rules[0]!.minGrade ?? '' })
      : joinOr(rules.map((r) => format(t.subjectGrade, { subject: subjectName(r, names, t), grade: r.minGrade ?? '' })), t);
  return { title: t.oneOf, detail };
}

/** Turns stored rules into short sentences a student can read: one item per group, groups in order. */
export function describeRequirement(requirement: PublishedRequirement, subjectNames: ReadonlyMap<string, string>, t: Texts): DescribedRequirement {
  const groups = new Map<number, RequirementRuleDto[]>();
  for (const rule of requirement.rules) groups.set(rule.groupNo, [...(groups.get(rule.groupNo) ?? []), rule]);
  const ordered = [...groups.entries()].sort(([a], [b]) => a - b).map(([, rules]) => rules);

  const routes: Record<string, string> = t.routes;
  const quotes = requirement.rules.map((r) => r.evidenceQuote ?? '').filter(Boolean);
  return {
    entryRoute: routes[requirement.entryRoute] ?? requirement.entryRoute,
    items: ordered.map((rules) => describeGroup(rules, subjectNames, t)),
    isSample: quotes.some((q) => q.startsWith(SAMPLE_MARKER)),
    quotes: [...new Set(quotes.map((q) => q.replace(SAMPLE_MARKER, '').trim()))],
  };
}
