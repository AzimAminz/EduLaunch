import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import { CurrentCaller, Roles, type Caller } from '@edulaunch/nest-kit';
import { CheckEligibility } from '../application/check-eligibility.use-case.js';

@Roles('student')
@Controller('me/eligibility')
export class EligibilityController {
  constructor(private readonly check: CheckEligibility) {}

  /** "Can I enter this programme?", checked against the student's confirmed results and entry route. */
  @Get(':programId')
  programme(@CurrentCaller() caller: Caller, @Param('programId', ParseUUIDPipe) programId: string) {
    return this.check.execute({ caller, programId });
  }
}
