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
  /** Result of the interest test (RIASEC), worked out from the student's answers in `assessment`. */
  riasecScores: jsonb('riasec_scores').$type<Record<'R' | 'I' | 'A' | 'S' | 'E' | 'C', number>>(),
  interestTestAt: timestamp('interest_test_at', { withTimezone: true }),
  /** What the student wants to be told about (Settings → Notifications). */
  notificationPrefs: jsonb('notification_prefs').$type<{ requirementChanges: boolean }>().notNull().default({ requirementChanges: true }),
});

export const academicRecords = profile.table('academic_record', {
  id: id(),
  studentId: uuid('student_id').notNull().references(() => students.id, { onDelete: 'cascade' }),
  diplomaProgramId: uuid('diploma_program_id'),
  /** Diploma results: the catalogue field of study (degree programmes favour a related field) and the programme name. */
  fieldId: uuid('field_id'),
  /** A field typed by the student when it is not in the catalogue (e.g. an uncommon foundation programme). */
  customFieldName: text('custom_field_name'),
  programmeName: text('programme_name'),
  /** MQF level where a qualification has several: SKM 1–3, DKM 4 / DLKM 5. */
  qualificationLevel: smallint('qualification_level'),
  /** Matriculation stream (science_1…3, engineering, accounting, professional_accounting). */
  stream: text('stream'),
  /** Matriculation and foundation: GPA of each semester (PNGS), in order; null for a semester without one yet. */
  semesterGpas: jsonb('semester_gpas').$type<Array<number | null>>(),
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
    /** How sure the slip reader was of this grade (0 to 1); low values are flagged for the student to check. */
    ocrConfidence: numeric('ocr_confidence', { precision: 3, scale: 2 }),
    reviewNote: text('review_note'),
  },
  (t) => [primaryKey({ columns: [t.recordId, t.subjectId] })],
);

/** One statement of the interest test (RIASEC), for example "I like fixing machines". */
export const questions = profile.table('question', {
  id: id(),
  questionText: text('question_text').notNull(),
  questionTextEn: text('question_text_en'),
  /** The interest type the statement measures: R, I, A, S, E or C. */
  riasecType: text('riasec_type').notNull(),
  /** The test version the statement belongs to, so old answers keep their meaning when the test changes. */
  testVersion: text('test_version').notNull().default('v1'),
  displayOrder: integer('display_order').notNull().default(0),
  isActive: boolean('is_active').notNull().default(true),
});

/** A student's answer to one question of the interest test (1 = not like me … 5 = very like me). */
export const assessments = profile.table(
  'assessment',
  {
    studentId: uuid('student_id')
      .notNull()
      .references(() => students.id, { onDelete: 'cascade' }),
    questionId: uuid('question_id')
      .notNull()
      .references(() => questions.id, { onDelete: 'cascade' }),
    answer: smallint('answer').notNull(),
    answeredAt: timestamp('answered_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.studentId, t.questionId] })],
);

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

/** One step of a student's study and career plan (a programme, a career or a note), in order. */
export const roadmapSteps = profile.table('roadmap_step', {
  id: id(),
  studentId: uuid('student_id')
    .notNull()
    .references(() => students.id, { onDelete: 'cascade' }),
  stepOrder: integer('step_order').notNull(),
  /** programme, career or note. */
  stepType: text('step_type').notNull(),
  programId: uuid('program_id'),
  careerId: uuid('career_id'),
  label: text('step_label').notNull(),
});
