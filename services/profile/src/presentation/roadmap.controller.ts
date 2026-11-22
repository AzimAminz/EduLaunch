import { Body, Controller, Get, Inject, Put } from '@nestjs/common';
import { CurrentCaller, DRIZZLE, Roles, ZodPipe, type Caller, type Database } from '@edulaunch/nest-kit';
import { asc, eq } from 'drizzle-orm';
import { z } from 'zod';
import * as schema from '../infrastructure/db/schema.js';
import { GetOrCreateMe } from '../modules/students/application/student.use-cases.js';

const { roadmapSteps } = schema;

/**
 * A step of the student's plan, in order: the route after their current level (e.g. "diploma"), the programme they
 * aim for, the career it leads to, or a note. Programme and career names come from the catalogue (ePanduan); the
 * label keeps what the student saw, so the plan still reads if the catalogue changes.
 */
const Step = z.discriminatedUnion('type', [
  z.object({ type: z.literal('route'), label: z.string().trim().min(1).max(60) }),
  z.object({ type: z.literal('programme'), programId: z.uuid(), label: z.string().trim().min(1).max(200) }),
  z.object({ type: z.literal('career'), label: z.string().trim().min(1).max(120) }),
  z.object({ type: z.literal('note'), label: z.string().trim().min(1).max(200) }),
]);
const PlanBody = z.object({ steps: z.array(Step).max(8) });

/** The student's own study and career plan ("Roadmap saya"). */
@Roles('student')
@Controller('me/roadmap')
export class RoadmapController {
  constructor(
    private readonly me: GetOrCreateMe,
    @Inject(DRIZZLE) private readonly db: Database<typeof schema>,
  ) {}

  @Get()
  async get(@CurrentCaller() caller: Caller) {
    const { studentId } = await this.me.execute(caller);
    const rows = await this.db.select().from(roadmapSteps).where(eq(roadmapSteps.studentId, studentId)).orderBy(asc(roadmapSteps.stepOrder));
    return { steps: rows.map((r) => ({ type: r.stepType, programId: r.programId, label: r.label })) };
  }

  /** Replaces the whole plan (an empty list clears it). */
  @Put()
  async save(@CurrentCaller() caller: Caller, @Body(new ZodPipe(PlanBody)) body: z.infer<typeof PlanBody>) {
    const { studentId } = await this.me.execute(caller);
    await this.db.transaction(async (tx) => {
      await tx.delete(roadmapSteps).where(eq(roadmapSteps.studentId, studentId));
      if (body.steps.length)
        await tx.insert(roadmapSteps).values(
          body.steps.map((s, i) => ({ studentId, stepOrder: i, stepType: s.type, programId: s.type === 'programme' ? s.programId : null, careerId: null, label: s.label })),
        );
    });
    return { steps: body.steps };
  }
}
