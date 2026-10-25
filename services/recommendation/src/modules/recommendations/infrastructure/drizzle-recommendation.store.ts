import { Inject, Injectable } from '@nestjs/common';
import { DRIZZLE, type Database } from '@edulaunch/nest-kit';
import { desc, eq } from 'drizzle-orm';
import * as schema from '../../../infrastructure/db/schema.js';
import { RecommendationStore } from '../application/ports.js';
import type { RecommendationItem } from '../domain/recommendation-list.js';

const { recommendations } = schema;

@Injectable()
export class DrizzleRecommendationStore extends RecommendationStore {
  constructor(@Inject(DRIZZLE) private readonly db: Database<typeof schema>) {
    super();
  }

  async replaceFor(studentId: string, items: RecommendationItem[]): Promise<void> {
    await this.db.transaction(async (tx) => {
      await tx.delete(recommendations).where(eq(recommendations.studentId, studentId));
      if (items.length) {
        await tx.insert(recommendations).values(items.map((i) => ({ ...i, studentId, offerMargin: i.offerMargin === null ? null : String(i.offerMargin) })));
      }
    });
  }

  async listFor(studentId: string): Promise<RecommendationItem[]> {
    const rows = await this.db.select().from(recommendations).where(eq(recommendations.studentId, studentId)).orderBy(desc(recommendations.isTopMatch), desc(recommendations.score));
    return rows.map(({ studentId: _s, generatedAt: _g, offerMargin, ...r }) => ({ ...r, offerMargin: offerMargin === null ? null : Number(offerMargin) }));
  }

  async studentsWithProgramme(programId: string): Promise<string[]> {
    const rows = await this.db.selectDistinct({ id: recommendations.studentId }).from(recommendations).where(eq(recommendations.programId, programId));
    return rows.map((r) => r.id);
  }
}
