import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppExceptionFilter } from '@edulaunch/nest-kit';
import helmet from 'helmet';
import { AppModule } from './app.module.js';
import { env } from './config.js';

const app = await NestFactory.create(AppModule);
app.use(helmet());
app.enableCors({ origin: env.CORS_ORIGINS.split(','), credentials: true });
app.useGlobalFilters(new AppExceptionFilter());
app.enableShutdownHooks();
await app.listen(env.PORT);
new Logger('gateway').log(`listening on :${env.PORT}`);
