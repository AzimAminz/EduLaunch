import { BaseServiceEnv, loadEnv } from '@edulaunch/nest-kit';

export const env = loadEnv(BaseServiceEnv.extend({}));
