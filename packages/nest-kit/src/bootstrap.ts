import { Controller, Get, Logger, Module, type Type } from '@nestjs/common';
import { NestFactory, Reflector } from '@nestjs/core';
import { AppExceptionFilter } from './errors.js';
import { InternalAuthGuard } from './internal-auth.js';

@Controller('health')
export class HealthController {
  @Get()
  check() {
    return { status: 'ok', time: new Date().toISOString() };
  }
}

@Module({ controllers: [HealthController] })
export class HealthModule {}

/** Starts a NestJS service with the shared conventions: error format, internal auth, graceful shutdown. */
export async function bootstrapService(rootModule: Type<unknown>, options: { name: string; port: number; internalToken: string }) {
  const app = await NestFactory.create(rootModule, { bufferLogs: false });
  app.useGlobalFilters(new AppExceptionFilter());
  app.useGlobalGuards(new InternalAuthGuard(app.get(Reflector), options.internalToken));
  app.enableShutdownHooks();
  await app.listen(options.port);
  new Logger(options.name).log(`listening on :${options.port}`);
  return app;
}
