import { Module } from '@nestjs/common';
import { RequirementRepository } from './domain/requirement.repository.js';
import { DrizzleRequirementRepository } from './infrastructure/drizzle-requirement.repository.js';
import {
  CreateRequirementDraft,
  DiscardRequirementDraft,
  EditRequirementDraft,
  GetPublishedRequirements,
  ReviewRequirement,
} from './application/requirement-workflow.use-cases.js';
import { RequirementsController } from './presentation/requirements.controller.js';

@Module({
  controllers: [RequirementsController],
  providers: [{ provide: RequirementRepository, useClass: DrizzleRequirementRepository }, CreateRequirementDraft, ReviewRequirement, GetPublishedRequirements, EditRequirementDraft, DiscardRequirementDraft],
})
export class RequirementsModule {}
