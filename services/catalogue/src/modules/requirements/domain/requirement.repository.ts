import type { Requirement } from './requirement.js';

export abstract class RequirementRepository {
  abstract findById(id: string): Promise<Requirement | null>;
  /** Latest published version per programme and entry route. */
  abstract findPublished(programIds: string[]): Promise<Requirement[]>;
  abstract nextVersionNo(programId: string, entryRoute: string): Promise<number>;
  abstract save(requirement: Requirement): Promise<void>;
}
