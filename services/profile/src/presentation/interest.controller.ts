import { Body, Controller, Delete, Get, HttpCode, Post, Put } from '@nestjs/common';
import { CurrentCaller, Roles, ZodPipe, type Caller } from '@edulaunch/nest-kit';
import { z } from 'zod';
import { InterestTestService } from '../modules/interests/application/interest-test.service.js';
import { ANSWER_MAX, ANSWER_MIN } from '../modules/interests/domain/mini-ip.js';

const AnswersBody = z.object({
  answers: z.array(z.object({ questionId: z.uuid(), answer: z.number().int().min(ANSWER_MIN).max(ANSWER_MAX) })).max(60),
});

const ProgressBody = z.object({ current: z.number().int().min(0).max(59), flags: z.array(z.uuid()).max(60) });

/** The interest test, for the signed-in student. */
@Controller('me/interest-test')
export class InterestController {
  constructor(private readonly test: InterestTestService) {}

  @Roles('student')
  @Get()
  get(@CurrentCaller() caller: Caller) {
    return this.test.get(caller);
  }

  @Roles('student')
  @Put('answers')
  save(@CurrentCaller() caller: Caller, @Body(new ZodPipe(AnswersBody)) body: z.infer<typeof AnswersBody>) {
    return this.test.saveAnswers(caller, body.answers);
  }

  @Roles('student')
  @Put('progress')
  progress(@CurrentCaller() caller: Caller, @Body(new ZodPipe(ProgressBody)) body: z.infer<typeof ProgressBody>) {
    return this.test.saveProgress(caller, body);
  }

  @Roles('student')
  @Post('submit')
  submit(@CurrentCaller() caller: Caller) {
    return this.test.submit(caller);
  }

  @Roles('student')
  @Delete('answers')
  @HttpCode(204)
  async restart(@CurrentCaller() caller: Caller) {
    await this.test.restart(caller);
  }
}
