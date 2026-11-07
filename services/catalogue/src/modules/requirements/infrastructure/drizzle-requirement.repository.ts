import { Inject, Injectable } from '@nestjs/common';
import { DRIZZLE, type Database } from '@edulaunch/nest-kit';
import { and, desc, eq, inArray, max } from 'drizzle-orm';
import * as schema from '../../../infrastructure/db/schema.js';
import { Requirement, type ReviewStatus } from '../domain/requirement.js';
import { RequirementRepository } from '../domain/requirement.repository.js';

const { requirements, requirementConditions, conditionSubjects, programs, subjects } = schema;
type RequirementRow = typeof requirements.$inferSelect;
type RuleRow = typeof requirementConditions.$inferSelect & { subjectIds: string[] };

/** Lines that name one subject (the rest name a list, or none). */
const ONE_SUBJECT = new Set(['min_grade', 'key_subject']);

@Injectable()
export class DrizzleRequirementRepository extends RequirementRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database<typeof schema>) {
    super();
  }

  async findById(id: string): Promise<Requirement | null> {
    const [row] = await this.db.select().from(requirements).where(eq(requirements.id, id)).limit(1);
    if (!row) return null;
    return this.toDomain(row, await this.conditionsOf([id]));
  }

  async findPublished(programIds: string[]): Promise<Requirement[]> {
    if (programIds.length === 0) return [];
    const rows = await this.db
      .selectDistinctOn([requirements.programId, requirements.entryRoute])
      .from(requirements)
      .where(and(inArray(requirements.programId, programIds), eq(requirements.reviewStatus, 'published')))
      .orderBy(requirements.programId, requirements.entryRoute, desc(requirements.versionNo));
    if (rows.length === 0) return [];
    const rules = await this.conditionsOf(rows.map((r) => r.id));
    return rows.map((r) => this.toDomain(r, rules.filter((x) => x.requirementId === r.id)));
  }

  /** The lines of these requirements in order, each with the subjects it names (condition_subject). */
  private async conditionsOf(requirementIds: string[]): Promise<RuleRow[]> {
    const rows = await this.db
      .select()
      .from(requirementConditions)
      .where(inArray(requirementConditions.requirementId, requirementIds))
      .orderBy(requirementConditions.orGroup, requirementConditions.position, requirementConditions.id);
    if (rows.length === 0) return [];
    const links = await this.db
      .select()
      .from(conditionSubjects)
      .where(inArray(conditionSubjects.conditionId, rows.map((r) => r.id)))
      .orderBy(conditionSubjects.position);
    return rows.map((r) => ({ ...r, subjectIds: links.filter((l) => l.conditionId === r.id).map((l) => l.subjectId) }));
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
          sourceCategory: s.sourceCategory,
          preparedBy: s.preparedBy,
          approvedBy: s.approvedBy,
          reviewStatus: s.status,
          returnReason: s.returnReason,
        })
        .onConflictDoUpdate({
          target: requirements.id,
          set: { sourceUrl: s.sourceUrl, sourceCategory: s.sourceCategory, approvedBy: s.approvedBy, reviewStatus: s.status, returnReason: s.returnReason, updatedAt: new Date() },
        });
      await tx.delete(requirementConditions).where(eq(requirementConditions.requirementId, s.id));
      if (s.rules.length) {
        await tx.insert(requirementConditions).values(
          s.rules.map((r) => ({
            id: r.id,
            requirementId: s.id,
            orGroup: r.orGroup,
            conditionType: r.conditionType,
            minGrade: r.minGrade,
            minValue: r.minValue === null ? null : String(r.minValue),
            officialText: r.officialText,
            part: r.part,
            section: r.section,
            minCount: r.minCount,
            position: r.position,
          })),
        );
        const links = s.rules.flatMap((r) => (r.subjectId ? [r.subjectId] : r.subjectIds).map((subjectId, position) => ({ conditionId: r.id, subjectId, position })));
        if (links.length) await tx.insert(conditionSubjects).values(links).onConflictDoNothing();
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
      sourceCategory: row.sourceCategory,
      preparedBy: row.preparedBy,
      approvedBy: row.approvedBy,
      status: row.reviewStatus as ReviewStatus,
      returnReason: row.returnReason,
      rules: rules.map((r) => ({
        id: r.id,
        orGroup: r.orGroup,
        conditionType: r.conditionType,
        subjectId: ONE_SUBJECT.has(r.conditionType) ? (r.subjectIds[0] ?? null) : null,
        minGrade: r.minGrade,
        minValue: r.minValue === null ? null : Number(r.minValue),
        officialText: r.officialText,
        part: r.part === 'general' ? 'general' : 'special',
        section: r.section,
        subjectIds: ONE_SUBJECT.has(r.conditionType) ? [] : r.subjectIds,
        minCount: r.minCount,
        position: r.position,
      })),
    });
  }
}
