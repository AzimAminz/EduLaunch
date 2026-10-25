import { existsSync } from 'node:fs';
import { z } from 'zod';

/** Settings every service needs. Services extend this schema with their own keys. */
export const BaseServiceEnv = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive(),
  DATABASE_URL: z.string().min(1),
  RABBITMQ_URL: z.string().optional(),
  INTERNAL_TOKEN: z.string().min(16, 'INTERNAL_TOKEN must be at least 16 characters'),
});
export type BaseServiceEnv = z.infer<typeof BaseServiceEnv>;

/** Validates process.env once at start-up and fails fast with a readable message. */
export function loadEnv<T extends z.ZodType>(schema: T, source: NodeJS.ProcessEnv = process.env): z.infer<T> {
  // Local development reads the service's .env (written by `pnpm env:setup`); production injects real variables.
  if (source === process.env && process.env.NODE_ENV !== 'production' && existsSync('.env')) process.loadEnvFile('.env');
  const parsed = schema.safeParse(source);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n');
    throw new Error(`Invalid environment variables:\n${issues}`);
  }
  return parsed.data;
}
