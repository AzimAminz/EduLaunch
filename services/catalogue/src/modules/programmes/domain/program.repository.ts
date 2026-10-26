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
  /** Removes the programme; its requirements, fields, pathways and admission figures go with it (cascading keys). */
  abstract delete(id: string): Promise<void>;
  abstract institutionExists(id: string): Promise<boolean>;
  abstract necCodeExists(code: string): Promise<boolean>;
  /** Whether another programme already uses this JPT / UPU code. */
  abstract upuCodeTaken(code: string, exceptId: string | null): Promise<boolean>;
  /** The given field IDs that exist in the catalogue. */
  abstract existingFieldIds(ids: string[]): Promise<string[]>;
}
