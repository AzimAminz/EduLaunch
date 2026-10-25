import { existsSync } from 'node:fs';
import { defineConfig } from 'drizzle-kit';

if (existsSync('.env')) process.loadEnvFile('.env');

// Migrations stay inside this service; the journal table lives in the service's own schema.
export default defineConfig({
  dialect: 'postgresql',
  schema: './src/infrastructure/db/schema.ts',
  out: './drizzle',
  schemaFilter: ['catalogue'],
  migrations: { schema: 'catalogue', table: '__migrations' },
  dbCredentials: { url: process.env.DATABASE_URL! },
});
