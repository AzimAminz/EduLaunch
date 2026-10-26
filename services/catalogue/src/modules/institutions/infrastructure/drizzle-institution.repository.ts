import { Inject, Injectable } from '@nestjs/common';
import { DRIZZLE, type Database } from '@edulaunch/nest-kit';
import type { InstitutionType } from '@edulaunch/contracts';
import { count, eq } from 'drizzle-orm';
import * as schema from '../../../infrastructure/db/schema.js';
import { Institution } from '../domain/institution.js';
import { InstitutionRepository } from '../domain/institution.repository.js';

const { institutions, programs } = schema;

@Injectable()
export class DrizzleInstitutionRepository extends InstitutionRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database<typeof schema>) {
    super();
  }

  async findById(id: string): Promise<Institution | null> {
    const [row] = await this.db.select().from(institutions).where(eq(institutions.id, id)).limit(1);
    return row ? Institution.restore(row.id, { name: row.name, shortName: row.shortName, type: row.type as InstitutionType, websiteUrl: row.websiteUrl }) : null;
  }

  async save(institution: Institution): Promise<void> {
    const s = institution.toSnapshot();
    const values = { name: s.name, shortName: s.shortName, type: s.type, websiteUrl: s.websiteUrl };
    await this.db
      .insert(institutions)
      .values({ id: s.id, ...values })
      .onConflictDoUpdate({ target: institutions.id, set: { ...values, updatedAt: new Date() } });
  }

  async delete(id: string): Promise<void> {
    await this.db.delete(institutions).where(eq(institutions.id, id));
  }

  async countProgrammes(id: string): Promise<number> {
    const [row] = await this.db.select({ n: count() }).from(programs).where(eq(programs.institutionId, id));
    return row?.n ?? 0;
  }
}
