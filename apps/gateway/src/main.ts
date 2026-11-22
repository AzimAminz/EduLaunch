import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppExceptionFilter } from '@edulaunch/nest-kit';
import helmet from 'helmet';
import express from 'express';
import { AppModule } from './app.module.js';
import { env } from './config.js';

/** Reading a result slip (content service). */
const SLIP_ROUTE = '/api/content/slips';

// Bodies are parsed here rather than by Nest's defaults: a result slip (base64 in JSON) may be a few megabytes, so
// that one route gets a larger limit; everything else keeps the usual 100 kB.
const app = await NestFactory.create(AppModule, { bodyParser: false });
app.use(SLIP_ROUTE, express.json({ limit: '12mb' }));
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));
app.use(helmet());
app.enableCors({ origin: env.CORS_ORIGINS.split(','), credentials: true });
app.useGlobalFilters(new AppExceptionFilter());
app.enableShutdownHooks();
await app.listen(env.PORT);
new Logger('gateway').log(`listening on :${env.PORT}`);
