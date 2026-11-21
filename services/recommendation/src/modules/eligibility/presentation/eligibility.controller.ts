import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { CurrentCaller, Roles, ZodPipe, type Caller } from '@edulaunch/nest-kit';
import { z } from 'zod';
import { CheckEligibility } from '../application/check-eligibility.use-case.js';

const TryBody = z.object({
  grades: z.array(z.object({ subjectId: z.uuid(), grade: z.string().min(1).max(3) })).max(30).optional(),
  cgpa: z.number().min(0).max(4).nullable().optional(),
});

@Roles('student')
@Controller('me/eligibility')
export class EligibilityController {
  constructor(private readonly check: CheckEligibility) {}

  /** "Can I enter this programme?", checked against the student's confirmed results and entry route. */
  @Get(':programId')
  programme(@CurrentCaller() caller: Caller, @Param('programId', ParseUUIDPipe) programId: string) {
    return this.check.execute({ caller, programId });
  }

  /** "What if": the same check with grades (and a CGPA) to try instead of the saved ones. Nothing is saved. */
  @Post(':programId/try')
  @HttpCode(200)
  tryOut(@CurrentCaller() caller: Caller, @Param('programId', ParseUUIDPipe) programId: string, @Body(new ZodPipe(TryBody)) body: z.infer<typeof TryBody>) {
    return this.check.execute({ caller, programId, tryOut: body });
  }
}
