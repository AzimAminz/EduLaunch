import { Injectable } from '@nestjs/common';
import type { Page, UseCase } from '@edulaunch/ddd';
import type { ProgramSummary } from '@edulaunch/contracts';
import { ProgramRepository, type ProgramSearch } from '../domain/program.repository.js';
import type { Program } from '../domain/program.js';

export type SearchProgrammesInput = Omit<ProgramSearch, 'onlyPublished'> & { includeDrafts: boolean };

@Injectable()
export class SearchProgrammes implements UseCase<SearchProgrammesInput, Page<ProgramSummary>> {
  constructor(private readonly programs: ProgramRepository) {}

  async execute({ includeDrafts, ...criteria }: SearchProgrammesInput): Promise<Page<ProgramSummary>> {
    const page = await this.programs.search({ ...criteria, onlyPublished: !includeDrafts });
    const facts = await this.programs.admissionFacts(page.items.map((p) => p.id));
    return { ...page, items: page.items.map((p) => toSummary(p, facts.get(p.id))) };
  }
}

type AdmissionFacts = Pick<ProgramSummary, 'entryRoutes' | 'averageMerit'>;

export function toSummary(program: Program, facts?: AdmissionFacts): ProgramSummary {
  const s = program.toSnapshot();
  return {
    id: s.id,
    institutionId: s.institutionId,
    name: s.name,
    studyLevel: s.studyLevel,
    durationSemesters: s.durationSemesters,
    fieldIds: s.fieldIds,
    entryRoutes: facts?.entryRoutes ?? [],
    averageMerit: facts?.averageMerit ?? null,
  };
}
