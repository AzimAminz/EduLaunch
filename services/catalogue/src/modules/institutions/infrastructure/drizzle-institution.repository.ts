import { Inject, Injectable } from '@nestjs/common';
import { DRIZZLE, type Database } from '@edulaunch/nest-kit';
import type { InstitutionSourceKind, InstitutionType } from '@edulaunch/contracts';
import { and, count, eq } from 'drizzle-orm';
import * as schema from '../../../infrastructure/db/schema.js';
import { Institution } from '../domain/institution.js';
import { InstitutionRepository } from '../domain/institution.repository.js';

const { institutions, institutionSources, programs } = schema;

@Injectable()
export class DrizzleInstitutionRepository extends InstitutionRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database<typeof schema>) {
    super();
  }

  async findById(id: string): Promise<Institution | null> {
    const [row] = await this.db.select().from(institutions).where(eq(institutions.id, id)).limit(1);
    return row
      ? Institution.restore(row.id, {
          name: row.name,
          shortName: row.shortName,
          type: row.type as InstitutionType,
          websiteUrl: row.websiteUrl,
          state: row.state,
          deletionRequestedBy: row.deletionRequestedBy,
          deletionRequestedAt: row.deletionRequestedAt,
        })
      : null;
  }

  async save(institution: Institution): Promise<void> {
    const s = institution.toSnapshot();
    const values = {
      name: s.name,
      shortName: s.shortName,
      type: s.type,
      websiteUrl: s.websiteUrl,
      state: s.state,
      deletionRequestedBy: s.deletionRequestedBy,
      deletionRequestedAt: s.deletionRequestedAt,
    };
    await this.db
      .insert(institutions)
      .values({ id: s.id, ...values })
      .onConflictDoUpdate({ target: institutions.id, set: { ...values, updatedAt: new Date() } });
  }

  async deleteWithProgrammes(id: string): Promise<string[]> {
    return this.db.transaction(async (tx) => {
      const gone = await tx.select({ id: programs.id }).from(programs).where(eq(programs.institutionId, id));
      // Programmes, their requirements and rules, fields, pathways, admission figures and sources cascade.
      await tx.delete(institutions).where(eq(institutions.id, id));
      return gone.map((p) => p.id);
    });
  }

  async countPublishedProgrammes(id: string): Promise<number> {
    const [row] = await this.db
      .select({ n: count() })
      .from(programs)
      .where(and(eq(programs.institutionId, id), eq(programs.publishStatus, 'published')));
    return row?.n ?? 0;
  }

  async addSource(institutionId: string, source: { kind: InstitutionSourceKind; url: string; label: string | null }): Promise<string> {
    const [row] = await this.db.insert(institutionSources).values({ institutionId, ...source }).returning({ id: institutionSources.id });
    return row!.id;
  }

  async removeSource(institutionId: string, sourceId: string): Promise<boolean> {
    const rows = await this.db
      .delete(institutionSources)
      .where(and(eq(institutionSources.id, sourceId), eq(institutionSources.institutionId, institutionId)))
      .returning({ id: institutionSources.id });
    return rows.length > 0;
  }
}
