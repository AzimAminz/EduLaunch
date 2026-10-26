import { format, type Dictionary } from '../i18n/locale';

type Texts = Dictionary['eligibility'];

export interface CheckedRule {
  type: 'min_grade' | 'key_subject' | 'min_credits' | 'min_cgpa' | 'min_muet';
  subjectId: string | null;
  required: string | number | null;
  actual: string | number | null;
  passed: boolean;
}

const number = (value: string | number | null, digits: number) => (typeof value === 'number' ? value.toFixed(digits) : String(value ?? ''));

/** One checked rule as a sentence in the reader's language: "Matematik: perlu B, anda C+". */
export function explainRule(rule: CheckedRule, subjectNames: ReadonlyMap<string, string>, t: Texts): string {
  const missing = rule.actual === null;
  switch (rule.type) {
    case 'min_credits':
      return format(t.credits, { required: rule.required ?? '', actual: rule.actual ?? 0 });
    case 'min_cgpa':
      return format(missing ? t.cgpaMissing : t.cgpa, { required: number(rule.required, 2), actual: number(rule.actual, 2) });
    case 'min_muet':
      return format(missing ? t.muetMissing : t.muet, { required: number(rule.required, 1), actual: number(rule.actual, 1) });
    default: {
      const subject = (rule.subjectId && subjectNames.get(rule.subjectId)) || t.otherSubject;
      return format(missing ? t.gradeMissing : t.grade, { subject, required: rule.required ?? '', actual: rule.actual ?? '' });
    }
  }
}
