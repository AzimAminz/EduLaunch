import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { CurrentCaller, Public, Roles, ZodPipe, type Caller } from '@edulaunch/nest-kit';
import { RuleType } from '@edulaunch/contracts';
import { z } from 'zod';
import { CreateRequirementDraft, GetPublishedRequirements, ReviewRequirement } from '../application/requirement-workflow.use-cases.js';

const DraftBody = z.object({
  programId: z.uuid(),
  entryRoute: z.string().min(2).max(40),
  sourceId: z.uuid().nullable().default(null),
  rules: z
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
    .min(1),
});

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
    return this.review.execute({ id, adminId: caller.userId, ...body });
  }
}
