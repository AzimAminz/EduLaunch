import { sql } from 'drizzle-orm';
import { boolean, date, integer, jsonb, numeric, pgSchema, primaryKey, smallint, text, timestamp, uuid } from 'drizzle-orm/pg-core';

/**
 * Tables owned by the profile service. `account.id` equals the Supabase Auth user id.
 * Programme, subject, activity and career IDs belong to the catalogue service (no foreign keys).
 */
export const profile = pgSchema('profile');

const id = () => uuid('id').primaryKey().default(sql`gen_random_uuid()`);

export const role = profile.enum('role', ['student', 'admin']);
export const accountStatus = profile.enum('account_status', ['active', 'suspended', 'deleted']);
// 'after_diploma' is no longer used: diploma holders are 'after_preu' with higher_qualification 'diploma' (migration 0004).
// Postgres cannot drop an enum value, so it stays listed here.
export const educationLevel = profile.enum('education_level', ['form1_3', 'form4_5', 'after_spm', 'after_preu', 'after_diploma', 'after_certificate']);
export const recordKind = profile.enum('record_kind', ['actual', 'target', 'school']);
export const recordStatus = profile.enum('record_status', ['draft', 'confirmed']);

export const accounts = profile.table('account', {
  id: uuid('id').primaryKey(),
  fullName: text('full_name'),
  role: role('role').notNull().default('student'),
  status: accountStatus('account_status').notNull().default('active'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const students = profile.table('student', {
  id: id(),
  accountId: uuid('account_id').notNull().unique().references(() => accounts.id, { onDelete: 'cascade' }),
  educationLevel: educationLevel('education_level'),
  formYear: smallint('form_year'),
  /** After SPM: which qualification (certificate, svm, skm; or stpm, matriculation, foundation, a_level, diploma, dvm, dkm). */
  higherQualification: text('higher_qualification'),
  streamProgramId: uuid('stream_program_id'),
  schoolName: text('school_name'),
  dateOfBirth: date('date_of_birth'),
  parentConsentAt: timestamp('parent_consent_at', { withTimezone: true }),
});

export const academicRecords = profile.table('academic_record', {
  id: id(),
  studentId: uuid('student_id').notNull().references(() => students.id, { onDelete: 'cascade' }),
  diplomaProgramId: uuid('diploma_program_id'),
  /** Diploma results: the catalogue field of study (degree programmes favour a related field) and the programme name. */
  fieldId: uuid('field_id'),
  programmeName: text('programme_name'),
  /** MQF level where a qualification has several: SKM 1–3, DKM 4 / DLKM 5. */
  qualificationLevel: smallint('qualification_level'),
  qualification: text('qualification').notNull(),
  recordKind: recordKind('record_kind').notNull(),
  examYear: smallint('exam_year'),
  cgpa: numeric('cgpa', { precision: 3, scale: 2 }),
  muetBand: numeric('muet_band', { precision: 2, scale: 1 }),
  entrySource: text('entry_source').notNull().default('manual'),
  documentFile: text('document_file'),
  extractionStatus: text('extraction_status'),
  recordStatus: recordStatus('record_status').notNull().default('draft'),
  confirmedAt: timestamp('confirmed_at', { withTimezone: true }),
});

export const recordSubjects = profile.table(
  'record_subject',
  {
    recordId: uuid('record_id').notNull().references(() => academicRecords.id, { onDelete: 'cascade' }),
    subjectId: uuid('subject_id').notNull(),
    grade: text('grade').notNull(),
    /** Set for a subject that is not in the catalogue (typed by the student, e.g. "Tasawwuf"); subject_id is then a random id. */
    customName: text('custom_name'),
    readConfidence: numeric('read_confidence', { precision: 3, scale: 2 }),
    reviewNote: text('review_note'),
  },
  (t) => [primaryKey({ columns: [t.recordId, t.subjectId] })],
);

export const assessments = profile.table('assessment', {
  id: id(),
  studentId: uuid('student_id').notNull().references(() => students.id, { onDelete: 'cascade' }),
  instrumentVersion: text('instrument_version').notNull(),
  answers: jsonb('answers').$type<Record<string, number>>().notNull(),
  riasecScores: jsonb('riasec_scores').$type<Record<'R' | 'I' | 'A' | 'S' | 'E' | 'C', number>>(),
  completedAt: timestamp('completed_at', { withTimezone: true }),
});

export const activityAttempts = profile.table(
  'activity_attempt',
  {
    studentId: uuid('student_id').notNull().references(() => students.id, { onDelete: 'cascade' }),
    activityId: uuid('activity_id').notNull(),
    enjoymentRating: smallint('enjoyment_rating'),
    reflection: text('reflection'),
    completedAt: timestamp('completed_at', { withTimezone: true }),
  },
  (t) => [primaryKey({ columns: [t.studentId, t.activityId] })],
);

export const savedPrograms = profile.table(
  'saved_program',
  {
    studentId: uuid('student_id').notNull().references(() => students.id, { onDelete: 'cascade' }),
    programId: uuid('program_id').notNull(),
    inComparison: boolean('in_comparison').notNull().default(false),
    note: text('note'),
    savedAt: timestamp('saved_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.studentId, t.programId] })],
);

export const roadmaps = profile.table('roadmap', {
  id: id(),
  studentId: uuid('student_id').notNull().references(() => students.id, { onDelete: 'cascade' }),
  title: text('roadmap_title').notNull(),
  versionNo: integer('version_no').notNull().default(1),
  isActive: boolean('is_active').notNull().default(true),
});

export const roadmapSteps = profile.table('roadmap_step', {
  id: id(),
  roadmapId: uuid('roadmap_id').notNull().references(() => roadmaps.id, { onDelete: 'cascade' }),
  parentStepId: uuid('parent_step_id'),
  programId: uuid('program_id'),
  careerId: uuid('career_id'),
  stepType: text('step_type').notNull(),
  label: text('step_label').notNull(),
  stepOrder: integer('step_order').notNull(),
});
