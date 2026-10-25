import { loadEnv } from '@edulaunch/nest-kit';
import { z } from 'zod';

export const env = loadEnv(
  z.object({
    PORT: z.coerce.number().int().default(4000),
    INTERNAL_TOKEN: z.string().min(16),
    SUPABASE_URL: z.url(),
    /** Only for local Supabase, which signs tokens with HS256. Cloud projects use the JWKS endpoint. */
    SUPABASE_JWT_SECRET: z.string().optional(),
    CORS_ORIGINS: z.string().default('http://localhost:3000,http://127.0.0.1:3000'),
    REDIS_URL: z.string().optional(),
    CATALOGUE_URL: z.url(),
    PROFILE_URL: z.url(),
    RECOMMENDATION_URL: z.url(),
    ENGAGEMENT_URL: z.url(),
    CONTENT_URL: z.url(),
  }),
);
