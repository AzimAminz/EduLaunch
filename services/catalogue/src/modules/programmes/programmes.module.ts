import { Module } from '@nestjs/common';
import { ProgramRepository } from './domain/program.repository.js';
import { DrizzleProgramRepository } from './infrastructure/drizzle-program.repository.js';
import { SearchProgrammes } from './application/search-programmes.use-case.js';
import { GetProgramme } from './application/get-programme.use-case.js';
import { ProgrammesController } from './presentation/programmes.controller.js';

@Module({
  controllers: [ProgrammesController],
  providers: [{ provide: ProgramRepository, useClass: DrizzleProgramRepository }, SearchProgrammes, GetProgramme],
})
export class ProgrammesModule {}
