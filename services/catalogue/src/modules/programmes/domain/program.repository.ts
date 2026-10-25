import type { Page } from '@edulaunch/ddd';
import type { StudyLevel } from '@edulaunch/contracts';
import type { Program } from './program.js';

export interface ProgramSearch {
  query?: string;
  institutionId?: string;
  fieldId?: string;
  studyLevel?: StudyLevel;
  onlyPublished: boolean;
  page: number;
  pageSize: number;
}

/** Port. The application layer depends on this abstraction, never on Drizzle. */
export abstract class ProgramRepository {
  abstract findById(id: string): Promise<Program | null>;
  abstract search(criteria: ProgramSearch): Promise<Page<Program>>;
  abstract save(program: Program): Promise<void>;
}
