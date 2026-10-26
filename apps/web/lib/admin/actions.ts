'use server';

import { InstitutionTypes, StudyLevel, isEntryRoute } from '@edulaunch/contracts';
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
  | 'noRules';

const KNOWN: readonly string[] = ['forbidden', 'conflict', 'draft_exists', 'invalid_rule', 'missing_evidence', 'invalid_source', 'invalid_program', 'invalid_institution', 'reason_required', 'not_found'];

export interface AdminFormState {
  /** A new time on every successful save, to show "Saved". */
  savedAt?: number;
  error?: AdminErrorKey;
  /** Field problems, by field name, as keys of the form's own `errors`. */
  fieldErrors?: Record<string, string>;
  /** Requirement editor: problems by line and rule. */
  problems?: CheckedState['problems'];
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
  };
  const fieldErrors: Record<string, string> = {};
  if (body.name.length < 3 || body.name.length > 160) fieldErrors.name = 'nameRequired';
  if (!body.type) fieldErrors.type = 'typeRequired';
  if (body.websiteUrl && !/^https?:\/\/\S+$/.test(body.websiteUrl)) fieldErrors.websiteUrl = 'websiteInvalid';
  if (Object.keys(fieldErrors).length || !body.type) return { fieldErrors };

  const token = await adminToken(locale);
  try {
    if (id) await api.updateInstitution(token, id, { ...body, type: body.type });
    else await api.createInstitution(token, { ...body, type: body.type });
  } catch (err) {
    return { error: errorKey(err) };
  }
  // The directory filters list institutions from a cached copy; this refreshes it.
  updateTag('catalogue-reference');
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
  return { details: { name, durationSemesters: duration, fieldIds: [...new Set(fieldIds)].slice(0, 10) }, fieldErrors };
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

export async function updateProgramme(_prev: AdminFormState, form: FormData): Promise<AdminFormState> {
  const locale = localeOf(form);
  const { details, fieldErrors } = programmeDetails(form);
  if (Object.keys(fieldErrors).length) return { fieldErrors };
  const token = await adminToken(locale);
  try {
    await api.updateProgramme(token, text(form, 'id'), details);
  } catch (err) {
    return { error: errorKey(err) };
  }
  refresh();
  return { savedAt: Date.now() };
}

/** Send for review, approve, return with a reason, archive or reopen a programme. */
export async function decideProgramme(_prev: AdminFormState, form: FormData): Promise<AdminFormState> {
  const locale = localeOf(form);
  const action = text(form, 'action');
  const reason = text(form, 'reason');
  if (action === 'return' && reason.length < 5) return { error: 'reason_required' };
  if (!['submit', 'approve', 'return', 'archive', 'reopen'].includes(action)) return { error: 'generic' };
  const token = await adminToken(locale);
  try {
    await api.reviewProgramme(token, text(form, 'id'), action === 'return' ? { action, reason } : { action: action as 'submit' | 'approve' | 'archive' | 'reopen' });
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
