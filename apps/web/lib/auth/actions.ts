'use server';

import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { isLocale, type Locale } from '../i18n/locale';
import { getMe, setEducationLevel } from '../profile/api';
import { parseLevelChoice } from '../profile/levels';
import { createClient, getAccessToken } from '../supabase/server';
import { authErrorKey } from './errors';
import { AUTH_PAGES, homeFor, nextFor, safeNext, type Role } from './routes';
import { NewPasswordForm, ResetRequestForm, SignInForm, SignUpForm, parseForm, type AuthErrorKey } from './schemas';

/** What a form shows after a failed submit. Typed values come back so the form keeps them (never the password). */
export interface FormState {
  error?: AuthErrorKey;
  fieldErrors?: Partial<Record<string, AuthErrorKey>>;
  values?: Record<string, string>;
}

const localeOf = (form: FormData): Locale => {
  const value = String(form.get('locale'));
  return isLocale(value) ? value : 'ms';
};

/** The address the browser used, so e-mail links return to the same site (and the same cookies). */
async function origin() {
  const h = await headers();
  return h.get('origin') ?? `${h.get('x-forwarded-proto') ?? 'http'}://${h.get('host')}`;
}

/** Students without an education level go to onboarding first. */
async function landingFor(locale: Locale, role: Role, accessToken: string | undefined) {
  if (role === 'admin' || !accessToken) return homeFor(locale, role);
  try {
    const me = await getMe(accessToken);
    return me.educationLevel ? homeFor(locale, role) : `/${locale}/${AUTH_PAGES.onboarding}`;
  } catch {
    return homeFor(locale, role);
  }
}

export async function signIn(_prev: FormState, form: FormData): Promise<FormState> {
  const locale = localeOf(form);
  const values = { email: String(form.get('email') ?? '') };
  const parsed = parseForm(SignInForm, form);
  if (!parsed.ok) return { fieldErrors: parsed.fieldErrors, values };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { error: authErrorKey(error), values };

  // Later e-mails (such as "forgot password") follow the language used most recently.
  if (data.user.user_metadata?.locale !== locale) await supabase.auth.updateUser({ data: { locale } });

  const role: Role = data.user.app_metadata?.role === 'admin' ? 'admin' : 'student';
  const fallback = await landingFor(locale, role, data.session?.access_token);
  redirect(nextFor(String(form.get('next') ?? ''), { role }, fallback));
}

export async function signUp(_prev: FormState, form: FormData): Promise<FormState> {
  const locale = localeOf(form);
  const values = { fullName: String(form.get('fullName') ?? ''), email: String(form.get('email') ?? ''), consent: String(form.get('consent') ?? '') };
  const parsed = parseForm(SignUpForm, form);
  if (!parsed.ok) return { fieldErrors: parsed.fieldErrors, values };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      // locale picks the language of Supabase e-mails (see tools/scripts/build-email-templates.mjs).
      data: { full_name: parsed.data.fullName, consented_at: new Date().toISOString(), locale },
      emailRedirectTo: `${await origin()}/${locale}/${AUTH_PAGES.callback}?next=/${locale}/${AUTH_PAGES.onboarding}`,
    },
  });
  if (error) return { error: authErrorKey(error), values };
  // Supabase hides existing accounts when e-mail confirmation is on: no identities means "already registered".
  if (data.user && data.user.identities?.length === 0) return { error: 'emailTaken', values };

  // With e-mail confirmation off (local development) the account is signed in at once.
  redirect(data.session ? `/${locale}/${AUTH_PAGES.onboarding}` : `/${locale}/${AUTH_PAGES.checkInbox}`);
}

export async function requestPasswordReset(_prev: FormState, form: FormData): Promise<FormState> {
  const locale = localeOf(form);
  const values = { email: String(form.get('email') ?? '') };
  const parsed = parseForm(ResetRequestForm, form);
  if (!parsed.ok) return { fieldErrors: parsed.fieldErrors, values };

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${await origin()}/${locale}/${AUTH_PAGES.callback}?next=/${locale}/${AUTH_PAGES.newPassword}`,
  });
  // Unknown e-mails are not reported, so nobody can find out who has an account. Only rate limits are shown.
  if (error && authErrorKey(error) === 'rateLimited') return { error: 'rateLimited', values };
  redirect(`/${locale}/${AUTH_PAGES.checkInbox}`);
}

export async function updatePassword(_prev: FormState, form: FormData): Promise<FormState> {
  const locale = localeOf(form);
  const parsed = parseForm(NewPasswordForm, form);
  if (!parsed.ok) return { fieldErrors: parsed.fieldErrors };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { error: authErrorKey(error) };

  const role: Role = data.user.app_metadata?.role === 'admin' ? 'admin' : 'student';
  redirect(homeFor(locale, role));
}

export async function signOut(form: FormData): Promise<void> {
  const locale = localeOf(form);
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect(`/${locale}/${AUTH_PAGES.signIn}`);
}

export async function chooseEducationLevel(_prev: FormState, form: FormData): Promise<FormState> {
  const locale = localeOf(form);
  const values = { level: String(form.get('level') ?? ''), formYear: String(form.get('formYear') ?? '') };
  const choice = parseLevelChoice(form);
  if ('error' in choice) return { error: choice.error, values };

  const token = await getAccessToken();
  if (!token) redirect(`/${locale}/${AUTH_PAGES.signIn}?next=/${locale}/${AUTH_PAGES.onboarding}`);
  try {
    await setEducationLevel(token, choice.level, choice.formYear);
  } catch {
    return { error: 'generic', values };
  }
  // Every page that depends on the level (results form, profile) shows the new one straight away.
  revalidatePath('/[lang]', 'layout');
  // Onboarding continues to the portal; the profile page sends people back to itself.
  redirect(safeNext(String(form.get('returnTo') ?? ''), homeFor(locale, 'student')));
}
