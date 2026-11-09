import { BaseServiceEnv, loadEnv } from '@edulaunch/nest-kit';
import { z } from 'zod';

export const env = loadEnv(
  BaseServiceEnv.extend({
    /** Supabase, to delete a student's sign-in account when they delete their account. Optional in development. */
    SUPABASE_URL: z.string().url().optional(),
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
  }),
);
