import type { RequirementRuleDto, StudentSnapshot } from '@edulaunch/contracts';
import { Grade } from './grade.js';

export interface RuleContext {
  snapshot: StudentSnapshot;
  subjectNames: ReadonlyMap<string, string>;
}

/**
 * What was checked, as data, so the web app can explain it in the reader's language
 * ("Mathematics: B needed, you have C+"). `actual` is null when the student has not entered it.
 */
export interface RuleDetail {
  type: RequirementRuleDto['ruleType'];
  subjectId: string | null;
  required: string | number | null;
  actual: string | number | null;
  passed: boolean;
}

export interface RuleOutcome {
  passed: boolean;
  /** Distance to passing, in grade steps (or tenths for CGPA/MUET). Infinity when nothing to compare. */
  gap: number;
  /** Plain-language reason (English), kept for the recommendation list until it moves to `detail`. */
  reason: string;
  detail: RuleDetail;
}

/** Template method: every rule answers the same question in its own way. */
export abstract class EligibilityRule {
  constructor(protected readonly dto: RequirementRuleDto) {}

  abstract evaluate(ctx: RuleContext): RuleOutcome;

  protected subjectName(ctx: RuleContext): string {
    return (this.dto.subjectId && ctx.subjectNames.get(this.dto.subjectId)) ?? 'the subject';
  }

  protected detail(required: string | number | null, actual: string | number | null, passed: boolean): RuleDetail {
    return { type: this.dto.ruleType, subjectId: this.dto.subjectId, required, actual, passed };
  }
}

export class MinGradeRule extends EligibilityRule {
  evaluate(ctx: RuleContext): RuleOutcome {
    const name = this.subjectName(ctx);
    const taken = ctx.snapshot.grades.find((g) => g.subjectId === this.dto.subjectId);
    // A subject belongs to one exam, so its grade and the minimum use that exam's scale (SPM, STPM…).
    const scale = taken?.scale ?? ctx.snapshot.gradeScale;
    const minimum = Grade.of(scale, this.dto.minGrade!);
    if (!taken) return { passed: false, gap: Infinity, reason: `${name} ${minimum.letter} needed — not taken`, detail: this.detail(minimum.letter, null, false) };
    const grade = Grade.of(scale, taken.grade);
    return grade.meets(minimum)
      ? { passed: true, gap: 0, reason: `${name} ${grade.letter} — minimum ${minimum.letter}`, detail: this.detail(minimum.letter, grade.letter, true) }
      : { passed: false, gap: grade.stepsShortOf(minimum), reason: `${name} needs ${minimum.letter} (you have ${grade.letter})`, detail: this.detail(minimum.letter, grade.letter, false) };
  }
}

/** For example "credit (C) in at least 5 subjects". */
export class MinCreditsRule extends EligibilityRule {
  evaluate(ctx: RuleContext): RuleOutcome {
    const needed = this.dto.minValue ?? 0;
    const scale = ctx.snapshot.gradeScale;
    const credit = Grade.of(scale, this.dto.minGrade ?? 'C');
    // Credits count the main (SPM or school) grades only, not STPM or A-Level.
    const main = ctx.snapshot.grades.filter((g) => (g.scale ?? scale) === scale);
    const count = main.filter((g) => Grade.of(scale, g.grade).meets(credit)).length;
    return count >= needed
      ? { passed: true, gap: 0, reason: `${count} credits — minimum ${needed}`, detail: this.detail(needed, count, true) }
      : { passed: false, gap: needed - count, reason: `Needs ${needed} credits (you have ${count})`, detail: this.detail(needed, count, false) };
  }
}

abstract class MinNumberRule extends EligibilityRule {
  protected abstract label: string;
  protected abstract value(s: StudentSnapshot): number | null;

  evaluate(ctx: RuleContext): RuleOutcome {
    const needed = this.dto.minValue ?? 0;
    const actual = this.value(ctx.snapshot);
    if (actual === null) return { passed: false, gap: Infinity, reason: `${this.label} ${needed} needed — not entered`, detail: this.detail(needed, null, false) };
    return actual >= needed
      ? { passed: true, gap: 0, reason: `${this.label} ${actual} — minimum ${needed}`, detail: this.detail(needed, actual, true) }
      : { passed: false, gap: Math.round((needed - actual) * 10), reason: `${this.label} needs ${needed} (you have ${actual})`, detail: this.detail(needed, actual, false) };
  }
}

export class MinCgpaRule extends MinNumberRule {
  protected label = 'CGPA';
  protected value(s: StudentSnapshot) {
    return s.cgpa;
  }
}

export class MinMuetRule extends MinNumberRule {
  protected label = 'MUET band';
  protected value(s: StudentSnapshot) {
    return s.muetBand;
  }
}

/** Factory: maps the stored rule type to its class (open for new rule types). */
export class RuleFactory {
  private static readonly registry: Record<RequirementRuleDto['ruleType'], new (dto: RequirementRuleDto) => EligibilityRule> = {
    min_grade: MinGradeRule,
    key_subject: MinGradeRule,
    min_credits: MinCreditsRule,
    min_cgpa: MinCgpaRule,
    min_muet: MinMuetRule,
  };

  static create(dto: RequirementRuleDto): EligibilityRule {
    return new RuleFactory.registry[dto.ruleType](dto);
  }
}
