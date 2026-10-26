import { Inject, Injectable } from '@nestjs/common';
import { DRIZZLE, type Database } from '@edulaunch/nest-kit';
import type { Page } from '@edulaunch/ddd';
import { and, count, eq, ilike, inArray, type SQL } from 'drizzle-orm';
import * as schema from '../../../infrastructure/db/schema.js';
import { Program, type PendingChange, type PendingStatus, type ProgramFacts } from '../domain/program.js';
import { ProgramRepository, type ProgramSearch } from '../domain/program.repository.js';

const { programs, programFields, institutions, fields, necFields } = schema;

/** The pending change of a published programme, spread over its four columns (all null when there is none). */
const pendingColumns = (p: PendingChange | null) => ({
  pendingChanges: p?.details ?? null,
  pendingStatus: p?.status ?? null,
  pendingPreparedBy: p?.preparedBy ?? null,
  pendingReturnReason: p?.returnReason ?? null,
});

const facts = (p: ProgramFacts): ProgramFacts => ({
  upuCode: p.upuCode,
  internalCode: p.internalCode,
  faculty: p.faculty,
  necCode: p.necCode,
  studyMode: p.studyMode,
  campus: p.campus,
  hasInterview: p.hasInterview,
  isStem: p.isStem,
  isTvet: p.isTvet,
  bumiputeraOnly: p.bumiputeraOnly,
  sourceUrl: p.sourceUrl,
});

@Injectable()
export class DrizzleProgramRepository extends ProgramRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database<typeof schema>) {
    super();
  }

  async findById(id: string): Promise<Program | null> {
    const [row] = await this.db.select().from(programs).where(eq(programs.id, id)).limit(1);
    if (!row) return null;
    const fieldRows = await this.db.select({ fieldId: programFields.fieldId }).from(programFields).where(eq(programFields.programId, id)).orderBy(programFields.fieldId);
    return this.toDomain(row, fieldRows.map((f) => f.fieldId));
  }

  async search(c: ProgramSearch): Promise<Page<Program>> {
    const filters: SQL[] = [];
    if (c.onlyPublished) filters.push(eq(programs.publishStatus, 'published'));
    if (c.query) filters.push(ilike(programs.name, `%${c.query}%`));
    if (c.institutionId) filters.push(eq(programs.institutionId, c.institutionId));
    if (c.studyLevel) filters.push(eq(programs.studyLevel, c.studyLevel));
    if (c.fieldId) {
      const inField = this.db.select({ id: programFields.programId }).from(programFields).where(eq(programFields.fieldId, c.fieldId));
      filters.push(inArray(programs.id, inField));
    }
    const where = filters.length ? and(...filters) : undefined;

    const [rows, [total]] = await Promise.all([
      this.db.select().from(programs).where(where).orderBy(programs.name).limit(c.pageSize).offset((c.page - 1) * c.pageSize),
      this.db.select({ value: count() }).from(programs).where(where),
    ]);
    const fieldRows = rows.length
      ? await this.db.select().from(programFields).where(inArray(programFields.programId, rows.map((r) => r.id)))
      : [];
    const items = rows.map((r) => this.toDomain(r, fieldRows.filter((f) => f.programId === r.id).map((f) => f.fieldId)));
    return { items, total: total?.value ?? 0, page: c.page, pageSize: c.pageSize };
  }

  async save(program: Program): Promise<void> {
    const s = program.toSnapshot();
    await this.db.transaction(async (tx) => {
      await tx
        .insert(programs)
        .values({
          id: s.id,
          institutionId: s.institutionId,
          name: s.name,
          studyLevel: s.studyLevel,
          durationSemesters: s.durationSemesters,
          publishStatus: s.publishStatus,
          preparedBy: s.preparedBy,
          approvedBy: s.approvedBy,
          returnReason: s.returnReason,
          ...facts(s),
          ...pendingColumns(s.pending),
        })
        .onConflictDoUpdate({
          target: programs.id,
          set: {
            ...facts(s),
            ...pendingColumns(s.pending),
            // A draft may still move to another institution or level.
            institutionId: s.institutionId,
            studyLevel: s.studyLevel,
            name: s.name,
            durationSemesters: s.durationSemesters,
            publishStatus: s.publishStatus,
            preparedBy: s.preparedBy,
            approvedBy: s.approvedBy,
            returnReason: s.returnReason,
            updatedAt: new Date(),
          },
        });
      await tx.delete(programFields).where(eq(programFields.programId, s.id));
      if (s.fieldIds.length) await tx.insert(programFields).values(s.fieldIds.map((fieldId) => ({ programId: s.id, fieldId })));
    });
  }

  async delete(id: string): Promise<void> {
    await this.db.delete(programs).where(eq(programs.id, id));
  }

  async institutionExists(id: string): Promise<boolean> {
    const [row] = await this.db.select({ id: institutions.id }).from(institutions).where(eq(institutions.id, id)).limit(1);
    return !!row;
  }

  async necCodeExists(code: string): Promise<boolean> {
    const [row] = await this.db.select({ code: necFields.code }).from(necFields).where(eq(necFields.code, code)).limit(1);
    return !!row;
  }

  async upuCodeTaken(code: string, exceptId: string | null): Promise<boolean> {
    const rows = await this.db.select({ id: programs.id }).from(programs).where(eq(programs.upuCode, code));
    return rows.some((r) => r.id !== exceptId);
  }

  async existingFieldIds(ids: string[]): Promise<string[]> {
    if (ids.length === 0) return [];
    const rows = await this.db.select({ id: fields.id }).from(fields).where(inArray(fields.id, ids));
    return rows.map((r) => r.id);
  }

  private toDomain(row: typeof programs.$inferSelect, fieldIds: string[]): Program {
    return Program.restore(row.id, {
      institutionId: row.institutionId,
      name: row.name,
      studyLevel: row.studyLevel,
      durationSemesters: row.durationSemesters,
      fieldIds,
      publishStatus: row.publishStatus,
      preparedBy: row.preparedBy,
      approvedBy: row.approvedBy,
      returnReason: row.returnReason,
      ...facts({ ...row, studyMode: row.studyMode as ProgramFacts['studyMode'] }),
      pending:
        row.pendingChanges && row.pendingStatus && row.pendingPreparedBy
          ? {
              details: row.pendingChanges as PendingChange['details'],
              status: row.pendingStatus as PendingStatus,
              preparedBy: row.pendingPreparedBy,
              returnReason: row.pendingReturnReason,
            }
          : null,
    });
  }
}
