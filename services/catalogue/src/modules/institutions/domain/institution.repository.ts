import type { InstitutionSourceKind } from '@edulaunch/contracts';
import type { Institution } from './institution.js';

export abstract class InstitutionRepository {
  abstract findById(id: string): Promise<Institution | null>;
  abstract save(institution: Institution): Promise<void>;
  /** Deletes the institution and, through the database's cascading keys, everything under it. Returns the programme IDs that went. */
  abstract deleteWithProgrammes(id: string): Promise<string[]>;
  abstract countPublishedProgrammes(id: string): Promise<number>;
  abstract addSource(institutionId: string, source: { kind: InstitutionSourceKind; url: string; label: string | null }): Promise<string>;
  abstract removeSource(institutionId: string, sourceId: string): Promise<boolean>;
}
