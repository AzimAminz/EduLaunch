'use server';

import { EpanduanInstitutions, InstitutionSourceKinds, InstitutionTypes, MalaysianStates, StudyLevel, StudyModes, isEntryRoute } from '@edulaunch/contracts';
import { revalidatePath, updateTag } from 'next/cache';
import { redirect } from 'next/navigation';
import { isLocale, type Locale } from '../i18n/locale';
import { getAccount, getAccessToken } from '../supabase/server';
import * as api from './api';
import { acceptable, compareFound, draftFromFound, entryRoutesFromFound, onlyRoutesChanged, updateFromFound } from './epanduan-import';
import { checkLines, EditorState, type CheckedLines } from './requirement-form';

/** Error keys shown from `dict.admin.errors` (or a form's own `errors`). */
export type AdminErrorKey =
  | 'generic'
  | 'forbidden'
  | 'conflict'
  | 'draft_exists'
  | 'invalid_rule'
  | 'missing_evidence'
  | 'invalid_source'
  | 'invalid_program'
  | 'invalid_institution'
  | 'reason_required'
  | 'not_found'
  | 'confirmation_mismatch'
  | 'upu_code_taken'
  | 'run_in_progress'
  | 'service_unavailable'
  | 'noRules';

const KNOWN: readonly string[] = ['forbidden', 'conflict', 'draft_exists', 'invalid_rule', 'missing_evidence', 'invalid_source', 'invalid_program', 'invalid_institution', 'reason_required', 'not_found', 'confirmation_mismatch', 'upu_code_taken', 'run_in_progress', 'service_unavailable'];

export interface AdminFormState {
  /** A new time on every successful save, to show "Saved". */
  savedAt?: number;
  error?: AdminErrorKey;
  /** Field problems, by field name, as keys of the form's own `errors`. */
  fieldErrors?: Record<string, string>;
  /** Requirement editor: problems by line and rule. */
  problems?: CheckedLines['problems'];
  /** Institution delete: whether it was requested (waiting for another admin) or cancelled. */
  status?: 'requested' | 'cancelled';
  /** ePanduan import: how many found programmes became drafts or changes, and how many could not be saved. */
  imported?: { created: number; updated: number; failed: number };
}

const localeOf = (form: FormData): Locale => {
  const value = String(form.get('locale'));
  return isLocale(value) ? value : 'ms';
};

const text = (form: FormData, name: string) => String(form.get(name) ?? '').trim();

/** The signed-in admin's token. Anyone else goes to their own home (the proxy checks too). */
async function adminToken(locale: Locale): Promise<string> {
  const account = await getAccount();
  const token = await getAccessToken();
  if (!account || !token || account.role !== 'admin') redirect(`/${locale}`);
  return token;
}

function errorKey(err: unknown): AdminErrorKey {
  if (err instanceof api.AdminApiError && KNOWN.includes(err.code)) return err.code as AdminErrorKey;
  return 'generic';
}

/** Admin pages and the student pages that show catalogue data load again with the change. */
function refresh() {
  revalidatePath('/[lang]', 'layout');
}

export async function saveInstitution(_prev: AdminFormState, form: FormData): Promise<AdminFormState> {
  const locale = localeOf(form);
  const id = text(form, 'id');
  const body = {
    name: text(form, 'name'),
    shortName: text(form, 'shortName') || null,
    type: InstitutionTypes.find((t) => t === text(form, 'type')),
    websiteUrl: text(form, 'websiteUrl') || null,
    state: MalaysianStates.find((x) => x === text(form, 'state')) ?? null,
    epanduanCode: EpanduanInstitutions.find((x) => x.code === text(form, 'epanduanCode'))?.code ?? null,
  };
  const fieldErrors: Record<string, string> = {};
  if (body.name.length < 3 || body.name.length > 160) fieldErrors.name = 'nameRequired';
  if (!body.type) fieldErrors.type = 'typeRequired';
  if (body.websiteUrl && !/^https?:\/\/\S+$/.test(body.websiteUrl)) fieldErrors.websiteUrl = 'websiteInvalid';
  if (Object.keys(fieldErrors).length || !body.type) return { fieldErrors };

  const token = await adminToken(locale);
  let created: string | null = null;
  try {
    if (id) await api.updateInstitution(token, id, { ...body, type: body.type });
    else created = (await api.createInstitution(token, { ...body, type: body.type })).id;
  } catch (err) {
    return { error: errorKey(err) };
  }
  // The directory filters list institutions from a cached copy; this refreshes it.
  updateTag('catalogue-reference');
  refresh();
  // A new institution opens on its profile, where its programmes and sources are added next.
  if (created) redirect(`/${locale}/admin/institusi/${created}`);
  return { savedAt: Date.now() };
}

/**
 * Deletes an institution and everything under it (`action=request` with the typed confirmation), or approves or
 * cancels a delete that waits for a second admin. A finished delete returns to the institution list.
 */
export async function institutionDeletion(_prev: AdminFormState, form: FormData): Promise<AdminFormState> {
  const locale = localeOf(form);
  const action = text(form, 'action');
  if (action !== 'request' && action !== 'approve' && action !== 'cancel') return { error: 'generic' };
  const token = await adminToken(locale);
  let status: 'deleted' | 'requested' | 'cancelled';
  try {
    ({ status } = await api.institutionDeletion(token, text(form, 'id'), action === 'request' ? { action, confirm: text(form, 'confirm') } : { action }));
  } catch (err) {
    return { error: errorKey(err) };
  }
  updateTag('catalogue-reference');
  refresh();
  if (status === 'deleted') redirect(`/${locale}/admin/institusi`);
  return { savedAt: Date.now(), status };
}

export async function addInstitutionSource(_prev: AdminFormState, form: FormData): Promise<AdminFormState> {
  const locale = localeOf(form);
  const kind = InstitutionSourceKinds.find((k) => k === text(form, 'kind'));
  const url = text(form, 'url');
  const fieldErrors: Record<string, string> = {};
  if (!kind) fieldErrors.kind = 'kindRequired';
  if (!/^https?:\/\/\S+$/.test(url)) fieldErrors.url = 'urlInvalid';
  if (Object.keys(fieldErrors).length || !kind) return { fieldErrors };
  const token = await adminToken(locale);
  try {
    await api.addInstitutionSource(token, text(form, 'id'), { kind, url, label: text(form, 'label') || null });
  } catch (err) {
    return { error: errorKey(err) };
  }
  refresh();
  return { savedAt: Date.now() };
}

export async function removeInstitutionSource(_prev: AdminFormState, form: FormData): Promise<AdminFormState> {
  const locale = localeOf(form);
  const token = await adminToken(locale);
  try {
    await api.removeInstitutionSource(token, text(form, 'id'), text(form, 'sourceId'));
  } catch (err) {
    return { error: errorKey(err) };
  }
  refresh();
  return { savedAt: Date.now() };
}

/** The programme form's fields. `isStream`: a Form 4 stream has no programme code. */
function programmeDetails(form: FormData, isStream: boolean) {
  const name = text(form, 'name');
  const durationText = text(form, 'durationSemesters');
  const duration = durationText ? Number(durationText) : null;
  const fieldIds = form.getAll('fieldIds').map(String).filter(Boolean);
  const fieldErrors: Record<string, string> = {};
  if (name.length < 3 || name.length > 160) fieldErrors.name = 'nameRequired';
  if (duration !== null && (!Number.isInteger(duration) || duration < 1 || duration > 16)) fieldErrors.durationSemesters = 'durationInvalid';
  const upuCode = text(form, 'upuCode').toUpperCase() || null;
  // Required, with no fixed format yet (the official guideline for these codes is still being checked).
  if (!isStream && !upuCode) fieldErrors.upuCode = 'upuRequired';
  if (upuCode && upuCode.length > 30) fieldErrors.upuCode = 'upuTooLong';
  const sourceUrl = text(form, 'sourceUrl') || null;
  if (sourceUrl && !/^https?:\/\/\S+$/.test(sourceUrl)) fieldErrors.sourceUrl = 'sourceInvalid';
  const flag = (name: string) => form.get(name) === 'on';
  const list = (name: string) => form.getAll(name).map((v) => String(v).trim()).filter(Boolean);
  return {
    details: {
      name,
      durationSemesters: duration,
      fieldIds: [...new Set(fieldIds)].slice(0, 10),
      upuCode,
      internalCode: text(form, 'internalCode') || null,
      faculty: text(form, 'faculty') || null,
      necCode: /^\d{4}$/.test(text(form, 'necCode')) ? text(form, 'necCode') : null,
      studyMode: StudyModes.find((m) => m === text(form, 'studyMode')) ?? null,
      campuses: list('campuses').slice(0, 20),
      hasInterview: flag('hasInterview'),
      isStem: flag('isStem'),
      isTvet: flag('isTvet'),
      bumiputeraOnly: flag('bumiputeraOnly'),
      jointDegree: flag('jointDegree'),
      feeder: flag('feeder'),
      careers: list('careers').slice(0, 40),
      fees: text(form, 'fees').slice(0, 1000) || null,
      note: text(form, 'note').slice(0, 2000) || null,
      sourceUrl,
    },
    fieldErrors,
  };
}

export async function createProgramme(_prev: AdminFormState, form: FormData): Promise<AdminFormState> {
  const locale = localeOf(form);
  const institutionId = text(form, 'institutionId');
  const level = StudyLevel.safeParse(text(form, 'studyLevel'));
  // Form 4 streams belong to no institution; every other programme needs one.
  const isStream = level.success && level.data === 'form4_stream';
  const { details, fieldErrors } = programmeDetails(form, isStream);
  if (!level.success) fieldErrors.studyLevel = 'levelRequired';
  if (!isStream && !institutionId) fieldErrors.institutionId = 'institutionRequired';
  if (Object.keys(fieldErrors).length || !level.success) return { fieldErrors };

  const token = await adminToken(locale);
  let id: string;
  try {
    ({ id } = await api.createProgramme(token, { ...details, institutionId: isStream ? null : institutionId, studyLevel: level.data }));
  } catch (err) {
    return { error: errorKey(err) };
  }
  // Typed by hand with an ePanduan code: keep what an import would (entry routes, average merit), so the programme
  // gets its route tabs and requirements from ePanduan just like an imported one.
  if (details.upuCode) await keepEpanduanFacts(token, id, details.upuCode).catch(() => null);
  refresh();
  redirect(`/${locale}/admin/program/${id}`);
}

async function keepEpanduanFacts(token: string, id: string, code: string) {
  const [found] = await api.listFoundProgrammes(token, [code]);
  if (!found) return;
  const routes = entryRoutesFromFound(found);
  if (routes.length) await api.setEntryRoutes(token, id, routes);
  if (found.merit !== null && found.year) await api.recordAverageMerit(token, id, { intakeYear: found.year, averageMerit: found.merit });
  // Syarat Khas, read in the background as for accepted programmes.
  await api.readSpecialRequirements(token, code.slice(0, 2), [code]).catch(() => null);
}

export type EpanduanLookup =
  | { status: 'found'; programme: api.FoundProgramme; institutionId: string | null }
  | { status: 'not_found' | 'unavailable' };

/**
 * The programme with this code as last read from ePanduan, for the programme form's "fill from ePanduan", with the
 * institution its code belongs to when exactly one institution has that ePanduan code.
 */
export async function lookupEpanduanProgramme(locale: string, code: string): Promise<EpanduanLookup> {
  const token = await adminToken(isLocale(locale) ? locale : 'ms');
  const clean = code.trim().toUpperCase();
  if (!/^[A-Z0-9]{4,30}$/.test(clean)) return { status: 'not_found' };
  try {
    const [[programme], institutions] = await Promise.all([api.listFoundProgrammes(token, [clean]), api.listAdminInstitutions(token)]);
    if (!programme) return { status: 'not_found' };
    const owners = institutions.filter((i) => i.epanduanCode === clean.slice(0, 2));
    return { status: 'found', programme, institutionId: owners.length === 1 ? owners[0]!.id : null };
  } catch {
    return { status: 'unavailable' };
  }
}

/** Saves the edit page and returns to the programme, which then shows what happens next. */
export async function updateProgramme(_prev: AdminFormState, form: FormData): Promise<AdminFormState> {
  const locale = localeOf(form);
  const id = text(form, 'id');
  // The form has no programme code field for a Form 4 stream.
  const { details, fieldErrors } = programmeDetails(form, !form.has('upuCode'));
  // A draft that was never published may still move to another institution or level.
  const level = StudyLevel.safeParse(text(form, 'studyLevel'));
  const institutionId = text(form, 'institutionId');
  const placement = form.has('studyLevel') && level.success ? { studyLevel: level.data, institutionId: level.data === 'form4_stream' ? null : institutionId || null } : {};
  if (form.has('studyLevel') && level.success && level.data !== 'form4_stream' && !institutionId) fieldErrors.institutionId = 'institutionRequired';
  if (Object.keys(fieldErrors).length) return { fieldErrors };
  const token = await adminToken(locale);
  try {
    await api.updateProgramme(token, id, { ...details, ...placement });
  } catch (err) {
    return { error: errorKey(err) };
  }
  refresh();
  redirect(`/${locale}/admin/program/${id}`);
}

/** Send for review, approve, return with a reason, withdraw, discard a change, archive, reopen or delete a programme. */
export async function decideProgramme(_prev: AdminFormState, form: FormData): Promise<AdminFormState> {
  const locale = localeOf(form);
  const action = text(form, 'action');
  const reason = text(form, 'reason');
  if (action === 'return' && reason.length < 5) return { error: 'reason_required' };
  const simple = ['submit', 'approve', 'withdraw', 'discard', 'archive', 'reopen'] as const;
  const plain = simple.find((a) => a === action);
  if (action !== 'return' && action !== 'delete' && !plain) return { error: 'generic' };
  const token = await adminToken(locale);
  if (action === 'delete') {
    // A draft or archived programme goes with its requirements; the admin returns to where it was listed.
    try {
      await api.deleteProgramme(token, text(form, 'id'));
    } catch (err) {
      return { error: errorKey(err) };
    }
    refresh();
    const back = text(form, 'back');
    redirect(back.startsWith(`/${locale}/admin/`) ? back : `/${locale}/admin/program`);
  }
  try {
    await api.reviewProgramme(token, text(form, 'id'), action === 'return' ? { action, reason } : { action: plain! });
  } catch (err) {
    return { error: errorKey(err) };
  }
  refresh();
  return { savedAt: Date.now() };
}

/**
 * Starts a draft for a programme and route (from the published rules when there are any) and opens it.
 * If a draft already exists for that route, opens that one instead.
 */
export async function startRequirement(_prev: AdminFormState, form: FormData): Promise<AdminFormState> {
  const locale = localeOf(form);
  const programId = text(form, 'programId');
  const entryRoute = text(form, 'entryRoute');
  if (!isEntryRoute(entryRoute)) return { error: 'generic' };
  const token = await adminToken(locale);
  let id: string;
  try {
    ({ id } = await api.createRequirementDraft(token, { programId, entryRoute }));
  } catch (err) {
    const existing = err instanceof api.AdminApiError && err.code === 'draft_exists' ? err.message.match(/\(([0-9a-f-]{36})\)/)?.[1] : undefined;
    if (!existing) return { error: errorKey(err) };
    id = existing;
  }
  refresh();
  // From an ePanduan category: the editor fills an empty draft from its text, for the admin to check and save.
  const fill = text(form, 'fill');
  redirect(`/${locale}/admin/syarat/${id}${/^[a-z0-9]+:[A-Z0-9]+$/.test(fill) ? `?isi=${encodeURIComponent(fill)}` : ''}`);
}

/** Saves the requirement editor; with `intent=submit` it also sends the draft for review. */
export async function saveRequirement(_prev: AdminFormState, form: FormData): Promise<AdminFormState> {
  const locale = localeOf(form);
  let state: EditorState;
  try {
    state = EditorState.parse(JSON.parse(text(form, 'state')));
  } catch {
    return { error: 'generic' };
  }
  const submit = text(form, 'intent') === 'submit';
  const { rules, problems } = checkLines(state.lines.map((l, i) => ({ ...l, key: String(i) })));
  if (problems.length) return { problems };
  if (submit && rules.length === 0) return { error: 'noRules' };
  const sourceUrl = state.sourceUrl.trim() || null;
  if (sourceUrl && !/^https?:\/\/\S+$/.test(sourceUrl)) return { error: 'invalid_source' };
  if (submit && !sourceUrl) return { error: 'missing_evidence' };

  const id = text(form, 'id');
  const token = await adminToken(locale);
  try {
    await api.saveRequirementDraft(token, id, { sourceUrl, sourceCategory: state.sourceCategory, rules });
    if (submit) await api.reviewRequirement(token, id, { action: 'submit' });
  } catch (err) {
    return { error: errorKey(err) };
  }
  refresh();
  // Back to the programme's requirements, which say what was done ("draft saved" or "sent for review").
  redirect(`/${locale}/admin/program/${text(form, 'programId')}?tab=syarat&selesai=${submit ? 'hantar' : 'draf'}`);
}

/** The reviewing admin approves (publishes) or returns a requirement draft. */
export async function decideRequirement(_prev: AdminFormState, form: FormData): Promise<AdminFormState> {
  const locale = localeOf(form);
  const action = text(form, 'action');
  const reason = text(form, 'reason');
  if (action === 'return' && reason.length < 5) return { error: 'reason_required' };
  if (action !== 'approve' && action !== 'return') return { error: 'generic' };
  const token = await adminToken(locale);
  try {
    await api.reviewRequirement(token, text(form, 'id'), action === 'return' ? { action, reason } : { action });
  } catch (err) {
    return { error: errorKey(err) };
  }
  refresh();
  return { savedAt: Date.now() };
}

export async function discardRequirement(_prev: AdminFormState, form: FormData): Promise<AdminFormState> {
  const locale = localeOf(form);
  const token = await adminToken(locale);
  try {
    await api.discardRequirementDraft(token, text(form, 'id'));
  } catch (err) {
    return { error: errorKey(err) };
  }
  refresh();
  redirect(`/${locale}/admin/program/${text(form, 'programId')}?tab=syarat`);
}

/** Removes an entry route that has no requirements yet from a programme. */
/**
 * Removes one route from a programme with everything written for it: the admin's own draft (`draftId`), then the
 * route itself, so its tab no longer shows. Published requirements are not removed this way (another admin approves
 * every change students see). Programmes accepted before routes were kept get theirs from ePanduan first.
 */
export async function removeEntryRoute(_prev: AdminFormState, form: FormData): Promise<AdminFormState> {
  const locale = localeOf(form);
  const token = await adminToken(locale);
  const programId = text(form, 'programId');
  const entryRoute = text(form, 'entryRoute');
  const draftId = text(form, 'draftId');
  try {
    if (draftId) await api.discardRequirementDraft(token, draftId);
    const programme = await api.getProgrammeDetail(token, programId);
    if (programme.entryRoutes.length === 0 && programme.upuCode) {
      const [found] = await api.listFoundProgrammes(token, [programme.upuCode]);
      await api.setEntryRoutes(token, programId, found ? entryRoutesFromFound(found).filter((r) => r.entryRoute !== entryRoute) : []);
    } else {
      await api.removeEntryRoute(token, programId, entryRoute);
    }
  } catch (err) {
    return { error: errorKey(err) };
  }
  refresh();
  redirect(`/${locale}/admin/program/${programId}?tab=syarat`);
}

/** Starts reading an institution's programmes on ePanduan; the import tab shows the progress and then the result. */
export async function startEpanduanImport(_prev: AdminFormState, form: FormData): Promise<AdminFormState> {
  const locale = localeOf(form);
  const code = EpanduanInstitutions.find((x) => x.code === text(form, 'code'))?.code;
  if (!code) return { error: 'generic' };
  const token = await adminToken(locale);
  try {
    await api.startEpanduanRun(token, code);
  } catch (err) {
    // Already being read (for example by another admin): the tab simply shows that run.
    if (!(err instanceof api.AdminApiError && err.code === 'run_in_progress')) return { error: errorKey(err) };
  }
  refresh();
  return { savedAt: Date.now() };
}

const FACT_KEYS = [
  'upuCode',
  'internalCode',
  'faculty',
  'necCode',
  'studyMode',
  'campuses',
  'hasInterview',
  'isStem',
  'isTvet',
  'bumiputeraOnly',
  'jointDegree',
  'feeder',
  'careers',
  'fees',
  'note',
  'sourceUrl',
] as const;

/**
 * Accepts the chosen found programmes: a new one becomes a draft of this institution (with its average merit), a
 * changed one gets only its changed details (a draft directly, a published programme as a change). Everything is
 * worked out again here from the stored run and the catalogue, so only rows that may be accepted are saved, and
 * another admin still approves each one before students see it.
 */
export async function acceptFoundProgrammes(_prev: AdminFormState, form: FormData): Promise<AdminFormState> {
  const locale = localeOf(form);
  const institutionId = text(form, 'institutionId');
  const chosen = new Set(form.getAll('codes').map(String));
  if (!institutionId || chosen.size === 0) return { error: 'generic' };
  const token = await adminToken(locale);
  let comparison;
  let necField: Map<string, string | null>;
  try {
    const institution = await api.getInstitutionDetail(token, institutionId);
    if (!institution.epanduanCode) return { error: 'conflict' };
    const [{ run }, existing, nec] = await Promise.all([
      api.latestEpanduanRun(token, institution.epanduanCode),
      api.listInstitutionProgrammes(token, institutionId),
      api.listNecFields(token),
    ]);
    if (!run || run.status !== 'done') return { error: 'conflict' };
    necField = new Map(nec.map((n) => [n.code, n.fieldId]));
    comparison = compareFound(run.programmes, existing, new Set(necField.keys()));
  } catch (err) {
    return { error: errorKey(err) };
  }

  const imported = { created: 0, updated: 0, failed: 0 };
  const accepted: string[] = [];
  for (const row of comparison.rows.filter((r) => chosen.has(r.found.code) && acceptable(r))) {
    try {
      let id: string;
      if (row.status === 'new') {
        ({ id } = await api.createProgramme(token, { ...draftFromFound(row.found, necField), institutionId }));
        imported.created += 1;
      } else if (onlyRoutesChanged(row)) {
        id = row.existing!.id;
        imported.updated += 1;
      } else {
        const detail = await api.getProgrammeDetail(token, row.existing!.id);
        const base = detail.pendingChanges ?? detail;
        const current = {
          name: base.name,
          durationSemesters: base.durationSemesters,
          fieldIds: base.fieldIds,
          ...Object.fromEntries(FACT_KEYS.map((k) => [k, base[k]])),
        } as api.ProgrammeBody;
        await api.updateProgramme(token, row.existing!.id, updateFromFound(current, row, necField));
        id = row.existing!.id;
        imported.updated += 1;
      }
      if (row.found.merit !== null && row.found.year) await api.recordAverageMerit(token, id, { intakeYear: row.found.year, averageMerit: row.found.merit });
      const routes = entryRoutesFromFound(row.found);
      if (routes.length) await api.setEntryRoutes(token, id, routes);
      accepted.push(row.found.code);
    } catch {
      imported.failed += 1;
    }
  }
  // Syarat Khas is read only for accepted programmes, in the background (a few seconds per category).
  if (accepted.length) {
    const institution = await api.getInstitutionDetail(token, institutionId).catch(() => null);
    if (institution?.epanduanCode) await api.readSpecialRequirements(token, institution.epanduanCode, accepted).catch(() => null);
  }
  refresh();
  return { savedAt: Date.now(), imported };
}
