import { AggregateRoot, DomainError, createEvent } from '@edulaunch/ddd';
import { Events, type RequirementRuleDto, type RuleType } from '@edulaunch/contracts';

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
  preparedBy: string;
  approvedBy: string | null;
  status: ReviewStatus;
  returnReason: string | null;
  rules: RequirementRule[];
}

/**
 * Entry requirements for one programme and entry route, versioned.
 * Workflow: draft → in_review → published (or returned → draft). A different admin must approve.
 */
export class Requirement extends AggregateRoot<string, RequirementProps> {
  static draft(id: string, input: { programId: string; entryRoute: string; versionNo: number; sourceId: string | null; preparedBy: string; rules: RequirementRule[] }): Requirement {
    const req = new Requirement(id, { ...input, approvedBy: null, status: 'draft', returnReason: null, rules: [] });
    req.replaceRules(input.rules);
    return req;
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

  replaceRules(rules: RequirementRule[]): void {
    this.assertEditable();
    for (const rule of rules) {
      if (!rule.evidenceQuote?.trim()) throw new DomainError('missing_evidence', 'Every rule needs the sentence from the official source');
      if ((rule.ruleType === 'min_grade' || rule.ruleType === 'key_subject') && (!rule.subjectId || !rule.minGrade)) {
        throw new DomainError('invalid_rule', 'A grade rule needs a subject and a minimum grade');
      }
      if ((rule.ruleType === 'min_cgpa' || rule.ruleType === 'min_muet' || rule.ruleType === 'min_credits') && rule.minValue === null) {
        throw new DomainError('invalid_rule', `${rule.ruleType} needs a minimum value`);
      }
    }
    this.props.rules = rules;
  }

  submitForReview(by: string): void {
    this.assertEditable();
    if (by !== this.props.preparedBy) throw new DomainError('forbidden', 'Only the admin who prepared the draft can submit it');
    if (this.props.rules.length === 0) throw new DomainError('invalid_rule', 'Add at least one rule before submitting');
    this.props.status = 'in_review';
    this.props.returnReason = null;
  }

  returnToPreparer(by: string, reason: string): void {
    this.assertInReview(by);
    if (reason.trim().length < 5) throw new DomainError('reason_required', 'Explain what needs to change');
    this.props.status = 'returned';
    this.props.returnReason = reason.trim();
  }

  approve(by: string): void {
    this.assertInReview(by);
    this.props.status = 'published';
    this.props.approvedBy = by;
    this.record(createEvent(Events.RequirementPublished, { programId: this.props.programId, requirementId: this.id, versionNo: this.props.versionNo }));
  }

  toPublishedDto(): { requirementId: string; programId: string; entryRoute: string; versionNo: number; rules: RequirementRuleDto[] } {
    return { requirementId: this.id, programId: this.props.programId, entryRoute: this.props.entryRoute, versionNo: this.props.versionNo, rules: [...this.props.rules] };
  }

  private assertEditable(): void {
    if (this.props.status !== 'draft' && this.props.status !== 'returned') {
      throw new DomainError('conflict', `A ${this.props.status} requirement cannot be edited; create a new version`);
    }
  }

  private assertInReview(by: string): void {
    if (this.props.status !== 'in_review') throw new DomainError('conflict', 'This draft is not waiting for review');
    if (by === this.props.preparedBy) throw new DomainError('forbidden', 'Another admin must review this draft');
  }
}
