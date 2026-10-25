import type { Caller } from '@edulaunch/nest-kit';
import type { ProgramSummary, PublishedRequirement, StudentSnapshot, StudyLevel } from '@edulaunch/contracts';
import type { Riasec } from '../domain/scoring.js';
import type { RecommendationItem } from '../domain/recommendation-list.js';

/** What this service needs from the catalogue service. */
export abstract class CatalogueGateway {
  abstract programmesAt(levels: StudyLevel[]): Promise<ProgramSummary[]>;
  abstract publishedRequirements(programIds: string[]): Promise<PublishedRequirement[]>;
  abstract subjectNames(): Promise<Map<string, string>>;
  abstract fieldWeights(): Promise<Map<string, Riasec | null>>;
}

/** What this service needs from the profile service. */
export abstract class ProfileGateway {
  abstract studentIdFor(caller: Caller): Promise<string>;
  abstract snapshot(studentId: string): Promise<StudentSnapshot>;
}

export abstract class RecommendationStore {
  abstract replaceFor(studentId: string, items: RecommendationItem[]): Promise<void>;
  abstract listFor(studentId: string): Promise<RecommendationItem[]>;
  abstract studentsWithProgramme(programId: string): Promise<string[]>;
}
