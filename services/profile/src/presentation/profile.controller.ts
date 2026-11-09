import { Body, Controller, Delete, Get, HttpCode, Inject, Param, ParseUUIDPipe, Patch, Post, Put, Query, ServiceUnavailableException } from '@nestjs/common';
import { CurrentCaller, DRIZZLE, EventBus, Public, Roles, ZodPipe, type Caller, type Database } from '@edulaunch/nest-kit';
import { createEvent } from '@edulaunch/ddd';
import { Events } from '@edulaunch/contracts';
import { env } from '../config.js';
import { and, eq, sql } from 'drizzle-orm';
import * as schema from '../infrastructure/db/schema.js';
import { HigherQualifications, MAX_SEMESTERS, MAX_SUBJECTS_PER_RECORD, MatriculationStreams, RecordQualifications, StudentSnapshot } from '@edulaunch/contracts';
import { z } from 'zod';
import { GetOrCreateMe, GetStudentSnapshot, PreviewLevelChange, UpdateEducationLevel } from '../modules/students/application/student.use-cases.js';
import { AcademicRecordService } from '../modules/academic-records/application/academic-record.use-cases.js';

/** Personal details the student sets in Settings. A date of birth must be a real past date (age 8 to 100). */
const DetailsBody = z.object({
  schoolName: z.string().trim().max(160).nullable().optional(),
  dateOfBirth: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .refine((d) => {
      const date = new Date(`${d}T00:00:00Z`);
      const age = (Date.now() - date.getTime()) / (365.25 * 24 * 3600 * 1000);
      return !Number.isNaN(date.getTime()) && age >= 8 && age <= 100;
    }, 'Not a plausible date of birth')
    .nullable()
    .optional(),
});

const NotificationsBody = z.object({ requirementChanges: z.boolean() });

const LevelBody = z.object({
  level: StudentSnapshot.shape.educationLevel,
  formYear: z.number().int().nullable().default(null),
  higherQualification: z.enum(HigherQualifications).nullable().default(null),
});
const StartRecordBody = z.object({
  qualification: z.enum(['spm', 'school', 'stpm']),
  kind: z.enum(['actual', 'target', 'school']),
  examYear: z.number().int().min(2000).max(2100).nullable().default(null),
});
const GradeBody = z.object({ grade: z.string().min(1).max(3) });
const RecordKey = z.object({
  qualification: z.enum(RecordQualifications),
  kind: z.enum(['actual', 'target', 'school']),
  examYear: z.coerce.number().int().min(2000).max(2100).nullable().default(null),
});
const SaveRecordBody = RecordKey.extend({
  examYear: z.number().int().min(2000).max(2100).nullable().default(null),
  formLevel: z.number().int().min(1).max(5).nullable().optional(),
  subjects: z
    .array(z.object({ subjectId: z.uuid(), grade: z.string().min(1).max(3), customName: z.string().trim().min(1).max(80).nullable().default(null) }))
    .max(MAX_SUBJECTS_PER_RECORD),
  cgpa: z.number().min(0).max(4).nullable().default(null),
  muetBand: z.number().nullable().default(null),
  fieldId: z.uuid().nullable().default(null),
  customFieldName: z.string().trim().min(1).max(80).nullable().default(null),
  programmeName: z.string().max(120).nullable().default(null),
  qualificationLevel: z.number().int().nullable().default(null),
  stream: z.enum(MatriculationStreams).nullable().default(null),
  semesterGpas: z.array(z.number().min(0).max(4).nullable()).max(MAX_SEMESTERS).nullable().default(null),
});

@Controller()
export class ProfileController {
  constructor(
    private readonly me: GetOrCreateMe,
    private readonly updateLevel: UpdateEducationLevel,
    private readonly previewLevelChange: PreviewLevelChange,
    private readonly snapshot: GetStudentSnapshot,
    private readonly records: AcademicRecordService,
    @Inject(DRIZZLE) private readonly db: Database<typeof schema>,
    @Inject(EventBus) private readonly events: EventBus,
  ) {}

  @Roles('student')
  @Get('me')
  getMe(@CurrentCaller() caller: Caller) {
    return this.me.execute(caller);
  }

  @Roles('student')
  @Patch('me/education-level')
  setLevel(@CurrentCaller() caller: Caller, @Body(new ZodPipe(LevelBody)) body: z.infer<typeof LevelBody>) {
    return this.updateLevel.execute({ caller, ...body });
  }

  /** What a level change would remove from the student's saved records, shown before they confirm. */
  @Roles('student')
  @Post('me/education-level/preview')
  previewLevel(@CurrentCaller() caller: Caller, @Body(new ZodPipe(LevelBody)) body: z.infer<typeof LevelBody>) {
    return this.previewLevelChange.execute({ caller, ...body });
  }

  /** The results form for one kind of record, e.g. ?qualification=spm&kind=target. `record` is null until first saved. */
  @Roles('student')
  @Get('me/records/current')
  async currentRecord(@CurrentCaller() caller: Caller, @Query(new ZodPipe(RecordKey)) query: z.infer<typeof RecordKey>) {
    // Wrapped, because Nest sends an empty body for a bare null.
    return { record: await this.records.current(caller, query) };
  }

  /** The caller's academic history: every saved record, newest exam year first. */
  @Roles('student')
  @Get('me/records')
  listRecords(@CurrentCaller() caller: Caller) {
    return this.records.list(caller);
  }

  @Roles('student')
  @Put('me/records/current')
  saveCurrentRecord(@CurrentCaller() caller: Caller, @Body(new ZodPipe(SaveRecordBody)) body: z.infer<typeof SaveRecordBody>) {
    return this.records.saveCurrent(caller, body);
  }

  /** Saves the whole form onto one of the caller's older records, its year included. */
  @Roles('student')
  @Put('me/records/:recordId')
  saveRecord(
    @CurrentCaller() caller: Caller,
    @Param('recordId', ParseUUIDPipe) recordId: string,
    @Body(new ZodPipe(SaveRecordBody.omit({ qualification: true, kind: true }))) body: Omit<z.infer<typeof SaveRecordBody>, 'qualification' | 'kind'>,
  ) {
    return this.records.saveRecord(caller, recordId, body);
  }

  // Declared after "current" so that path is not read as a record id.
  @Roles('student')
  @Get('me/records/:recordId')
  getRecord(@CurrentCaller() caller: Caller, @Param('recordId', ParseUUIDPipe) recordId: string) {
    return this.records.get(caller, recordId);
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

  /** The student's personal details (school, date of birth) and whether a parent has agreed. */
  @Roles('student')
  @Get('me/details')
  async details(@CurrentCaller() caller: Caller) {
    const { studentId } = await this.me.execute(caller);
    const [row] = await this.db
      .select({ schoolName: schema.students.schoolName, dateOfBirth: schema.students.dateOfBirth, parentConsentAt: schema.students.parentConsentAt })
      .from(schema.students)
      .where(eq(schema.students.id, studentId));
    return row ?? { schoolName: null, dateOfBirth: null, parentConsentAt: null };
  }

  @Roles('student')
  @Patch('me/details')
  async updateDetails(@CurrentCaller() caller: Caller, @Body(new ZodPipe(DetailsBody)) body: z.infer<typeof DetailsBody>) {
    const { studentId } = await this.me.execute(caller);
    const set: Partial<typeof schema.students.$inferInsert> = {};
    if (body.schoolName !== undefined) set.schoolName = body.schoolName || null;
    if (body.dateOfBirth !== undefined) set.dateOfBirth = body.dateOfBirth;
    if (Object.keys(set).length) await this.db.update(schema.students).set(set).where(eq(schema.students.id, studentId));
    return this.details(caller);
  }

  /** What the student wants to be told about. */
  @Roles('student')
  @Get('me/notifications')
  async notifications(@CurrentCaller() caller: Caller) {
    const { studentId } = await this.me.execute(caller);
    const [row] = await this.db.select({ prefs: schema.students.notificationPrefs }).from(schema.students).where(eq(schema.students.id, studentId));
    return row?.prefs ?? { requirementChanges: true };
  }

  @Roles('student')
  @Patch('me/notifications')
  async setNotifications(@CurrentCaller() caller: Caller, @Body(new ZodPipe(NotificationsBody)) body: z.infer<typeof NotificationsBody>) {
    const { studentId } = await this.me.execute(caller);
    await this.db.update(schema.students).set({ notificationPrefs: body }).where(eq(schema.students.id, studentId));
    return body;
  }

  /** A student under 18 records that a parent or guardian agreed to their using EduLaunch. */
  @Roles('student')
  @Post('me/parent-consent')
  async parentConsent(@CurrentCaller() caller: Caller) {
    const { studentId } = await this.me.execute(caller);
    await this.db.update(schema.students).set({ parentConsentAt: new Date() }).where(eq(schema.students.id, studentId));
    return this.details(caller);
  }

  /**
   * Deletes the student's account: their profile, results and saved programmes here, the sign-in account in
   * Supabase, and (through the event) what other services keep about them. The web app checks the password first.
   */
  @Roles('student')
  @Delete('me')
  @HttpCode(204)
  async deleteAccount(@CurrentCaller() caller: Caller) {
    if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) throw new ServiceUnavailableException('Account deletion is not set up (SUPABASE_SERVICE_ROLE_KEY)');
    const { studentId } = await this.me.execute(caller);
    // The sign-in account first: if that fails, nothing is lost and the student can try again.
    const res = await fetch(new URL(`/auth/v1/admin/users/${caller.userId}`, env.SUPABASE_URL), {
      method: 'DELETE',
      headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY, authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}` },
    });
    if (!res.ok && res.status !== 404) throw new ServiceUnavailableException(`Could not delete the sign-in account (${res.status})`);
    await this.db.delete(schema.accounts).where(eq(schema.accounts.id, caller.userId));
    await this.events.publish([createEvent(Events.AccountDeleted, { accountId: caller.userId, studentId })]);
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
      // Only students who still want to hear when a saved programme's requirements change.
      .where(and(eq(schema.savedPrograms.programId, programId), sql`coalesce((${schema.students.notificationPrefs} ->> 'requirementChanges')::boolean, true)`));
    return rows.map((r) => r.accountId);
  }
}
