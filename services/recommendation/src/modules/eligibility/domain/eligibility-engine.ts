import type { PublishedRequirement } from '@edulaunch/contracts';
import { RuleFactory, type EligibilityRule, type RuleContext, type RuleDetail, type RuleOutcome } from './rules.js';

export type Eligibility = 'eligible' | 'almost' | 'not_yet';

/** One requirement group: passes when any of its rules (alternatives) passes. */
export interface GroupResult {
  passed: boolean;
  rules: RuleDetail[];
}

export interface EligibilityResult {
  status: Eligibility;
  passedReasons: string[];
  missing: string[];
  groups: GroupResult[];
}

/** Rules in one group are alternatives: the group passes if any rule passes. */
class RuleGroup {
  constructor(private readonly rules: EligibilityRule[]) {}

  evaluate(ctx: RuleContext): RuleOutcome & { details: RuleDetail[] } {
    const outcomes = this.rules.map((r) => r.evaluate(ctx));
    const details = outcomes.map((o) => o.detail);
    const pass = outcomes.find((o) => o.passed);
    if (pass) return { ...pass, details };
    const closest = outcomes.reduce((a, b) => (b.gap < a.gap ? b : a));
    const reason = outcomes.length > 1 ? `One of: ${outcomes.map((o) => o.reason).join(' / ')}` : closest.reason;
    return { passed: false, gap: closest.gap, reason, detail: closest.detail, details };
  }
}

/**
 * Checks a student against a programme's published requirement.
 * "Almost" = exactly one group fails, and it is at most `almostGap` away (one grade step by default).
 */
export class EligibilityEngine {
  constructor(private readonly almostGap = 1) {}

  check(requirement: PublishedRequirement, ctx: RuleContext): EligibilityResult {
    const groups = new Map<number, EligibilityRule[]>();
    for (const dto of requirement.rules) {
      groups.set(dto.groupNo, [...(groups.get(dto.groupNo) ?? []), RuleFactory.create(dto)]);
    }
    // Groups in the order of their number, as the requirement lists them.
    const outcomes = [...groups.entries()].sort(([a], [b]) => a - b).map(([, rules]) => new RuleGroup(rules).evaluate(ctx));
    const failed = outcomes.filter((o) => !o.passed);

    const status: Eligibility =
      failed.length === 0 ? 'eligible' : failed.length === 1 && failed[0]!.gap <= this.almostGap ? 'almost' : 'not_yet';
    return {
      status,
      passedReasons: outcomes.filter((o) => o.passed).map((o) => o.reason),
      missing: failed.map((o) => o.reason),
      groups: outcomes.map((o) => ({ passed: o.passed, rules: o.details })),
    };
  }
}
