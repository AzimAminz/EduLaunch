import { BaseServiceEnv, loadEnv } from '@edulaunch/nest-kit';
import { z } from 'zod';

export const env = loadEnv(
  BaseServiceEnv.extend({
    CATALOGUE_URL: z.url(),
    PROFILE_URL: z.url(),
  }),
);
