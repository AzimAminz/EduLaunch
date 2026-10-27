import { AggregateRoot, DomainError, createEvent } from '@edulaunch/ddd';
import { Events, isEntryRoute, type RequirementRuleDto, type RuleType } from '@edulaunch/contracts';

export type ReviewStatus = 'draft' | 'in_review' | 'returned' | 'published' | 'archived';

export interface RequirementRule {
  id: string;
  groupNo: number;
  ruleType: RuleType;
  subjectId: string | null;
  minGrade: string | null;
  minValue: number | null;
  evidenceQuote: string | null;
}

interface RequirementProps {
  programId: string;
  entryRoute: string;
  versionNo: number;
  sourceId: string | null;
  /** The official page or document the rules come from; needed before review. */
  sourceUrl: string | null;
  preparedBy: string;
  approvedBy: string | null;
  status: ReviewStatus;
  returnReason: string | null;
  rules: RequirementRule[];
}

const MAX_RULES = 40;

/** Allowed minimum values per rule type: CGPA 0–4, MUET band 1–6, number of credits 1–20. */
const VALUE_RANGES: Partial<Record<RuleType, { min: number; max: number; integer?: boolean }>> = {
  min_cgpa: { min: 0, max: 4 },
  min_muet: { min: 1, max: 6 },
  min_credits: { min: 1, max: 20, integer: true },
};

export interface DraftInput {
  programId: string;
  entryRoute: string;
  versionNo: number;
  sourceId: string | null;
  sourceUrl?: string | null;
  preparedBy: string;
  rules: RequirementRule[];
}

/**
 * Entry requirements for one programme and entry route, versioned.
 * Workflow: draft → in_review → published (or returned → draft). A different admin must approve.
 * Only the admin who prepared a draft edits it; a published version is changed by drafting the next one.
 */
export class Requirement extends AggregateRoot<string, RequirementProps> {
  static draft(id: string, input: DraftInput): Requirement {
    if (!isEntryRoute(input.entryRoute)) throw new DomainError('invalid_rule', `Unknown entry route ${input.entryRoute}`);
    const req = new Requirement(id, { ...input, sourceUrl: null, approvedBy: null, status: 'draft', returnReason: null, rules: [] });
    req.setSource(input.sourceUrl ?? null);
    req.replaceRules(input.rules);
    return req;
  }

  /** The next version of a published requirement, starting from its rules (new rule IDs from `newId`). */
  static nextVersion(id: string, from: Requirement, versionNo: number, preparedBy: string, newId: () => string): Requirement {
    const p = from.props;
    return Requirement.draft(id, {
      programId: p.programId,
      entryRoute: p.entryRoute,
      versionNo,
      sourceId: p.sourceId,
      sourceUrl: p.sourceUrl,
      preparedBy,
      rules: p.rules.map((r) => ({ ...r, id: newId() })),
    });
  }

  static restore(id: string, props: RequirementProps): Requirement {
    return new Requirement(id, props);
  }

  get status(): ReviewStatus {
    return this.props.status;
  }

  get rules(): readonly RequirementRule[] {
    return this.props.rules;
  }

  get programId(): string {
    return this.props.programId;
  }

  get entryRoute(): string {
    return this.props.entryRoute;
  }

  get preparedBy(): string {
    return this.props.preparedBy;
  }

  /** The preparer changes the rules and source of their draft (or a draft returned to them). */
  edit(by: string, input: { rules: RequirementRule[]; sourceUrl: string | null }): void {
    this.assertEditable();
    if (by !== this.props.preparedBy) throw new DomainError('forbidden', 'Only the admin who prepared this draft can edit it');
    this.setSource(input.sourceUrl);
    this.replaceRules(input.rules);
  }

  /** Checks the preparer may throw this draft away (the repository deletes it). Published versions stay. */
  assertDiscardable(by: string): void {
    this.assertEditable();
    if (by !== this.props.preparedBy) throw new DomainError('forbidden', 'Only the admin who prepared this draft can discard it');
  }

  replaceRules(rules: RequirementRule[]): void {
    this.assertEditable();
    if (rules.length > MAX_RULES) throw new DomainError('invalid_rule', `At most ${MAX_RULES} rules per requirement`);
    for (const rule of rules) {
      if (!rule.evidenceQuote?.trim()) throw new DomainError('missing_evidence', 'Every rule needs the sentence from the official source');
      if (!Number.isInteger(rule.groupNo) || rule.groupNo < 1) throw new DomainError('invalid_rule', 'Group numbers start at 1');
      if ((rule.ruleType === 'min_grade' || rule.ruleType === 'key_subject') && (!rule.subjectId || !rule.minGrade)) {
        throw new DomainError('invalid_rule', 'A grade rule needs a subject and a minimum grade');
      }
      const range = VALUE_RANGES[rule.ruleType];
      if (range) {
        const v = rule.minValue;
        if (v === null) throw new DomainError('invalid_rule', `${rule.ruleType} needs a minimum value`);
        if (v < range.min || v > range.max || (range.integer && !Number.isInteger(v))) {
          throw new DomainError('invalid_rule', `${rule.ruleType} must be between ${range.min} and ${range.max}`);
        }
      }
    }
    this.props.rules = rules.map((r) => ({ ...r, evidenceQuote: r.evidenceQuote!.trim() }));
  }

  submitForReview(by: string): void {
    this.assertEditable();
    if (by !== this.props.preparedBy) throw new DomainError('forbidden', 'Only the admin who prepared the draft can submit it');
    if (this.props.rules.length === 0) throw new DomainError('invalid_rule', 'Add at least one rule before submitting');
    if (!this.props.sourceUrl) throw new DomainError('missing_evidence', 'Add the link to the official source before submitting');
    this.props.status = 'in_review';
    this.props.returnReason = null;
  }

  returnToPreparer(by: string, reason: string): void {
    this.assertInReview(by);
    if (reason.trim().length < 5) throw new DomainError('reason_required', 'Explain what needs to change');
    this.props.status = 'returned';
    this.props.returnReason = reason.trim();
  }

  /** `ownWork`: a super admin may approve what they prepared themselves; everyone else needs another admin. */
  approve(by: string, ownWork: 'allowed' | 'forbidden' = 'forbidden'): void {
    this.assertInReview(by, ownWork);
    this.props.status = 'published';
    this.props.approvedBy = by;
    this.record(createEvent(Events.RequirementPublished, { programId: this.props.programId, requirementId: this.id, versionNo: this.props.versionNo }));
  }

  toPublishedDto(): { requirementId: string; programId: string; entryRoute: string; versionNo: number; rules: RequirementRuleDto[] } {
    return { requirementId: this.id, programId: this.props.programId, entryRoute: this.props.entryRoute, versionNo: this.props.versionNo, rules: [...this.props.rules] };
  }

  private setSource(url: string | null): void {
    const value = url?.trim() || null;
    if (value && (!/^https?:\/\/\S+$/.test(value) || value.length > 500)) throw new DomainError('invalid_source', 'The source must be a web link (https://…)');
    this.props.sourceUrl = value;
  }

  private assertEditable(): void {
    if (this.props.status !== 'draft' && this.props.status !== 'returned') {
      throw new DomainError('conflict', `A ${this.props.status} requirement cannot be edited; create a new version`);
    }
  }

  private assertInReview(by: string, ownWork: 'allowed' | 'forbidden' = 'forbidden'): void {
    if (this.props.status !== 'in_review') throw new DomainError('conflict', 'This draft is not waiting for review');
    if (ownWork === 'forbidden' && by === this.props.preparedBy) throw new DomainError('forbidden', 'Another admin must review this draft');
  }
}
