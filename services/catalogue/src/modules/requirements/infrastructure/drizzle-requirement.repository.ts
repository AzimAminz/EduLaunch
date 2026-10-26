import { Inject, Injectable } from '@nestjs/common';
import { DRIZZLE, type Database } from '@edulaunch/nest-kit';
import { and, desc, eq, inArray, max } from 'drizzle-orm';
import * as schema from '../../../infrastructure/db/schema.js';
import { Requirement, type ReviewStatus } from '../domain/requirement.js';
import { RequirementRepository } from '../domain/requirement.repository.js';

const { requirements, requirementRules, programs, subjects } = schema;
type RequirementRow = typeof requirements.$inferSelect;
type RuleRow = typeof requirementRules.$inferSelect;

@Injectable()
export class DrizzleRequirementRepository extends RequirementRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database<typeof schema>) {
    super();
  }

  async findById(id: string): Promise<Requirement | null> {
    const [row] = await this.db.select().from(requirements).where(eq(requirements.id, id)).limit(1);
    if (!row) return null;
    const rules = await this.db.select().from(requirementRules).where(eq(requirementRules.requirementId, id)).orderBy(requirementRules.groupNo, requirementRules.id);
    return this.toDomain(row, rules);
  }

  async findPublished(programIds: string[]): Promise<Requirement[]> {
    if (programIds.length === 0) return [];
    const rows = await this.db
      .selectDistinctOn([requirements.programId, requirements.entryRoute])
      .from(requirements)
      .where(and(inArray(requirements.programId, programIds), eq(requirements.reviewStatus, 'published')))
      .orderBy(requirements.programId, requirements.entryRoute, desc(requirements.versionNo));
    if (rows.length === 0) return [];
    const rules = await this.db
      .select()
      .from(requirementRules)
      .where(inArray(requirementRules.requirementId, rows.map((r) => r.id)))
      .orderBy(requirementRules.groupNo, requirementRules.id);
    return rows.map((r) => this.toDomain(r, rules.filter((x) => x.requirementId === r.id)));
  }

  async nextVersionNo(programId: string, entryRoute: string): Promise<number> {
    const [row] = await this.db
      .select({ v: max(requirements.versionNo) })
      .from(requirements)
      .where(and(eq(requirements.programId, programId), eq(requirements.entryRoute, entryRoute)));
    return (row?.v ?? 0) + 1;
  }

  async save(req: Requirement): Promise<void> {
    const s = req.toSnapshot();
    await this.db.transaction(async (tx) => {
      await tx
        .insert(requirements)
        .values({
          id: s.id,
          programId: s.programId,
          entryRoute: s.entryRoute,
          versionNo: s.versionNo,
          sourceId: s.sourceId,
          sourceUrl: s.sourceUrl,
          preparedBy: s.preparedBy,
          approvedBy: s.approvedBy,
          reviewStatus: s.status,
          returnReason: s.returnReason,
        })
        .onConflictDoUpdate({
          target: requirements.id,
          set: { sourceUrl: s.sourceUrl, approvedBy: s.approvedBy, reviewStatus: s.status, returnReason: s.returnReason, updatedAt: new Date() },
        });
      await tx.delete(requirementRules).where(eq(requirementRules.requirementId, s.id));
      if (s.rules.length) {
        await tx.insert(requirementRules).values(
          s.rules.map((r) => ({
            id: r.id,
            requirementId: s.id,
            groupNo: r.groupNo,
            ruleType: r.ruleType,
            subjectId: r.subjectId,
            minGrade: r.minGrade,
            minValue: r.minValue === null ? null : String(r.minValue),
            evidenceQuote: r.evidenceQuote,
          })),
        );
      }
    });
  }

  async delete(id: string): Promise<void> {
    await this.db.delete(requirements).where(eq(requirements.id, id));
  }

  async findOpen(programId: string, entryRoute: string): Promise<Requirement | null> {
    const [row] = await this.db
      .select({ id: requirements.id })
      .from(requirements)
      .where(and(eq(requirements.programId, programId), eq(requirements.entryRoute, entryRoute), inArray(requirements.reviewStatus, ['draft', 'returned', 'in_review'])))
      .limit(1);
    return row ? this.findById(row.id) : null;
  }

  async findLatestPublished(programId: string, entryRoute: string): Promise<Requirement | null> {
    const [row] = await this.db
      .select({ id: requirements.id })
      .from(requirements)
      .where(and(eq(requirements.programId, programId), eq(requirements.entryRoute, entryRoute), eq(requirements.reviewStatus, 'published')))
      .orderBy(desc(requirements.versionNo))
      .limit(1);
    return row ? this.findById(row.id) : null;
  }

  async programExists(programId: string): Promise<boolean> {
    const [row] = await this.db.select({ id: programs.id }).from(programs).where(eq(programs.id, programId)).limit(1);
    return !!row;
  }

  async subjectQualifications(ids: string[]): Promise<Map<string, string>> {
    if (ids.length === 0) return new Map();
    const rows = await this.db.select({ id: subjects.id, qualification: subjects.qualification }).from(subjects).where(inArray(subjects.id, ids));
    return new Map(rows.map((r) => [r.id, r.qualification]));
  }

  private toDomain(row: RequirementRow, rules: RuleRow[]): Requirement {
    return Requirement.restore(row.id, {
      programId: row.programId,
      entryRoute: row.entryRoute,
      versionNo: row.versionNo,
      sourceId: row.sourceId,
      sourceUrl: row.sourceUrl,
      preparedBy: row.preparedBy,
      approvedBy: row.approvedBy,
      status: row.reviewStatus as ReviewStatus,
      returnReason: row.returnReason,
      rules: rules.map((r) => ({
        id: r.id,
        groupNo: r.groupNo,
        ruleType: r.ruleType,
        subjectId: r.subjectId,
        minGrade: r.minGrade,
        minValue: r.minValue === null ? null : Number(r.minValue),
        evidenceQuote: r.evidenceQuote,
      })),
    });
  }
}
