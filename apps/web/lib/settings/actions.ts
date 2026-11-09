'use server';

import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { authErrorKey } from '../auth/errors';
import { MIN_PASSWORD_LENGTH, type AuthErrorKey } from '../auth/schemas';
import { isLocale, type Locale } from '../i18n/locale';
import { deleteMyAccount, giveParentConsent, setNotificationPrefs, updateDetails } from '../profile/api';
import { createClient, getAccessToken, getAccount } from '../supabase/server';

/** What a settings form shows after a submit: saved (a new time each save), a message, or what to fix. */
export interface SettingsState {
  savedAt?: number;
  error?: AuthErrorKey;
  fieldErrors?: Partial<Record<string, AuthErrorKey>>;
  /** Shown after a save that needs a next step (for example "check your inbox"). */
  notice?: 'emailSent' | 'signedOutOthers';
}

const localeOf = (form: FormData): Locale => {
  const value = String(form.get('locale'));
  return isLocale(value) ? value : 'ms';
};
const text = (form: FormData, key: string) => String(form.get(key) ?? '').trim();

/** Name (kept in the sign-in account), school and date of birth (kept in the profile). Each saves on its own form. */
export async function saveProfile(_prev: SettingsState, form: FormData): Promise<SettingsState> {
  const fullName = text(form, 'fullName');
  const schoolName = text(form, 'schoolName');
  const dateOfBirth = text(form, 'dateOfBirth');
  const fieldErrors: SettingsState['fieldErrors'] = {};
  if (fullName.length < 2 || fullName.length > 120) fieldErrors.fullName = 'required';
  if (schoolName.length > 160) fieldErrors.schoolName = 'tooLong';
  if (dateOfBirth && !/^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth)) fieldErrors.dateOfBirth = 'invalidDate';
  if (Object.keys(fieldErrors).length) return { fieldErrors };

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ data: { full_name: fullName } });
  if (error) return { error: authErrorKey(error) };
  const token = await getAccessToken();
  if (!token) return { error: 'generic' };
  try {
    await updateDetails(token, { schoolName: schoolName || null, dateOfBirth: dateOfBirth || null });
  } catch {
    // The profile service refuses an impossible date of birth (for example a future date).
    return dateOfBirth ? { fieldErrors: { dateOfBirth: 'invalidDate' } } : { error: 'generic' };
  }
  revalidatePath(`/${localeOf(form)}`, 'layout');
  return { savedAt: Date.now() };
}

/** Stores the avatar's address in the account after the browser uploaded it to the student's own folder. */
export async function setAvatar(url: string | null): Promise<SettingsState> {
  const account = await getAccount();
  if (!account) return { error: 'generic' };
  // Only a picture from our own storage, inside this user's folder.
  if (url !== null) {
    const base = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/avatars/${account.id}/`;
    if (!url.startsWith(base)) return { error: 'generic' };
  }
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ data: { avatar_url: url } });
  if (error) return { error: authErrorKey(error) };
  revalidatePath('/', 'layout');
  return { savedAt: Date.now() };
}

/** Sends a confirmation link to the new address; the change applies once it is opened. */
export async function changeEmail(_prev: SettingsState, form: FormData): Promise<SettingsState> {
  const email = text(form, 'email').toLowerCase();
  if (!z.email().safeParse(email).success) return { fieldErrors: { email: 'email' } };
  const account = await getAccount();
  if (!account) return { error: 'generic' };
  if (email === account.email.toLowerCase()) return { fieldErrors: { email: 'sameEmail' } };
  const h = await headers();
  const origin = h.get('origin') ?? `${h.get('x-forwarded-proto') ?? 'http'}://${h.get('host')}`;
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ email }, { emailRedirectTo: `${origin}/${localeOf(form)}/tetapan?bahagian=log-masuk` });
  if (error) return { error: authErrorKey(error) };
  return { savedAt: Date.now(), notice: 'emailSent' };
}

/** Checks the current password first, so someone at an unlocked screen cannot change it. */
export async function changePassword(_prev: SettingsState, form: FormData): Promise<SettingsState> {
  const current = String(form.get('currentPassword') ?? '');
  const next = String(form.get('newPassword') ?? '');
  const again = String(form.get('confirmPassword') ?? '');
  const fieldErrors: SettingsState['fieldErrors'] = {};
  if (!current) fieldErrors.currentPassword = 'required';
  if (next.length < MIN_PASSWORD_LENGTH) fieldErrors.newPassword = 'passwordShort';
  else if (next !== again) fieldErrors.confirmPassword = 'passwordMismatch';
  if (Object.keys(fieldErrors).length) return { fieldErrors };

  const account = await getAccount();
  if (!account) return { error: 'generic' };
  const supabase = await createClient();
  const check = await supabase.auth.signInWithPassword({ email: account.email, password: current });
  if (check.error) return check.error.code === 'invalid_credentials' ? { fieldErrors: { currentPassword: 'wrongPassword' } } : { error: authErrorKey(check.error) };
  const { error } = await supabase.auth.updateUser({ password: next });
  if (error) return error.code === 'same_password' ? { fieldErrors: { newPassword: 'samePassword' } } : { error: authErrorKey(error) };
  return { savedAt: Date.now() };
}

/** Signs out every other browser and device; this one stays signed in. */
export async function signOutOtherDevices(): Promise<SettingsState> {
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut({ scope: 'others' });
  if (error) return { error: authErrorKey(error) };
  return { savedAt: Date.now(), notice: 'signedOutOthers' };
}

/** Which notices the student wants; saved at once when a switch changes. */
export async function saveNotifications(_prev: SettingsState, form: FormData): Promise<SettingsState> {
  const token = await getAccessToken();
  if (!token) return { error: 'generic' };
  try {
    await setNotificationPrefs(token, { requirementChanges: form.get('requirementChanges') === 'on' });
  } catch {
    return { error: 'generic' };
  }
  return { savedAt: Date.now() };
}

/** A student under 18 records that a parent or guardian agreed, after ticking the statement. */
export async function confirmParentConsent(_prev: SettingsState, form: FormData): Promise<SettingsState> {
  if (form.get('agree') !== 'on') return { fieldErrors: { agree: 'required' } };
  const token = await getAccessToken();
  if (!token) return { error: 'generic' };
  try {
    await giveParentConsent(token);
  } catch {
    return { error: 'generic' };
  }
  revalidatePath(`/${localeOf(form)}/tetapan`);
  return { savedAt: Date.now() };
}

/**
 * Deletes the account for good, after the current password and the confirmation word typed out ("PADAM" or
 * "DELETE"), then signs out and opens the home page.
 */
export async function deleteAccount(_prev: SettingsState, form: FormData): Promise<SettingsState> {
  const locale = localeOf(form);
  const password = String(form.get('password') ?? '');
  const word = text(form, 'confirmWord').toUpperCase();
  const fieldErrors: SettingsState['fieldErrors'] = {};
  if (!password) fieldErrors.password = 'required';
  if (word !== 'PADAM' && word !== 'DELETE') fieldErrors.confirmWord = 'confirmWord';
  if (Object.keys(fieldErrors).length) return { fieldErrors };

  const account = await getAccount();
  if (!account) return { error: 'generic' };
  const supabase = await createClient();
  const check = await supabase.auth.signInWithPassword({ email: account.email, password });
  if (check.error) return check.error.code === 'invalid_credentials' ? { fieldErrors: { password: 'wrongPassword' } } : { error: authErrorKey(check.error) };
  const token = await getAccessToken();
  if (!token) return { error: 'generic' };
  try {
    await deleteMyAccount(token);
  } catch {
    return { error: 'deleteFailed' };
  }
  // The sign-in account is gone; clear this browser's session too.
  await supabase.auth.signOut().catch(() => undefined);
  redirect(`/${locale}?akaun=dipadam`);
}
