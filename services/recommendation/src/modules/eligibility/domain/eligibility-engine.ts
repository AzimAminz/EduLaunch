import type { PublishedRequirement } from '@edulaunch/contracts';
import { RuleFactory, type EligibilityRule, type RuleContext, type RuleOutcome } from './rules.js';

export type Eligibility = 'eligible' | 'almost' | 'not_yet';

export interface EligibilityResult {
  status: Eligibility;
  passedReasons: string[];
  missing: string[];
}

/** Rules in one group are alternatives: the group passes if any rule passes. */
class RuleGroup {
  constructor(private readonly rules: EligibilityRule[]) {}

  evaluate(ctx: RuleContext): RuleOutcome {
    const outcomes = this.rules.map((r) => r.evaluate(ctx));
    const pass = outcomes.find((o) => o.passed);
    if (pass) return pass;
    const closest = outcomes.reduce((a, b) => (b.gap < a.gap ? b : a));
    const reason = outcomes.length > 1 ? `One of: ${outcomes.map((o) => o.reason).join(' / ')}` : closest.reason;
    return { passed: false, gap: closest.gap, reason };
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
    const outcomes = [...groups.values()].map((rules) => new RuleGroup(rules).evaluate(ctx));
    const failed = outcomes.filter((o) => !o.passed);

    const status: Eligibility =
      failed.length === 0 ? 'eligible' : failed.length === 1 && failed[0]!.gap <= this.almostGap ? 'almost' : 'not_yet';
    return { status, passedReasons: outcomes.filter((o) => o.passed).map((o) => o.reason), missing: failed.map((o) => o.reason) };
  }
}
