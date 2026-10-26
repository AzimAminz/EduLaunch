import { Controller, Get, Inject, Injectable, Module, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { NotFoundError } from '@edulaunch/ddd';
import { CurrentCaller, DRIZZLE, Roles, ZodPipe, type Caller, type Database } from '@edulaunch/nest-kit';
import { and, asc, count, desc, eq, ilike, inArray, isNotNull, ne, notExists, or, type SQL } from 'drizzle-orm';
import { z } from 'zod';
import * as schema from '../../infrastructure/db/schema.js';

const { programs, institutions, institutionSources, programFields, programPathways, admissionStats, requirements, requirementRules, necFields } = schema;

type Status = (typeof schema.reviewStatus.enumValues)[number];
const OPEN: Status[] = ['draft', 'returned', 'in_review'];

export interface AdminTask {
  kind: 'programme' | 'requirement' | 'institution';
  id: string;
  /** Null for institution tasks (a delete waiting for approval). */
  programmeId: string | null;
  institutionId: string | null;
  programmeName: string;
  institutionName: string | null;
  entryRoute: string | null;
  versionNo: number | null;
  status: Status;
  preparedBy: string | null;
  returnReason: string | null;
  updatedAt: Date;
  /** A change to a published programme (students still see the published version). */
  isChange: boolean;
}

/**
 * Read side of the admin console (no business rules, so no domain layer): what is waiting for whom,
 * programme lists with their requirement versions, and one requirement next to the version it replaces.
 */
@Injectable()
export class AdminQueries {
  constructor(@Inject(DRIZZLE) private readonly db: Database<typeof schema>) {}

  /** Everything not yet published, as tasks for the signed-in admin. */
  async tasks(adminId: string) {
    const [programmeRows, changeRows, requirementRows, deletionRows] = await Promise.all([
      this.db
        .select({
          id: programs.id,
          institutionId: programs.institutionId,
          programmeName: programs.name,
          institutionName: institutions.name,
          status: programs.publishStatus,
          preparedBy: programs.preparedBy,
          returnReason: programs.returnReason,
          updatedAt: programs.updatedAt,
        })
        .from(programs)
        .leftJoin(institutions, eq(institutions.id, programs.institutionId))
        .where(inArray(programs.publishStatus, OPEN)),
      this.db
        .select({
          id: programs.id,
          institutionId: programs.institutionId,
          programmeName: programs.name,
          institutionName: institutions.name,
          status: programs.pendingStatus,
          preparedBy: programs.pendingPreparedBy,
          returnReason: programs.pendingReturnReason,
          updatedAt: programs.updatedAt,
        })
        .from(programs)
        .leftJoin(institutions, eq(institutions.id, programs.institutionId))
        .where(isNotNull(programs.pendingStatus)),
      this.db
        .select({
          id: requirements.id,
          programmeId: requirements.programId,
          institutionId: programs.institutionId,
          programmeName: programs.name,
          institutionName: institutions.name,
          entryRoute: requirements.entryRoute,
          versionNo: requirements.versionNo,
          status: requirements.reviewStatus,
          preparedBy: requirements.preparedBy,
          returnReason: requirements.returnReason,
          updatedAt: requirements.updatedAt,
        })
        .from(requirements)
        .innerJoin(programs, eq(programs.id, requirements.programId))
        .leftJoin(institutions, eq(institutions.id, programs.institutionId))
        .where(inArray(requirements.reviewStatus, OPEN)),
      this.db
        .select({ id: institutions.id, name: institutions.name, by: institutions.deletionRequestedBy, at: institutions.deletionRequestedAt })
        .from(institutions)
        .where(isNotNull(institutions.deletionRequestedBy)),
    ]);
    const all: AdminTask[] = [
      ...programmeRows.map((r) => ({ ...r, kind: 'programme' as const, programmeId: r.id, entryRoute: null, versionNo: null, isChange: false })),
      ...changeRows.map((r) => ({ ...r, status: r.status as Status, kind: 'programme' as const, programmeId: r.id, entryRoute: null, versionNo: null, isChange: true })),
      ...requirementRows.map((r) => ({ ...r, kind: 'requirement' as const, isChange: false })),
      // A delete of an institution that students can see waits for another admin, like a draft.
      ...deletionRows.map((r) => ({
        kind: 'institution' as const,
        id: r.id,
        programmeId: null,
        institutionId: r.id,
        programmeName: r.name,
        institutionName: null,
        entryRoute: null,
        versionNo: null,
        status: 'in_review' as const,
        preparedBy: r.by,
        returnReason: null,
        updatedAt: r.at ?? new Date(),
        isChange: false,
      })),
    ].sort((a, b) => a.updatedAt.getTime() - b.updatedAt.getTime());

    const mine = (t: AdminTask) => t.preparedBy === adminId;
    const [published, withoutRequirements] = await Promise.all([
      this.db.select({ n: count() }).from(programs).where(eq(programs.publishStatus, 'published')),
      this.db
        .select({ n: count() })
        .from(programs)
        .where(
          and(
            eq(programs.publishStatus, 'published'),
            notExists(this.db.select({ id: requirements.id }).from(requirements).where(and(eq(requirements.programId, programs.id), eq(requirements.reviewStatus, 'published')))),
          ),
        ),
    ]);
    return {
      // Oldest first: the longest waiting comes first.
      toReview: all.filter((t) => t.status === 'in_review' && !mine(t)),
      returned: all.filter((t) => t.status === 'returned' && mine(t)),
      myDrafts: all.filter((t) => t.status === 'draft' && (mine(t) || t.preparedBy === null)),
      waiting: all.filter((t) => t.status === 'in_review' && mine(t)),
      counts: { published: published[0]?.n ?? 0, withoutRequirements: withoutRequirements[0]?.n ?? 0 },
    };
  }

  async programmes(q: {
    query?: string;
    status?: Status;
    institutionId?: string;
    missingRequirements?: boolean;
    sort?: ProgrammeSort;
    direction?: 'asc' | 'desc';
    page: number;
    pageSize: number;
  }) {
    const filters: SQL[] = [];
    if (q.query) filters.push(or(ilike(programs.name, `%${q.query}%`), ilike(institutions.name, `%${q.query}%`))!);
    if (q.status) filters.push(eq(programs.publishStatus, q.status));
    if (q.institutionId) filters.push(eq(programs.institutionId, q.institutionId));
    // Programmes students can see but cannot be checked against: no published requirement on any route.
    if (q.missingRequirements) {
      filters.push(eq(programs.publishStatus, 'published'));
      filters.push(notExists(this.db.select({ id: requirements.id }).from(requirements).where(and(eq(requirements.programId, programs.id), eq(requirements.reviewStatus, 'published')))));
    }
    const where = filters.length ? and(...filters) : undefined;

    const [rows, [total]] = await Promise.all([
      this.db
        .select({
          id: programs.id,
          name: programs.name,
          studyLevel: programs.studyLevel,
          institutionName: institutions.name,
          status: programs.publishStatus,
          pendingStatus: programs.pendingStatus,
          updatedAt: programs.updatedAt,
        })
        .from(programs)
        .leftJoin(institutions, eq(institutions.id, programs.institutionId))
        .where(where)
        // The chosen column first, then the name, so equal values keep a stable order across pages.
        .orderBy(...sortOrder(q.sort ?? 'name', q.direction ?? 'asc'))
        .limit(q.pageSize)
        .offset((q.page - 1) * q.pageSize),
      this.db.select({ value: count() }).from(programs).leftJoin(institutions, eq(institutions.id, programs.institutionId)).where(where),
    ]);
    const reqs = rows.length
      ? await this.db
          .select({ programId: requirements.programId, entryRoute: requirements.entryRoute, status: requirements.reviewStatus })
          .from(requirements)
          .where(and(inArray(requirements.programId, rows.map((r) => r.id)), ne(requirements.reviewStatus, 'archived')))
      : [];
    const items = rows.map((r) => {
      const mine = reqs.filter((x) => x.programId === r.id);
      return {
        ...r,
        publishedRoutes: [...new Set(mine.filter((x) => x.status === 'published').map((x) => x.entryRoute))].sort(),
        openDrafts: mine.filter((x) => OPEN.includes(x.status)).length,
      };
    });
    return { items, total: total?.value ?? 0, page: q.page, pageSize: q.pageSize };
  }

  /** Every institution with how many programmes it has, by status, for the institutions page. */
  async institutions() {
    const rows = await this.db
      .select({
        id: institutions.id,
        name: institutions.name,
        shortName: institutions.shortName,
        type: institutions.type,
        websiteUrl: institutions.websiteUrl,
        state: institutions.state,
        deletionRequestedBy: institutions.deletionRequestedBy,
        status: programs.publishStatus,
        n: count(programs.id),
      })
      .from(institutions)
      .leftJoin(programs, eq(programs.institutionId, institutions.id))
      .groupBy(institutions.id, programs.publishStatus)
      .orderBy(institutions.name);
    type Item = {
      id: string;
      name: string;
      shortName: string | null;
      type: string;
      websiteUrl: string | null;
      state: string | null;
      deletionRequestedBy: string | null;
      programmes: number;
      published: number;
      open: number;
    };
    const byId = new Map<string, Item>();
    for (const r of rows) {
      const { status: _status, n: _n, ...base } = r;
      const item = byId.get(r.id) ?? { ...base, programmes: 0, published: 0, open: 0 };
      if (r.status) {
        item.programmes += r.n;
        if (r.status === 'published') item.published += r.n;
        if (OPEN.includes(r.status)) item.open += r.n;
      }
      byId.set(r.id, item);
    }
    return [...byId.values()];
  }

  /** One institution for its profile: details, programme counts, official sources and what deleting it would remove. */
  async institution(id: string) {
    const summary = (await this.institutions()).find((i) => i.id === id);
    if (!summary) throw new NotFoundError('Institution', id);
    const inInstitution = this.db.select({ id: programs.id }).from(programs).where(eq(programs.institutionId, id));
    const [sources, [withoutRequirements], [reqs], [stats], [paths], [requested]] = await Promise.all([
      this.db.select().from(institutionSources).where(eq(institutionSources.institutionId, id)).orderBy(institutionSources.createdAt),
      this.db
        .select({ n: count() })
        .from(programs)
        .where(
          and(
            eq(programs.institutionId, id),
            eq(programs.publishStatus, 'published'),
            notExists(this.db.select({ id: requirements.id }).from(requirements).where(and(eq(requirements.programId, programs.id), eq(requirements.reviewStatus, 'published')))),
          ),
        ),
      this.db.select({ n: count() }).from(requirements).where(inArray(requirements.programId, inInstitution)),
      this.db.select({ n: count() }).from(admissionStats).where(inArray(admissionStats.programId, inInstitution)),
      this.db
        .select({ n: count() })
        .from(programPathways)
        .where(or(inArray(programPathways.fromProgramId, inInstitution), inArray(programPathways.toProgramId, inInstitution))),
      this.db.select({ at: institutions.deletionRequestedAt }).from(institutions).where(eq(institutions.id, id)),
    ]);
    return {
      ...summary,
      archived: summary.programmes - summary.published - summary.open,
      withoutRequirements: withoutRequirements?.n ?? 0,
      deletionRequestedAt: requested?.at ?? null,
      sources: sources.map((s) => ({ id: s.id, kind: s.kind, url: s.url, label: s.label })),
      /** Everything a delete removes along with the institution. */
      impact: {
        programmes: summary.programmes,
        published: summary.published,
        requirements: reqs?.n ?? 0,
        admissionStats: stats?.n ?? 0,
        pathways: paths?.n ?? 0,
        sources: sources.length,
      },
    };
  }

  /** NEC fields for the programme form, each with the broad EduLaunch field it suggests. */
  necFields() {
    return this.db.select().from(necFields).orderBy(necFields.code);
  }

  async programme(id: string) {
    const [row] = await this.db
      .select({
        id: programs.id,
        name: programs.name,
        studyLevel: programs.studyLevel,
        durationSemesters: programs.durationSemesters,
        institutionId: programs.institutionId,
        institutionName: institutions.name,
        upuCode: programs.upuCode,
        internalCode: programs.internalCode,
        faculty: programs.faculty,
        necCode: programs.necCode,
        studyMode: programs.studyMode,
        campus: programs.campus,
        hasInterview: programs.hasInterview,
        isStem: programs.isStem,
        isTvet: programs.isTvet,
        bumiputeraOnly: programs.bumiputeraOnly,
        sourceUrl: programs.sourceUrl,
        pendingChanges: programs.pendingChanges,
        pendingStatus: programs.pendingStatus,
        pendingPreparedBy: programs.pendingPreparedBy,
        pendingReturnReason: programs.pendingReturnReason,
        status: programs.publishStatus,
        preparedBy: programs.preparedBy,
        approvedBy: programs.approvedBy,
        returnReason: programs.returnReason,
        updatedAt: programs.updatedAt,
      })
      .from(programs)
      .leftJoin(institutions, eq(institutions.id, programs.institutionId))
      .where(eq(programs.id, id))
      .limit(1);
    if (!row) throw new NotFoundError('Programme', id);
    const [fieldRows, versions] = await Promise.all([
      this.db.select({ fieldId: programFields.fieldId }).from(programFields).where(eq(programFields.programId, id)),
      this.db
        .select({
          id: requirements.id,
          entryRoute: requirements.entryRoute,
          versionNo: requirements.versionNo,
          status: requirements.reviewStatus,
          preparedBy: requirements.preparedBy,
          updatedAt: requirements.updatedAt,
        })
        .from(requirements)
        .where(eq(requirements.programId, id))
        .orderBy(requirements.entryRoute, desc(requirements.versionNo)),
    ]);
    return { ...row, fieldIds: fieldRows.map((f) => f.fieldId), requirements: versions };
  }

  /** One requirement version with its rules, and the published version it would replace (to compare). */
  async requirement(id: string) {
    const [row] = await this.db
      .select({
        id: requirements.id,
        programmeId: programs.id,
        programmeName: programs.name,
        studyLevel: programs.studyLevel,
        institutionName: institutions.name,
        entryRoute: requirements.entryRoute,
        versionNo: requirements.versionNo,
        status: requirements.reviewStatus,
        preparedBy: requirements.preparedBy,
        approvedBy: requirements.approvedBy,
        returnReason: requirements.returnReason,
        sourceUrl: requirements.sourceUrl,
        updatedAt: requirements.updatedAt,
      })
      .from(requirements)
      .innerJoin(programs, eq(programs.id, requirements.programId))
      .leftJoin(institutions, eq(institutions.id, programs.institutionId))
      .where(eq(requirements.id, id))
      .limit(1);
    if (!row) throw new NotFoundError('Requirement', id);
    const [previous] = await this.db
      .select({ id: requirements.id, versionNo: requirements.versionNo, sourceUrl: requirements.sourceUrl })
      .from(requirements)
      .where(and(eq(requirements.programId, row.programmeId), eq(requirements.entryRoute, row.entryRoute), eq(requirements.reviewStatus, 'published'), ne(requirements.id, id)))
      .orderBy(desc(requirements.versionNo))
      .limit(1);
    const ids = previous ? [id, previous.id] : [id];
    const rules = await this.db.select().from(requirementRules).where(inArray(requirementRules.requirementId, ids)).orderBy(requirementRules.groupNo, requirementRules.id);
    const plain = (requirementId: string) =>
      rules
        .filter((r) => r.requirementId === requirementId)
        .map((r) => ({ groupNo: r.groupNo, ruleType: r.ruleType, subjectId: r.subjectId, minGrade: r.minGrade, minValue: r.minValue === null ? null : Number(r.minValue), evidenceQuote: r.evidenceQuote }));
    return {
      ...row,
      rules: plain(id),
      previous: previous && previous.versionNo < row.versionNo ? { versionNo: previous.versionNo, sourceUrl: previous.sourceUrl, rules: plain(previous.id) } : null,
    };
  }
}

export const ProgrammeSorts = ['name', 'institution', 'level', 'status', 'updated'] as const;
export type ProgrammeSort = (typeof ProgrammeSorts)[number];

function sortOrder(sort: ProgrammeSort, direction: 'asc' | 'desc'): SQL[] {
  const dir = direction === 'desc' ? desc : asc;
  const column = { name: programs.name, institution: institutions.name, level: programs.studyLevel, status: programs.publishStatus, updated: programs.updatedAt }[sort];
  return sort === 'name' ? [dir(column)] : [dir(column), asc(programs.name)];
}

const ProgrammesQuery = z.object({
  q: z.string().trim().max(100).optional(),
  status: z.enum(schema.reviewStatus.enumValues).optional(),
  institutionId: z.uuid().optional(),
  missingRequirements: z.enum(['true', 'false']).transform((v) => v === 'true').optional(),
  sort: z.enum(ProgrammeSorts).optional(),
  direction: z.enum(['asc', 'desc']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(50),
});

@Controller('admin')
@Roles('admin')
export class AdminController {
  constructor(private readonly queries: AdminQueries) {}

  @Get('tasks')
  tasks(@CurrentCaller() caller: Caller) {
    return this.queries.tasks(caller.userId);
  }

  @Get('programmes')
  programmes(@Query(new ZodPipe(ProgrammesQuery)) q: z.infer<typeof ProgrammesQuery>) {
    return this.queries.programmes({
      query: q.q,
      status: q.status,
      institutionId: q.institutionId,
      missingRequirements: q.missingRequirements,
      sort: q.sort,
      direction: q.direction,
      page: q.page,
      pageSize: q.pageSize,
    });
  }

  @Get('institutions')
  institutions() {
    return this.queries.institutions();
  }

  @Get('institutions/:id')
  institution(@Param('id', ParseUUIDPipe) id: string) {
    return this.queries.institution(id);
  }

  @Get('nec-fields')
  necFields() {
    return this.queries.necFields();
  }

  @Get('programmes/:id')
  programme(@Param('id', ParseUUIDPipe) id: string) {
    return this.queries.programme(id);
  }

  @Get('requirements/:id')
  requirement(@Param('id', ParseUUIDPipe) id: string) {
    return this.queries.requirement(id);
  }
}

@Module({ controllers: [AdminController], providers: [AdminQueries] })
export class AdminModule {}
