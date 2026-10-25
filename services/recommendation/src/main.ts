import 'reflect-metadata';
import { bootstrapService } from '@edulaunch/nest-kit';
import { AppModule } from './app.module.js';
import { env } from './config.js';

await bootstrapService(AppModule, { name: 'recommendation-service', port: env.PORT, internalToken: env.INTERNAL_TOKEN });
