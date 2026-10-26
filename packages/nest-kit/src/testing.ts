import { existsSync } from 'node:fs';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import type { Database } from './database.js';

/**
 * Connects integration tests to the local Supabase database with the service's own role.
 * Tests create rows with fresh UUIDs and delete them afterwards, so they never touch other data.
 */
export function connectTestDatabase<TSchema extends Record<string, unknown>>(schema: TSchema): { db: Database<TSchema>; close: () => Promise<void> } {
  if (existsSync('.env')) process.loadEnvFile('.env');
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error('DATABASE_URL is not set. Start Supabase (pnpm db:start) and run pnpm env:setup before integration tests.');
  }
  const sql = postgres(url, { max: 2, prepare: false, onnotice: () => {} });
  return { db: drizzle(sql, { schema }), close: () => sql.end({ timeout: 5 }) };
}
