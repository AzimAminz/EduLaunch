import { Injectable } from '@nestjs/common';
import { NotFoundError, type UseCase } from '@edulaunch/ddd';
import type { ProgramDetail } from '@edulaunch/contracts';
import { ProgramRepository } from '../domain/program.repository.js';
import { toSummary } from './search-programmes.use-case.js';

@Injectable()
export class GetProgramme implements UseCase<{ id: string; includeDrafts: boolean }, ProgramDetail> {
  constructor(private readonly programs: ProgramRepository) {}

  async execute({ id, includeDrafts }: { id: string; includeDrafts: boolean }): Promise<ProgramDetail> {
    const program = await this.programs.findById(id);
    if (!program || (!includeDrafts && !program.isVisibleToStudents)) throw new NotFoundError('Programme', id);
    // The live (approved) details only; a pending change stays with the admins until it is approved.
    const s = program.toSnapshot();
    return {
      ...toSummary(program, (await this.programs.admissionFacts([id])).get(id)),
      details: {
        programCode: s.programCode,
        internalCode: s.internalCode,
        faculty: s.faculty,
        necCode: s.necCode,
        studyMode: s.studyMode,
        campuses: s.campuses,
        hasInterview: s.hasInterview,
        isStem: s.isStem,
        isTvet: s.isTvet,
        bumiputeraOnly: s.bumiputeraOnly,
        jointDegree: s.jointDegree,
        feeder: s.feeder,
        careers: s.careers,
        fees: s.fees,
        note: s.note,
        sourceUrl: s.sourceUrl,
      },
    };
  }
}
