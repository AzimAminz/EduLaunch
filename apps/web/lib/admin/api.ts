import 'server-only';
import { EntryRoutes, InstitutionSourceKinds, InstitutionTypes, MalaysianStates, RuleType, StudyLevel, StudyModes } from '@edulaunch/contracts';
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
  /** `institution`: a delete waiting for another admin's approval. */
  kind: z.enum(['programme', 'requirement', 'institution']),
  id: z.uuid(),
  programmeId: z.uuid().nullable(),
  institutionId: z.uuid().nullable(),
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

export interface ProgrammeQuery {
  query?: string;
  status?: ReviewStatus;
  institutionId?: string;
  /** Published programmes without any published requirement. */
  missingRequirements?: boolean;
  page?: number;
}

export function listProgrammes(token: string, q: ProgrammeQuery) {
  const params = new URLSearchParams();
  if (q.query) params.set('q', q.query);
  if (q.status) params.set('status', q.status);
  if (q.institutionId) params.set('institutionId', q.institutionId);
  if (q.missingRequirements) params.set('missingRequirements', 'true');
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

/** The standard details every programme has (as JPT and university prospectuses publish them). */
const ProgrammeFacts = z.object({
  upuCode: z.string().nullable(),
  internalCode: z.string().nullable(),
  faculty: z.string().nullable(),
  necCode: z.string().nullable(),
  studyMode: z.enum(StudyModes).nullable(),
  campus: z.string().nullable(),
  hasInterview: z.boolean(),
  isStem: z.boolean(),
  isTvet: z.boolean(),
  bumiputeraOnly: z.boolean(),
  sourceUrl: z.string().nullable(),
});
export type ProgrammeFacts = z.infer<typeof ProgrammeFacts>;

const ProgrammeDetail = ProgrammeFacts.extend({
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
  state: (typeof MalaysianStates)[number] | null;
}

export const createInstitution = (token: string, body: InstitutionBody) => call(token, '/institutions', Saved, send(body));
export type DeletionAction = { action: 'request'; confirm: string } | { action: 'approve' | 'cancel' };
export const institutionDeletion = (token: string, id: string, body: DeletionAction) =>
  call(token, `/institutions/${encodeURIComponent(id)}/deletion`, z.object({ status: z.enum(['deleted', 'requested', 'cancelled']) }), send(body));
export const addInstitutionSource = (token: string, id: string, body: { kind: (typeof InstitutionSourceKinds)[number]; url: string; label: string | null }) =>
  call(token, `/institutions/${encodeURIComponent(id)}/sources`, Saved, send(body));
export const removeInstitutionSource = (token: string, id: string, sourceId: string) =>
  call(token, `/institutions/${encodeURIComponent(id)}/sources/${encodeURIComponent(sourceId)}`, z.undefined(), { method: 'DELETE' });
export const updateInstitution = (token: string, id: string, body: InstitutionBody) => call(token, `/institutions/${encodeURIComponent(id)}`, Saved, send(body, 'PATCH'));

export type ProgrammeBody = ProgrammeFacts & {
  name: string;
  durationSemesters: number | null;
  fieldIds: string[];
};

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

const AdminInstitution = z.object({
  id: z.uuid(),
  name: z.string(),
  shortName: z.string().nullable(),
  type: z.string(),
  websiteUrl: z.string().nullable(),
  state: z.string().nullable(),
  deletionRequestedBy: z.uuid().nullable(),
  programmes: z.number(),
  published: z.number(),
  open: z.number(),
});
export type AdminInstitution = z.infer<typeof AdminInstitution>;

const InstitutionDetail = AdminInstitution.extend({
  archived: z.number(),
  withoutRequirements: z.number(),
  deletionRequestedAt: z.coerce.date().nullable(),
  sources: z.array(z.object({ id: z.uuid(), kind: z.enum(InstitutionSourceKinds), url: z.string(), label: z.string().nullable() })),
  impact: z.object({ programmes: z.number(), published: z.number(), requirements: z.number(), admissionStats: z.number(), pathways: z.number(), sources: z.number() }),
});
export type InstitutionDetail = z.infer<typeof InstitutionDetail>;

export const getInstitutionDetail = (token: string, id: string) => call(token, `/admin/institutions/${encodeURIComponent(id)}`, InstitutionDetail);

const NecField = z.object({ code: z.string(), name: z.string(), fieldId: z.uuid().nullable() });
export type NecField = z.infer<typeof NecField>;
export const listNecFields = (token: string) => call(token, '/admin/nec-fields', z.array(NecField));

/** Institutions with how many programmes each has (all, published, not yet published). */
export const listAdminInstitutions = (token: string) => call(token, '/admin/institutions', z.array(AdminInstitution));

/** Institutions with their website, read fresh (the student pages cache the same list for a few minutes). */
export const listInstitutions = (token: string) =>
  call(token, '/institutions', z.array(z.object({ id: z.uuid(), name: z.string(), shortName: z.string().nullable(), type: z.string(), websiteUrl: z.string().nullable().default(null) })));
