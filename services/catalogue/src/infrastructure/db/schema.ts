import { sql } from 'drizzle-orm';
import { boolean, date, integer, jsonb, numeric, pgSchema, primaryKey, text, timestamp, uuid } from 'drizzle-orm/pg-core';

/**
 * Tables owned by the catalogue service. IDs that point to other services
 * (data sources, admin users) are stored as plain UUIDs without foreign keys.
 */
export const catalogue = pgSchema('catalogue');

const id = () => uuid('id').primaryKey().default(sql`gen_random_uuid()`);
const timestamps = {
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
};

export const reviewStatus = catalogue.enum('review_status', ['draft', 'in_review', 'returned', 'published', 'archived']);
export const studyLevel = catalogue.enum('study_level', ['form4_stream', 'certificate', 'skills', 'foundation', 'matriculation', 'stpm', 'diploma', 'degree']);
export const ruleType = catalogue.enum('rule_type', ['min_grade', 'min_credits', 'min_cgpa', 'min_muet', 'key_subject']);

export const institutions = catalogue.table('institution', {
  id: id(),
  name: text('institution_name').notNull(),
  shortName: text('short_name'),
  type: text('institution_type').notNull(),
  websiteUrl: text('website_url'),
  /** Negeri (state or federal territory). */
  state: text('state'),
  /** A delete waiting for a second admin, because students can see some of its programmes. */
  deletionRequestedBy: uuid('deletion_requested_by'),
  deletionRequestedAt: timestamp('deletion_requested_at', { withTimezone: true }),
  ...timestamps,
});

/** Where an institution publishes its programmes: website, programme page, prospectus PDFs, its ePanduan code. */
export const institutionSources = catalogue.table('institution_source', {
  id: id(),
  institutionId: uuid('institution_id').notNull().references(() => institutions.id, { onDelete: 'cascade' }),
  kind: text('kind').notNull(),
  url: text('url').notNull(),
  label: text('label'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const fields = catalogue.table('field', {
  id: id(),
  parentId: uuid('parent_field_id'),
  /** Bahasa Melayu name (default). */
  name: text('field_name').notNull(),
  nameEn: text('field_name_en'),
  riasecWeights: jsonb('riasec_weights').$type<Record<'R' | 'I' | 'A' | 'S' | 'E' | 'C', number>>(),
});

export const subjects = catalogue.table('subject', {
  id: id(),
  /** Official (Bahasa Melayu) subject name. */
  name: text('subject_name').notNull(),
  nameEn: text('subject_name_en'),
  aliases: text('aliases').array().notNull().default(sql`'{}'`),
  category: text('category'),
  qualification: text('qualification').notNull(),
  isMandatory: boolean('is_mandatory').notNull().default(false),
});

/**
 * National Education Code (NEC) fields, the 4-digit codes used by JPT and MQA (for example 0712 Electricity and energy).
 * `field_id` is the broad EduLaunch field it suggests for recommendations.
 */
export const necFields = catalogue.table('nec_field', {
  code: text('code').primaryKey(),
  name: text('name').notNull(),
  fieldId: uuid('field_id').references(() => fields.id),
});

/** Every study option, including Form 4 streams (`study_level = form4_stream`, no institution). */
export const programs = catalogue.table('program', {
  id: id(),
  institutionId: uuid('institution_id').references(() => institutions.id, { onDelete: 'cascade' }),
  name: text('program_name').notNull(),
  studyLevel: studyLevel('study_level').notNull(),
  durationSemesters: integer('duration_semesters'),
  /** Programme code used by JPT / UPU, for example UC6522001. */
  upuCode: text('upu_code').unique(),
  /** The university's own code, for example BELG. */
  internalCode: text('internal_code'),
  faculty: text('faculty'),
  necCode: text('nec_code').references(() => necFields.code),
  /** conventional, work_based (2U2I / 3U1I) or distance. */
  studyMode: text('study_mode'),
  campus: text('campus'),
  hasInterview: boolean('has_interview').notNull().default(false),
  isStem: boolean('is_stem').notNull().default(false),
  isTvet: boolean('is_tvet').notNull().default(false),
  /** Open to Bumiputera applicants only (for example some foundation programmes). */
  bumiputeraOnly: boolean('bumiputera_only').notNull().default(false),
  sourceUrl: text('source_url'),
  /**
   * A change to a published programme waiting for approval: the whole proposed version, its review status
   * (draft, in_review, returned), who prepared it and why it was returned. Students keep seeing the columns above.
   */
  pendingChanges: jsonb('pending_changes'),
  pendingStatus: text('pending_status'),
  pendingPreparedBy: uuid('pending_prepared_by'),
  pendingReturnReason: text('pending_return_reason'),
  publishStatus: reviewStatus('publish_status').notNull().default('draft'),
  /** Admin user IDs (auth service). Null for programmes loaded from the seed. */
  preparedBy: uuid('prepared_by'),
  approvedBy: uuid('approved_by'),
  returnReason: text('return_reason'),
  ...timestamps,
});

export const programFields = catalogue.table(
  'program_field',
  {
    programId: uuid('program_id').notNull().references(() => programs.id, { onDelete: 'cascade' }),
    fieldId: uuid('field_id').notNull().references(() => fields.id),
  },
  (t) => [primaryKey({ columns: [t.programId, t.fieldId] })],
);

export const programPathways = catalogue.table(
  'program_pathway',
  {
    fromProgramId: uuid('from_program_id').notNull().references(() => programs.id, { onDelete: 'cascade' }),
    toProgramId: uuid('to_program_id').notNull().references(() => programs.id, { onDelete: 'cascade' }),
    conditionText: text('condition_text'),
    minCgpa: numeric('min_cgpa', { precision: 3, scale: 2 }),
    sourceId: uuid('source_id'),
  },
  (t) => [primaryKey({ columns: [t.fromProgramId, t.toProgramId] })],
);

export const requirements = catalogue.table('requirement', {
  id: id(),
  programId: uuid('program_id').notNull().references(() => programs.id, { onDelete: 'cascade' }),
  sourceId: uuid('source_id'),
  /** The official page or document the rules were taken from, until sources are registered in the content service. */
  sourceUrl: text('source_url'),
  preparedBy: uuid('prepared_by').notNull(),
  approvedBy: uuid('approved_by'),
  entryRoute: text('entry_route').notNull(),
  versionNo: integer('version_no').notNull(),
  reviewStatus: reviewStatus('review_status').notNull().default('draft'),
  returnReason: text('return_reason'),
  effectiveFrom: date('effective_from'),
  ...timestamps,
});

export const requirementRules = catalogue.table('requirement_rule', {
  id: id(),
  requirementId: uuid('requirement_id').notNull().references(() => requirements.id, { onDelete: 'cascade' }),
  groupNo: integer('group_no').notNull(),
  ruleType: ruleType('rule_type').notNull(),
  subjectId: uuid('subject_id').references(() => subjects.id),
  relatedFieldId: uuid('related_field_id').references(() => fields.id),
  minGrade: text('min_grade'),
  minValue: numeric('min_value', { precision: 5, scale: 2 }),
  evidenceQuote: text('evidence_quote'),
});

export const meritFormulas = catalogue.table('merit_formula', {
  id: id(),
  approvedBy: uuid('approved_by'),
  entryRoute: text('entry_route').notNull(),
  academicWeight: numeric('academic_weight', { precision: 5, scale: 2 }).notNull(),
  cocurricularWeight: numeric('cocurricular_weight', { precision: 5, scale: 2 }).notNull(),
  versionNo: integer('version_no').notNull(),
  reviewStatus: reviewStatus('review_status').notNull().default('draft'),
});

export const admissionStats = catalogue.table('admission_stat', {
  id: id(),
  programId: uuid('program_id').notNull().references(() => programs.id, { onDelete: 'cascade' }),
  sourceId: uuid('source_id'),
  intakeYear: integer('intake_year').notNull(),
  lowestMerit: numeric('lowest_merit', { precision: 6, scale: 2 }),
  averageMerit: numeric('average_merit', { precision: 6, scale: 2 }),
  applicants: integer('applicants'),
  places: integer('places'),
});

export const careers = catalogue.table('career', {
  id: id(),
  fieldId: uuid('field_id').notNull().references(() => fields.id),
  sourceId: uuid('source_id'),
  title: text('career_title').notNull(),
  description: text('description'),
  minStudyLevel: studyLevel('min_study_level').notNull(),
  outlookNote: text('outlook_note'),
});

export const activities = catalogue.table('activity', {
  id: id(),
  fieldId: uuid('field_id').notNull().references(() => fields.id),
  title: text('activity_title').notNull(),
  type: text('activity_type').notNull(),
});
