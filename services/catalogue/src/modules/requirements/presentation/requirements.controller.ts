import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Post, Put, Query } from '@nestjs/common';
import { CurrentCaller, Public, Roles, ZodPipe, type Caller } from '@edulaunch/nest-kit';
import { EntryRoutes, RuleType } from '@edulaunch/contracts';
import { z } from 'zod';
import {
  CreateRequirementDraft,
  DiscardRequirementDraft,
  EditRequirementDraft,
  GetPublishedRequirements,
  ReviewRequirement,
} from '../application/requirement-workflow.use-cases.js';

const Rules = z
  .array(
    z.object({
      groupNo: z.number().int().min(1),
      ruleType: RuleType,
      subjectId: z.uuid().nullable().default(null),
      minGrade: z.string().max(3).nullable().default(null),
      minValue: z.number().nullable().default(null),
      evidenceQuote: z.string().min(5).max(1000),
    }),
  )
  .max(40);

/** With no rules, the draft starts from the published version (if any). */
const DraftBody = z.object({
  programId: z.uuid(),
  entryRoute: z.enum(EntryRoutes),
  sourceId: z.uuid().nullable().default(null),
  sourceUrl: z.string().max(600).nullable().default(null),
  rules: Rules.default([]),
});

const EditBody = z.object({ sourceUrl: z.string().max(600).nullable().default(null), rules: Rules });

const ReviewBody = z.discriminatedUnion('action', [
  z.object({ action: z.literal('submit') }),
  z.object({ action: z.literal('approve') }),
  z.object({ action: z.literal('return'), reason: z.string().min(5).max(1000) }),
]);

const PublishedQuery = z.object({ programIds: z.string().transform((s) => s.split(',').filter(Boolean)).pipe(z.array(z.uuid()).max(200)) });

@Controller('requirements')
export class RequirementsController {
  constructor(
    private readonly createDraft: CreateRequirementDraft,
    private readonly review: ReviewRequirement,
    private readonly published: GetPublishedRequirements,
    private readonly edit: EditRequirementDraft,
    private readonly discard: DiscardRequirementDraft,
  ) {}

  /** Used by the recommendation service and by programme pages. */
  @Public()
  @Get('published')
  getPublished(@Query(new ZodPipe(PublishedQuery)) q: z.infer<typeof PublishedQuery>) {
    return this.published.execute({ programIds: q.programIds });
  }

  @Roles('admin')
  @Post()
  draft(@Body(new ZodPipe(DraftBody)) body: z.infer<typeof DraftBody>, @CurrentCaller() caller: Caller) {
    return this.createDraft.execute({ ...body, adminId: caller.userId });
  }

  @Roles('admin')
  @Post(':id/review')
  reviewDraft(@Param('id', ParseUUIDPipe) id: string, @Body(new ZodPipe(ReviewBody)) body: z.infer<typeof ReviewBody>, @CurrentCaller() caller: Caller) {
    return this.review.execute({ id, adminId: caller.userId, superAdmin: caller.superAdmin, ...body });
  }

  @Roles('admin')
  @Put(':id')
  editDraft(@Param('id', ParseUUIDPipe) id: string, @Body(new ZodPipe(EditBody)) body: z.infer<typeof EditBody>, @CurrentCaller() caller: Caller) {
    return this.edit.execute({ id, adminId: caller.userId, ...body });
  }

  @Roles('admin')
  @Delete(':id')
  @HttpCode(204)
  discardDraft(@Param('id', ParseUUIDPipe) id: string, @CurrentCaller() caller: Caller) {
    return this.discard.execute({ id, adminId: caller.userId });
  }
}
