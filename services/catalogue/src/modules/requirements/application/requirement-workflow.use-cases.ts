import { Inject, Injectable } from '@nestjs/common';
import { NotFoundError, type UseCase } from '@edulaunch/ddd';
import { EventBus } from '@edulaunch/nest-kit';
import type { PublishedRequirement } from '@edulaunch/contracts';
import { randomUUID } from 'node:crypto';
import { Requirement, type RequirementRule } from '../domain/requirement.js';
import { RequirementRepository } from '../domain/requirement.repository.js';

export interface DraftInput {
  programId: string;
  entryRoute: string;
  sourceId: string | null;
  rules: Omit<RequirementRule, 'id'>[];
  adminId: string;
}

@Injectable()
export class CreateRequirementDraft implements UseCase<DraftInput, { id: string; versionNo: number }> {
  constructor(private readonly requirements: RequirementRepository) {}

  async execute(input: DraftInput) {
    const versionNo = await this.requirements.nextVersionNo(input.programId, input.entryRoute);
    const req = Requirement.draft(randomUUID(), {
      programId: input.programId,
      entryRoute: input.entryRoute,
      versionNo,
      sourceId: input.sourceId,
      preparedBy: input.adminId,
      rules: input.rules.map((r) => ({ ...r, id: randomUUID() })),
    });
    await this.requirements.save(req);
    return { id: req.id, versionNo };
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
