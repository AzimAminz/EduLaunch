'use server';

import { InstitutionSourceKinds, InstitutionTypes, MalaysianStates, StudyLevel, StudyModes, UPU_CODE_PATTERN, isEntryRoute } from '@edulaunch/contracts';
import { revalidatePath, updateTag } from 'next/cache';
import { redirect } from 'next/navigation';
import { isLocale, type Locale } from '../i18n/locale';
import { getAccount, getAccessToken } from '../supabase/server';
import * as api from './api';
import { checkGroups, EditorState, type CheckedState } from './requirement-form';

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
  | 'noRules';

const KNOWN: readonly string[] = ['forbidden', 'conflict', 'draft_exists', 'invalid_rule', 'missing_evidence', 'invalid_source', 'invalid_program', 'invalid_institution', 'reason_required', 'not_found', 'confirmation_mismatch', 'upu_code_taken'];

export interface AdminFormState {
  /** A new time on every successful save, to show "Saved". */
  savedAt?: number;
  error?: AdminErrorKey;
  /** Field problems, by field name, as keys of the form's own `errors`. */
  fieldErrors?: Record<string, string>;
  /** Requirement editor: problems by line and rule. */
  problems?: CheckedState['problems'];
  /** Institution delete: whether it was requested (waiting for another admin) or cancelled. */
  status?: 'requested' | 'cancelled';
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

function programmeDetails(form: FormData) {
  const name = text(form, 'name');
  const durationText = text(form, 'durationSemesters');
  const duration = durationText ? Number(durationText) : null;
  const fieldIds = form.getAll('fieldIds').map(String).filter(Boolean);
  const fieldErrors: Record<string, string> = {};
  if (name.length < 3 || name.length > 160) fieldErrors.name = 'nameRequired';
  if (duration !== null && (!Number.isInteger(duration) || duration < 1 || duration > 16)) fieldErrors.durationSemesters = 'durationInvalid';
  const upuCode = text(form, 'upuCode').toUpperCase() || null;
  if (upuCode && !UPU_CODE_PATTERN.test(upuCode)) fieldErrors.upuCode = 'upuInvalid';
  const sourceUrl = text(form, 'sourceUrl') || null;
  if (sourceUrl && !/^https?:\/\/\S+$/.test(sourceUrl)) fieldErrors.sourceUrl = 'sourceInvalid';
  const flag = (name: string) => form.get(name) === 'on';
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
      campus: text(form, 'campus') || null,
      hasInterview: flag('hasInterview'),
      isStem: flag('isStem'),
      isTvet: flag('isTvet'),
      bumiputeraOnly: flag('bumiputeraOnly'),
      sourceUrl,
    },
    fieldErrors,
  };
}

export async function createProgramme(_prev: AdminFormState, form: FormData): Promise<AdminFormState> {
  const locale = localeOf(form);
  const { details, fieldErrors } = programmeDetails(form);
  const institutionId = text(form, 'institutionId');
  const level = StudyLevel.safeParse(text(form, 'studyLevel'));
  if (!level.success) fieldErrors.studyLevel = 'levelRequired';
  // Form 4 streams belong to no institution; every other programme needs one.
  const isStream = level.success && level.data === 'form4_stream';
  if (!isStream && !institutionId) fieldErrors.institutionId = 'institutionRequired';
  if (Object.keys(fieldErrors).length || !level.success) return { fieldErrors };

  const token = await adminToken(locale);
  let id: string;
  try {
    ({ id } = await api.createProgramme(token, { ...details, institutionId: isStream ? null : institutionId, studyLevel: level.data }));
  } catch (err) {
    return { error: errorKey(err) };
  }
  refresh();
  redirect(`/${locale}/admin/program/${id}`);
}

/** Saves the edit page and returns to the programme, which then shows what happens next. */
export async function updateProgramme(_prev: AdminFormState, form: FormData): Promise<AdminFormState> {
  const locale = localeOf(form);
  const id = text(form, 'id');
  const { details, fieldErrors } = programmeDetails(form);
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
  redirect(`/${locale}/admin/syarat/${id}`);
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
  const { rules, problems } = checkGroups(state.groups);
  if (problems.length) return { problems };
  if (submit && rules.length === 0) return { error: 'noRules' };
  const sourceUrl = state.sourceUrl.trim() || null;
  if (sourceUrl && !/^https?:\/\/\S+$/.test(sourceUrl)) return { error: 'invalid_source' };
  if (submit && !sourceUrl) return { error: 'missing_evidence' };

  const id = text(form, 'id');
  const token = await adminToken(locale);
  try {
    await api.saveRequirementDraft(token, id, { sourceUrl, rules });
    if (submit) await api.reviewRequirement(token, id, { action: 'submit' });
  } catch (err) {
    return { error: errorKey(err) };
  }
  refresh();
  return { savedAt: Date.now() };
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
  redirect(`/${locale}/admin/program/${text(form, 'programId')}`);
}
