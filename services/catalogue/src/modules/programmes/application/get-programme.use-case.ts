import { Injectable } from '@nestjs/common';
import { NotFoundError, type UseCase } from '@edulaunch/ddd';
import type { ProgramSummary } from '@edulaunch/contracts';
import { ProgramRepository } from '../domain/program.repository.js';
import { toSummary } from './search-programmes.use-case.js';

@Injectable()
export class GetProgramme implements UseCase<{ id: string; includeDrafts: boolean }, ProgramSummary> {
  constructor(private readonly programs: ProgramRepository) {}

  async execute({ id, includeDrafts }: { id: string; includeDrafts: boolean }): Promise<ProgramSummary> {
    const program = await this.programs.findById(id);
    if (!program || (!includeDrafts && !program.isVisibleToStudents)) throw new NotFoundError('Programme', id);
    return toSummary(program);
  }
}
