import 'server-only';
import { EntryRoutes, InstitutionTypes, RuleType, StudyLevel } from '@edulaunch/contracts';
import { z } from 'zod';

const GATEWAY_URL = process.env.GATEWAY_URL ?? 'http://127.0.0.1:4000';

/** A refusal from the catalogue service, by its error code (forbidden, draft_exists, invalid_rule…). */
export class AdminApiError extends Error {
  constructor(
    public readonly code: string,
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

/** Calls the catalogue service through the gateway as the signed-in admin. Never cached. */
async function call<T extends z.ZodType>(token: string, path: string, schema: T, init: RequestInit = {}): Promise<z.infer<T>> {
  const res = await fetch(`${GATEWAY_URL}/api/catalogue${path}`, {
    ...init,
    headers: { accept: 'application/json', 'content-type': 'application/json', authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { code?: string; message?: string } | null;
    throw new AdminApiError(body?.code ?? 'generic', res.status, body?.message ?? `Catalogue request failed (${res.status}) for ${path}`);
  }
  if (res.status === 204) return undefined as z.infer<T>;
  return schema.parse(await res.json());
}

const send = (body: unknown, method = 'POST'): RequestInit => ({ method, body: JSON.stringify(body) });

export const ReviewStatus = z.enum(['draft', 'in_review', 'returned', 'published', 'archived']);
export type ReviewStatus = z.infer<typeof ReviewStatus>;

const Task = z.object({
  kind: z.enum(['programme', 'requirement']),
  id: z.uuid(),
  programmeId: z.uuid(),
  programmeName: z.string(),
  institutionName: z.string().nullable(),
  entryRoute: z.string().nullable(),
  versionNo: z.number().nullable(),
  status: ReviewStatus,
  preparedBy: z.string().nullable(),
  returnReason: z.string().nullable(),
  updatedAt: z.coerce.date(),
});
export type AdminTask = z.infer<typeof Task>;

const Tasks = z.object({
  toReview: z.array(Task),
  returned: z.array(Task),
  myDrafts: z.array(Task),
  waiting: z.array(Task),
  counts: z.object({ published: z.number(), withoutRequirements: z.number() }),
});
export type AdminTasks = z.infer<typeof Tasks>;

export const getTasks = (token: string) => call(token, '/admin/tasks', Tasks);

const ProgrammeRow = z.object({
  id: z.uuid(),
  name: z.string(),
  studyLevel: StudyLevel,
  institutionName: z.string().nullable(),
  status: ReviewStatus,
  updatedAt: z.coerce.date(),
  publishedRoutes: z.array(z.string()),
  openDrafts: z.number(),
});
export type ProgrammeRow = z.infer<typeof ProgrammeRow>;

export function listProgrammes(token: string, q: { query?: string; status?: ReviewStatus; page?: number }) {
  const params = new URLSearchParams();
  if (q.query) params.set('q', q.query);
  if (q.status) params.set('status', q.status);
  params.set('page', String(q.page ?? 1));
  params.set('pageSize', '50');
  return call(token, `/admin/programmes?${params}`, z.object({ items: z.array(ProgrammeRow), total: z.number(), page: z.number(), pageSize: z.number() }));
}

const RequirementVersion = z.object({
  id: z.uuid(),
  entryRoute: z.string(),
  versionNo: z.number(),
  status: ReviewStatus,
  preparedBy: z.uuid(),
  updatedAt: z.coerce.date(),
});
export type RequirementVersion = z.infer<typeof RequirementVersion>;

const ProgrammeDetail = z.object({
  id: z.uuid(),
  name: z.string(),
  studyLevel: StudyLevel,
  durationSemesters: z.number().nullable(),
  institutionId: z.uuid().nullable(),
  institutionName: z.string().nullable(),
  status: ReviewStatus,
  preparedBy: z.uuid().nullable(),
  approvedBy: z.uuid().nullable(),
  returnReason: z.string().nullable(),
  updatedAt: z.coerce.date(),
  fieldIds: z.array(z.uuid()),
  requirements: z.array(RequirementVersion),
});
export type ProgrammeDetail = z.infer<typeof ProgrammeDetail>;

export const getProgrammeDetail = (token: string, id: string) => call(token, `/admin/programmes/${encodeURIComponent(id)}`, ProgrammeDetail);

export const AdminRule = z.object({
  groupNo: z.number(),
  ruleType: RuleType,
  subjectId: z.uuid().nullable(),
  minGrade: z.string().nullable(),
  minValue: z.number().nullable(),
  evidenceQuote: z.string().nullable(),
});
export type AdminRule = z.infer<typeof AdminRule>;

const RequirementDetail = z.object({
  id: z.uuid(),
  programmeId: z.uuid(),
  programmeName: z.string(),
  studyLevel: StudyLevel,
  institutionName: z.string().nullable(),
  entryRoute: z.enum(EntryRoutes),
  versionNo: z.number(),
  status: ReviewStatus,
  preparedBy: z.uuid(),
  approvedBy: z.uuid().nullable(),
  returnReason: z.string().nullable(),
  sourceUrl: z.string().nullable(),
  updatedAt: z.coerce.date(),
  rules: z.array(AdminRule),
  previous: z.object({ versionNo: z.number(), sourceUrl: z.string().nullable(), rules: z.array(AdminRule) }).nullable(),
});
export type RequirementDetail = z.infer<typeof RequirementDetail>;

export const getRequirementDetail = (token: string, id: string) => call(token, `/admin/requirements/${encodeURIComponent(id)}`, RequirementDetail);

const Saved = z.object({ id: z.uuid() });
const Status = z.object({ status: z.string() });

export interface InstitutionBody {
  name: string;
  shortName: string | null;
  type: (typeof InstitutionTypes)[number];
  websiteUrl: string | null;
}

export const createInstitution = (token: string, body: InstitutionBody) => call(token, '/institutions', Saved, send(body));
export const deleteInstitution = (token: string, id: string) => call(token, `/institutions/${encodeURIComponent(id)}`, z.undefined(), { method: 'DELETE' });
export const updateInstitution = (token: string, id: string, body: InstitutionBody) => call(token, `/institutions/${encodeURIComponent(id)}`, Saved, send(body, 'PATCH'));

export interface ProgrammeBody {
  name: string;
  durationSemesters: number | null;
  fieldIds: string[];
}

export const createProgramme = (token: string, body: ProgrammeBody & { institutionId: string | null; studyLevel: z.infer<typeof StudyLevel> }) =>
  call(token, '/programmes', Saved, send(body));
export const updateProgramme = (token: string, id: string, body: ProgrammeBody) => call(token, `/programmes/${encodeURIComponent(id)}`, Status, send(body, 'PATCH'));

export type ReviewAction = { action: 'submit' | 'approve' | 'archive' | 'reopen' } | { action: 'return'; reason: string };

export const reviewProgramme = (token: string, id: string, body: ReviewAction) => call(token, `/programmes/${encodeURIComponent(id)}/review`, Status, send(body));

export const createRequirementDraft = (token: string, body: { programId: string; entryRoute: string }) =>
  call(token, '/requirements', z.object({ id: z.uuid(), versionNo: z.number() }), send(body));
export const saveRequirementDraft = (token: string, id: string, body: { sourceUrl: string | null; rules: Array<Omit<AdminRule, 'evidenceQuote'> & { evidenceQuote: string }> }) =>
  call(token, `/requirements/${encodeURIComponent(id)}`, Status, send(body, 'PUT'));
export const reviewRequirement = (token: string, id: string, body: Exclude<ReviewAction, { action: 'archive' | 'reopen' }>) =>
  call(token, `/requirements/${encodeURIComponent(id)}/review`, Status, send(body));
export const discardRequirementDraft = (token: string, id: string) => call(token, `/requirements/${encodeURIComponent(id)}`, z.undefined(), { method: 'DELETE' });

/** Institutions with their website, read fresh (the student pages cache the same list for a few minutes). */
export const listInstitutions = (token: string) =>
  call(token, '/institutions', z.array(z.object({ id: z.uuid(), name: z.string(), shortName: z.string().nullable(), type: z.string(), websiteUrl: z.string().nullable().default(null) })));
