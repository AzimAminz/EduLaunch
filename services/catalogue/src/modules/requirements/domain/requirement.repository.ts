import type { Requirement } from './requirement.js';

export abstract class RequirementRepository {
  abstract findById(id: string): Promise<Requirement | null>;
  /** Latest published version per programme and entry route. */
  abstract findPublished(programIds: string[]): Promise<Requirement[]>;
  abstract nextVersionNo(programId: string, entryRoute: string): Promise<number>;
  abstract save(requirement: Requirement): Promise<void>;
  abstract delete(id: string): Promise<void>;
  /** A draft, returned or in-review version for this programme and route (at most one at a time). */
  abstract findOpen(programId: string, entryRoute: string): Promise<Requirement | null>;
  abstract findLatestPublished(programId: string, entryRoute: string): Promise<Requirement | null>;
  abstract programExists(programId: string): Promise<boolean>;
  /** Each known subject ID with its qualification (spm, stpm…), which decides its grade scale. */
  abstract subjectQualifications(ids: string[]): Promise<Map<string, string>>;
}
