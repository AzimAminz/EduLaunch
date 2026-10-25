import { boolean, jsonb, numeric, pgSchema, primaryKey, smallint, text, timestamp, uuid } from 'drizzle-orm/pg-core';

/** Cached results, recomputed when results, interests or requirements change. */
export const recommendation = pgSchema('recommendation');

export const eligibility = recommendation.enum('eligibility', ['eligible', 'almost', 'not_yet']);
export const offerChance = recommendation.enum('offer_chance', ['high', 'medium', 'low', 'no_data']);

export const recommendations = recommendation.table(
  'recommendation',
  {
    studentId: uuid('student_id').notNull(),
    programId: uuid('program_id').notNull(),
    programName: text('program_name').notNull(),
    eligibility: eligibility('eligibility').notNull(),
    score: smallint('score').notNull(),
    offerChance: offerChance('offer_chance').notNull(),
    offerMargin: numeric('offer_margin', { precision: 5, scale: 1 }),
    isTopMatch: boolean('is_top_match').notNull().default(false),
    isTargetBased: boolean('is_target_based').notNull().default(false),
    reasons: jsonb('reasons').$type<string[]>().notNull(),
    missing: jsonb('missing').$type<string[]>().notNull(),
    generatedAt: timestamp('generated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.studentId, t.programId] })],
);
