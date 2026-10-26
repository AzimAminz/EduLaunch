import type { Institution } from './institution.js';

export abstract class InstitutionRepository {
  abstract findById(id: string): Promise<Institution | null>;
  abstract save(institution: Institution): Promise<void>;
}
