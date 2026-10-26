import type { Institution } from './institution.js';

export abstract class InstitutionRepository {
  abstract findById(id: string): Promise<Institution | null>;
  abstract save(institution: Institution): Promise<void>;
  abstract delete(id: string): Promise<void>;
  /** How many programmes (any status, archived included) belong to the institution. */
  abstract countProgrammes(id: string): Promise<number>;
}
