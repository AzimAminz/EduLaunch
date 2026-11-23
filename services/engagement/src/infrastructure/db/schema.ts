import { sql } from 'drizzle-orm';
import { pgSchema, text, timestamp, uuid } from 'drizzle-orm/pg-core';

/** Tables owned by the engagement service. User IDs are Supabase Auth user IDs. */
export const engagement = pgSchema('engagement');

export const ticketStatus = engagement.enum('ticket_status', ['open', 'in_progress', 'closed']);
export const ticketCategory = engagement.enum('ticket_category', ['wrong_data', 'account', 'other']);

export const supportTickets = engagement.table('support_ticket', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid('user_id').notNull(),
  assignedAdminId: uuid('assigned_admin_id'),
  programId: uuid('program_id'),
  category: ticketCategory('category').notNull(),
  message: text('message').notNull(),
  adminReply: text('admin_reply'),
  status: ticketStatus('ticket_status').notNull().default('open'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  closedAt: timestamp('closed_at', { withTimezone: true }),
});

export const notifications = engagement.table('notification', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid('user_id').notNull(),
  programId: uuid('program_id'),
  type: text('notification_type').notNull(),
  message: text('message').notNull(),
  readAt: timestamp('read_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const contactCategory = engagement.enum('contact_category', ['usage', 'data', 'privacy', 'other']);

/**
 * Messages from the public contact form (no account needed). The sender's name and e-mail are kept only so an admin
 * can reply by e-mail; handled messages are deleted after 90 days.
 */
export const contactMessages = engagement.table('contact_message', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  name: text('name').notNull(),
  email: text('email').notNull(),
  category: contactCategory('category').notNull(),
  message: text('message').notNull(),
  handledBy: uuid('handled_by'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  handledAt: timestamp('handled_at', { withTimezone: true }),
});
