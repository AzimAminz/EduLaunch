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
const call = <T extends z.ZodType>(token: string, path: string, schema: T, init: RequestInit = {}) => callService('catalogue', token, path, schema, init);

/** Calls a service ('catalogue' or 'content') through the gateway as the signed-in admin. Never cached. */
async function callService<T extends z.ZodType>(service: 'catalogue' | 'content', token: string, path: string, schema: T, init: RequestInit = {}): Promise<z.infer<T>> {
  let res: Response;
  try {
    res = await fetchService(service, token, path, init);
  } catch {
    // The gateway (or the service behind it) did not answer at all.
    throw new AdminApiError('service_unavailable', 503, `The ${service} service did not answer for ${path}`);
  }
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { code?: string; message?: string } | null;
    throw new AdminApiError(body?.code ?? (res.status >= 502 ? 'service_unavailable' : 'generic'), res.status, body?.message ?? `Request failed (${res.status}) for ${path}`);
  }
  if (res.status === 204) return undefined as z.infer<T>;
  return schema.parse(await res.json());
}

const fetchService = (service: 'catalogue' | 'content', token: string, path: string, init: RequestInit) =>
  fetch(`${GATEWAY_URL}/api/${service}${path}`, {
    ...init,
    headers: { accept: 'application/json', 'content-type': 'application/json', authorization: `Bearer ${token}` },
    cache: 'no-store',
  });

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
  /** A change to a published programme, not a new one. */
  isChange: z.boolean().default(false),
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
  pendingStatus: z.enum(['draft', 'in_review', 'returned']).nullable().default(null),
  updatedAt: z.coerce.date(),
  publishedRoutes: z.array(z.string()),
  openDrafts: z.number(),
});
export type ProgrammeRow = z.infer<typeof ProgrammeRow>;

export const ProgrammeSorts = ['name', 'institution', 'level', 'status', 'updated'] as const;
export type ProgrammeSort = (typeof ProgrammeSorts)[number];

export interface ProgrammeQuery {
  query?: string;
  status?: ReviewStatus;
  institutionId?: string;
  /** Published programmes without any published requirement. */
  missingRequirements?: boolean;
  sort?: ProgrammeSort;
  direction?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}

export function listProgrammes(token: string, q: ProgrammeQuery) {
  const params = new URLSearchParams();
  if (q.query) params.set('q', q.query);
  if (q.status) params.set('status', q.status);
  if (q.institutionId) params.set('institutionId', q.institutionId);
  if (q.missingRequirements) params.set('missingRequirements', 'true');
  if (q.sort) params.set('sort', q.sort);
  if (q.direction) params.set('direction', q.direction);
  params.set('page', String(q.page ?? 1));
  params.set('pageSize', String(q.pageSize ?? 20));
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

/** The whole proposed version of a published programme, waiting for another admin. */
const PendingDetails = ProgrammeFacts.extend({
  institutionId: z.uuid().nullable(),
  name: z.string(),
  studyLevel: StudyLevel,
  durationSemesters: z.number().nullable(),
  fieldIds: z.array(z.uuid()),
});
export type PendingDetails = z.infer<typeof PendingDetails>;

const ProgrammeDetail = ProgrammeFacts.extend({
  pendingChanges: PendingDetails.nullable(),
  pendingStatus: z.enum(['draft', 'in_review', 'returned']).nullable(),
  pendingPreparedBy: z.uuid().nullable(),
  pendingReturnReason: z.string().nullable(),
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
  epanduanCode: string | null;
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
/** Institution and level only change while the programme has never been published. */
export const updateProgramme = (token: string, id: string, body: ProgrammeBody & { institutionId?: string | null; studyLevel?: z.infer<typeof StudyLevel> }) =>
  call(token, `/programmes/${encodeURIComponent(id)}`, Status, send(body, 'PATCH'));

export type ReviewAction = { action: 'submit' | 'approve' | 'withdraw' | 'discard' | 'archive' | 'reopen' } | { action: 'return'; reason: string };

export const deleteProgramme = (token: string, id: string) => call(token, `/programmes/${encodeURIComponent(id)}`, z.undefined(), { method: 'DELETE' });
export const reviewProgramme = (token: string, id: string, body: ReviewAction) => call(token, `/programmes/${encodeURIComponent(id)}/review`, Status, send(body));

export const createRequirementDraft = (token: string, body: { programId: string; entryRoute: string }) =>
  call(token, '/requirements', z.object({ id: z.uuid(), versionNo: z.number() }), send(body));
export const saveRequirementDraft = (token: string, id: string, body: { sourceUrl: string | null; rules: Array<Omit<AdminRule, 'evidenceQuote'> & { evidenceQuote: string }> }) =>
  call(token, `/requirements/${encodeURIComponent(id)}`, Status, send(body, 'PUT'));
export const reviewRequirement = (token: string, id: string, body: Exclude<ReviewAction, { action: 'archive' | 'reopen' | 'withdraw' | 'discard' }>) =>
  call(token, `/requirements/${encodeURIComponent(id)}/review`, Status, send(body));
export const discardRequirementDraft = (token: string, id: string) => call(token, `/requirements/${encodeURIComponent(id)}`, z.undefined(), { method: 'DELETE' });

const AdminInstitution = z.object({
  id: z.uuid(),
  name: z.string(),
  shortName: z.string().nullable(),
  type: z.string(),
  websiteUrl: z.string().nullable(),
  state: z.string().nullable(),
  epanduanCode: z.string().nullable(),
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

/** The average merit an official source published for one intake year. */
export const recordAverageMerit = (token: string, id: string, body: { intakeYear: number; averageMerit: number }) =>
  call(token, `/programmes/${encodeURIComponent(id)}/admission-stats`, z.undefined(), send(body, 'PUT'));

/** An institution's programmes with the values an import compares. */
const InstitutionProgramme = z.object({
  id: z.uuid(),
  upuCode: z.string().nullable(),
  name: z.string(),
  studyLevel: StudyLevel,
  durationSemesters: z.number().nullable(),
  necCode: z.string().nullable(),
  studyMode: z.enum(StudyModes).nullable(),
  campus: z.string().nullable(),
  hasInterview: z.boolean(),
  isStem: z.boolean(),
  isTvet: z.boolean(),
  bumiputeraOnly: z.boolean(),
  sourceUrl: z.string().nullable(),
  status: ReviewStatus,
  pendingStatus: z.enum(['draft', 'in_review', 'returned']).nullable(),
});
export type InstitutionProgramme = z.infer<typeof InstitutionProgramme>;
export const listInstitutionProgrammes = (token: string, id: string) =>
  call(token, `/admin/institutions/${encodeURIComponent(id)}/programmes`, z.array(InstitutionProgramme));

/** A candidate category a programme is listed under on ePanduan, with that category's general requirements. */
const FoundCategory = z.object({
  jenprog: z.string(),
  category: z.string(),
  route: z.string().nullable(),
  generalRequirements: z.string().nullable(),
});
export type FoundCategory = z.infer<typeof FoundCategory>;

/** One programme as ePanduan lists it (plain cleaned values from the content service). */
const FoundProgramme = z.object({
  code: z.string(),
  name: z.string(),
  institutionName: z.string().nullable(),
  year: z.number().nullable(),
  merit: z.number().nullable(),
  level: StudyLevel.nullable(),
  levelText: z.string().nullable(),
  studyMode: z.enum(StudyModes).nullable(),
  durationSemesters: z.number().nullable(),
  necCode: z.string().nullable(),
  necName: z.string().nullable(),
  hasInterview: z.boolean().nullable(),
  isStem: z.boolean(),
  isTvet: z.boolean(),
  bumiputeraOnly: z.boolean(),
  feeder: z.boolean(),
  isNew: z.boolean().default(false),
  note: z.string().nullable(),
  campuses: z.array(z.string()),
  careers: z.string().nullable().default(null),
  fees: z.string().nullable().default(null),
  routes: z.array(z.string()),
  categories: z.array(FoundCategory).default([]),
  sourceUrl: z.string().nullable(),
});
export type FoundProgramme = z.infer<typeof FoundProgramme>;

const EpanduanRun = z.object({
  id: z.uuid(),
  institutionCode: z.string(),
  status: z.enum(['running', 'done', 'failed']),
  pagesRead: z.number(),
  currentCategory: z.string().nullable().default(null),
  found: z.number(),
  error: z.string().nullable(),
  startedAt: z.coerce.date(),
  finishedAt: z.coerce.date().nullable(),
  programmes: z.array(FoundProgramme),
});
export type EpanduanRun = z.infer<typeof EpanduanRun>;

/** Starts reading one institution's programmes from ePanduan (it takes a minute or two). */
export const startEpanduanRun = (token: string, institutionCode: string) =>
  callService('content', token, '/epanduan/runs', z.object({ id: z.uuid(), status: z.string() }), send({ institutionCode }));
export const latestEpanduanRun = (token: string, institutionCode: string) =>
  callService('content', token, `/epanduan/runs/latest?institutionCode=${encodeURIComponent(institutionCode)}`, z.object({ run: EpanduanRun.nullable() }));

/** Syarat Khas read from ePanduan for a programme in one category (pending while being read). */
const SpecialRequirement = z.object({
  code: z.string(),
  jenprog: z.string(),
  category: z.string(),
  status: z.enum(['pending', 'done', 'failed']),
  text: z.string().nullable(),
  error: z.string().nullable(),
  readAt: z.coerce.date().nullable(),
});
export type SpecialRequirement = z.infer<typeof SpecialRequirement>;

/** Starts reading Syarat Khas for accepted programmes (every category each one is listed under). */
export const readSpecialRequirements = (token: string, institutionCode: string, codes: string[]) =>
  callService('content', token, '/epanduan/requirements', z.object({ pending: z.number() }), send({ institutionCode, codes }));
export const listSpecialRequirements = (token: string, codes: string[]) =>
  codes.length ? callService('content', token, `/epanduan/requirements?codes=${encodeURIComponent(codes.join(','))}`, z.array(SpecialRequirement)) : Promise.resolve([]);
/** Programmes as the latest ePanduan read of their institution found them, by programme code. */
export const listFoundProgrammes = (token: string, codes: string[]) =>
  codes.length ? callService('content', token, `/epanduan/found?codes=${encodeURIComponent(codes.join(','))}`, z.array(FoundProgramme)) : Promise.resolve([]);
