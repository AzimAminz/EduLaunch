import { BaseServiceEnv, loadEnv } from '@edulaunch/nest-kit';
import { z } from 'zod';

export const env = loadEnv(BaseServiceEnv.extend({ PROFILE_URL: z.url() }));
