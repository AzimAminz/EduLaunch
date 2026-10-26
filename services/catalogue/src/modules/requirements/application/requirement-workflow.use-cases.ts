import { Inject, Injectable } from '@nestjs/common';
import { DomainError, NotFoundError, type UseCase } from '@edulaunch/ddd';
import { EventBus } from '@edulaunch/nest-kit';
import { hasSubjectGrades, isValidGrade, type PublishedRequirement, type RecordQualification } from '@edulaunch/contracts';
import { randomUUID } from 'node:crypto';
import { Requirement, type RequirementRule } from '../domain/requirement.js';
import { RequirementRepository } from '../domain/requirement.repository.js';

export interface DraftInput {
  programId: string;
  entryRoute: string;
  sourceId: string | null;
  sourceUrl?: string | null;
  rules: Omit<RequirementRule, 'id'>[];
  adminId: string;
}

/** Grade rules must name a known subject and a grade from that subject's scale (SPM A+–G, STPM A–F…). */
async function checkGrades(requirements: RequirementRepository, rules: Omit<RequirementRule, 'id'>[]) {
  const ids = [...new Set(rules.map((r) => r.subjectId).filter((id): id is string => !!id))];
  const known = await requirements.subjectQualifications(ids);
  for (const rule of rules) {
    if (!rule.subjectId) continue;
    const qualification = known.get(rule.subjectId) as RecordQualification | undefined;
    if (!qualification) throw new DomainError('invalid_rule', 'Choose subjects from the list');
    if (rule.minGrade && hasSubjectGrades(qualification) && !isValidGrade(qualification, rule.minGrade)) {
      throw new DomainError('invalid_rule', `${rule.minGrade} is not a grade for this subject`);
    }
  }
}

/**
 * Starts a draft for a programme and route. When a version is already published, the draft starts from
 * its rules (the admin changes what changed). Only one open draft per programme and route at a time.
 */
@Injectable()
export class CreateRequirementDraft implements UseCase<DraftInput, { id: string; versionNo: number }> {
  constructor(private readonly requirements: RequirementRepository) {}

  async execute(input: DraftInput) {
    if (!(await this.requirements.programExists(input.programId))) throw new NotFoundError('Programme', input.programId);
    const open = await this.requirements.findOpen(input.programId, input.entryRoute);
    if (open) throw new DomainError('draft_exists', `A draft for this route already exists (${open.id})`);
    await checkGrades(this.requirements, input.rules);

    const versionNo = await this.requirements.nextVersionNo(input.programId, input.entryRoute);
    const published = input.rules.length === 0 ? await this.requirements.findLatestPublished(input.programId, input.entryRoute) : null;
    const req = published
      ? Requirement.nextVersion(randomUUID(), published, versionNo, input.adminId, randomUUID)
      : Requirement.draft(randomUUID(), {
          programId: input.programId,
          entryRoute: input.entryRoute,
          versionNo,
          sourceId: input.sourceId,
          sourceUrl: input.sourceUrl ?? null,
          preparedBy: input.adminId,
          rules: input.rules.map((r) => ({ ...r, id: randomUUID() })),
        });
    await this.requirements.save(req);
    return { id: req.id, versionNo };
  }
}

export interface EditDraftInput {
  id: string;
  adminId: string;
  sourceUrl: string | null;
  rules: Omit<RequirementRule, 'id'>[];
}

@Injectable()
export class EditRequirementDraft implements UseCase<EditDraftInput, { status: string }> {
  constructor(private readonly requirements: RequirementRepository) {}

  async execute(input: EditDraftInput) {
    const req = await this.requirements.findById(input.id);
    if (!req) throw new NotFoundError('Requirement', input.id);
    await checkGrades(this.requirements, input.rules);
    req.edit(input.adminId, { sourceUrl: input.sourceUrl, rules: input.rules.map((r) => ({ ...r, id: randomUUID() })) });
    await this.requirements.save(req);
    return { status: req.status };
  }
}

@Injectable()
export class DiscardRequirementDraft implements UseCase<{ id: string; adminId: string }, void> {
  constructor(private readonly requirements: RequirementRepository) {}

  async execute({ id, adminId }: { id: string; adminId: string }) {
    const req = await this.requirements.findById(id);
    if (!req) throw new NotFoundError('Requirement', id);
    req.assertDiscardable(adminId);
    await this.requirements.delete(id);
  }
}

export type ReviewAction = { action: 'submit' } | { action: 'approve' } | { action: 'return'; reason: string };

/** One entry point for the review workflow so the rules stay in the aggregate. */
@Injectable()
export class ReviewRequirement implements UseCase<{ id: string; adminId: string } & ReviewAction, { status: string }> {
  constructor(
    private readonly requirements: RequirementRepository,
    @Inject(EventBus) private readonly events: EventBus,
  ) {}

  async execute(input: { id: string; adminId: string } & ReviewAction) {
    const req = await this.requirements.findById(input.id);
    if (!req) throw new NotFoundError('Requirement', input.id);

    if (input.action === 'submit') req.submitForReview(input.adminId);
    else if (input.action === 'approve') req.approve(input.adminId);
    else req.returnToPreparer(input.adminId, input.reason);

    await this.requirements.save(req);
    await this.events.publish(req.pullEvents());
    return { status: req.status };
  }
}

@Injectable()
export class GetPublishedRequirements implements UseCase<{ programIds: string[] }, PublishedRequirement[]> {
  constructor(private readonly requirements: RequirementRepository) {}

  async execute({ programIds }: { programIds: string[] }) {
    const found = await this.requirements.findPublished(programIds);
    return found.map((r) => r.toPublishedDto());
  }
}
