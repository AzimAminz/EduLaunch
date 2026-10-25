import { Body, Controller, Delete, Get, Inject, Param, ParseUUIDPipe, Patch, Post, Put } from '@nestjs/common';
import { CurrentCaller, DRIZZLE, Public, Roles, ZodPipe, type Caller, type Database } from '@edulaunch/nest-kit';
import { and, eq } from 'drizzle-orm';
import * as schema from '../infrastructure/db/schema.js';
import { StudentSnapshot } from '@edulaunch/contracts';
import { z } from 'zod';
import { GetOrCreateMe, GetStudentSnapshot, UpdateEducationLevel } from '../modules/students/application/student.use-cases.js';
import { AcademicRecordService } from '../modules/academic-records/application/academic-record.use-cases.js';

const LevelBody = z.object({ level: StudentSnapshot.shape.educationLevel, formYear: z.number().int().nullable().default(null) });
const StartRecordBody = z.object({
  qualification: z.enum(['spm', 'school', 'stpm']),
  kind: z.enum(['actual', 'target', 'school']),
  examYear: z.number().int().min(2000).max(2100).nullable().default(null),
});
const GradeBody = z.object({ grade: z.string().min(1).max(3) });

@Controller()
export class ProfileController {
  constructor(
    private readonly me: GetOrCreateMe,
    private readonly updateLevel: UpdateEducationLevel,
    private readonly snapshot: GetStudentSnapshot,
    private readonly records: AcademicRecordService,
    @Inject(DRIZZLE) private readonly db: Database<typeof schema>,
  ) {}

  @Roles('student')
  @Get('me')
  getMe(@CurrentCaller() caller: Caller) {
    return this.me.execute(caller);
  }

  @Roles('student')
  @Patch('me/education-level')
  setLevel(@CurrentCaller() caller: Caller, @Body(new ZodPipe(LevelBody)) body: z.infer<typeof LevelBody>) {
    return this.updateLevel.execute({ caller, level: body.level, formYear: body.formYear });
  }

  @Roles('student')
  @Post('me/records')
  startRecord(@CurrentCaller() caller: Caller, @Body(new ZodPipe(StartRecordBody)) body: z.infer<typeof StartRecordBody>) {
    return this.records.start(caller, body);
  }

  @Roles('student')
  @Put('me/records/:recordId/subjects/:subjectId')
  setGrade(
    @CurrentCaller() caller: Caller,
    @Param('recordId', ParseUUIDPipe) recordId: string,
    @Param('subjectId', ParseUUIDPipe) subjectId: string,
    @Body(new ZodPipe(GradeBody)) body: z.infer<typeof GradeBody>,
  ) {
    return this.records.change(caller, recordId, { type: 'set_grade', subjectId, grade: body.grade });
  }

  @Roles('student')
  @Delete('me/records/:recordId/subjects/:subjectId')
  removeSubject(@CurrentCaller() caller: Caller, @Param('recordId', ParseUUIDPipe) recordId: string, @Param('subjectId', ParseUUIDPipe) subjectId: string) {
    return this.records.change(caller, recordId, { type: 'remove_subject', subjectId });
  }

  @Roles('student')
  @Post('me/records/:recordId/confirm')
  confirm(@CurrentCaller() caller: Caller, @Param('recordId', ParseUUIDPipe) recordId: string) {
    return this.records.change(caller, recordId, { type: 'confirm' });
  }

  /** Service-to-service read model (internal token only, not routed by the gateway). */
  @Public()
  @Get('internal/students/:id/snapshot')
  getSnapshot(@Param('id', ParseUUIDPipe) id: string) {
    return this.snapshot.execute({ studentId: id });
  }

  @Roles('student')
  @Get('me/saved-programmes')
  async savedProgrammes(@CurrentCaller() caller: Caller) {
    const { studentId } = await this.me.execute(caller);
    return this.db.select().from(schema.savedPrograms).where(eq(schema.savedPrograms.studentId, studentId));
  }

  @Roles('student')
  @Put('me/saved-programmes/:programId')
  async saveProgramme(@CurrentCaller() caller: Caller, @Param('programId', ParseUUIDPipe) programId: string) {
    const { studentId } = await this.me.execute(caller);
    await this.db.insert(schema.savedPrograms).values({ studentId, programId }).onConflictDoNothing();
    return { saved: true };
  }

  @Roles('student')
  @Delete('me/saved-programmes/:programId')
  async unsaveProgramme(@CurrentCaller() caller: Caller, @Param('programId', ParseUUIDPipe) programId: string) {
    const { studentId } = await this.me.execute(caller);
    await this.db.delete(schema.savedPrograms).where(and(eq(schema.savedPrograms.studentId, studentId), eq(schema.savedPrograms.programId, programId)));
    return { saved: false };
  }

  /** Account IDs of students who saved a programme (used by the engagement service for notifications). */
  @Public()
  @Get('internal/programmes/:programId/savers')
  async savers(@Param('programId', ParseUUIDPipe) programId: string) {
    const rows = await this.db
      .select({ accountId: schema.students.accountId })
      .from(schema.savedPrograms)
      .innerJoin(schema.students, eq(schema.students.id, schema.savedPrograms.studentId))
      .where(eq(schema.savedPrograms.programId, programId));
    return rows.map((r) => r.accountId);
  }
}
