import type { Caller } from '@edulaunch/nest-kit';
import type { ProgramSummary, PublishedRequirement, StudentSnapshot, StudyLevel } from '@edulaunch/contracts';
import type { Riasec } from '../domain/scoring.js';
import type { RecommendationItem } from '../domain/recommendation-list.js';

/** What this service needs from the catalogue service. */
export abstract class CatalogueGateway {
  abstract programmesAt(levels: StudyLevel[]): Promise<ProgramSummary[]>;
  abstract publishedRequirements(programIds: string[]): Promise<PublishedRequirement[]>;
  abstract subjectNames(): Promise<Map<string, string>>;
  /** The broad fields of study: their RIASEC profile and English name (field relations are keyed by it). */
  abstract fields(): Promise<Array<{ id: string; nameEn: string | null; riasecWeights: Riasec | null }>>;
}

/**
 * Compares the meaning of short texts (programme names) with a language model that runs on this server. Null when
 * no model is available, so recommendations still work without it (field matching alone).
 */
export abstract class TextEmbedder {
  /** Cosine similarity of the query to each passage, in order. */
  abstract similarity(query: string, passages: string[]): Promise<number[] | null>;
}

/** What this service needs from the profile service. */
export abstract class ProfileGateway {
  abstract studentIdFor(caller: Caller): Promise<string>;
  abstract snapshot(studentId: string): Promise<StudentSnapshot>;
}

export abstract class RecommendationStore {
  abstract replaceFor(studentId: string, items: RecommendationItem[]): Promise<void>;
  abstract listFor(studentId: string): Promise<RecommendationItem[]>;
  /** When the student's list was last worked out and with which scoring; null when there is none. */
  abstract status(studentId: string): Promise<{ generatedAt: Date; scoringVersion: number } | null>;
  abstract studentsWithProgramme(programId: string): Promise<string[]>;
  /** Removes everything kept for a student (they deleted their account). */
  abstract forget(studentId: string): Promise<void>;
}
