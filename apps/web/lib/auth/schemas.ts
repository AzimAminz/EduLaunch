import { z } from 'zod';
import type { Dictionary } from '../i18n/locale';

/** Keys of `auth.errors` in the dictionaries; the form shows the text in the reader's language. */
export type AuthErrorKey = keyof Dictionary['auth']['errors'];

export const MIN_PASSWORD_LENGTH = 8;

const email = z.string().trim().min(1, 'required').pipe(z.email('email'));
const newPassword = z.string().min(1, 'required').min(MIN_PASSWORD_LENGTH, 'passwordShort');

export const SignInForm = z.object({ email, password: z.string().min(1, 'required') });
export const SignUpForm = z.object({
  fullName: z.string().trim().min(1, 'required').max(120, 'required'),
  email,
  password: newPassword,
  consent: z.literal('on', 'consent'),
});
export const ResetRequestForm = z.object({ email });
export const NewPasswordForm = z.object({ password: newPassword });

export type FieldErrors<T extends z.ZodType> = Partial<Record<keyof z.infer<T>, AuthErrorKey>>;

/** Reads a submitted form. On failure, returns the first problem of each field as a dictionary key. */
export function parseForm<T extends z.ZodObject>(schema: T, form: FormData): { ok: true; data: z.infer<T> } | { ok: false; fieldErrors: FieldErrors<T> } {
  const raw = Object.fromEntries(Object.keys(schema.shape).map((key) => [key, form.get(key) ?? undefined]));
  const result = schema.safeParse(raw);
  if (result.success) return { ok: true, data: result.data };

  const fieldErrors: Record<string, AuthErrorKey> = {};
  for (const issue of result.error.issues) {
    const field = String(issue.path[0]);
    // Missing or wrong-type values (no custom message) count as "required".
    fieldErrors[field] ??= (isErrorKey(issue.message) ? issue.message : 'required');
  }
  return { ok: false, fieldErrors: fieldErrors as FieldErrors<T> };
}

const ERROR_KEYS = new Set<string>(['required', 'email', 'passwordShort', 'consent']);
const isErrorKey = (message: string): message is AuthErrorKey => ERROR_KEYS.has(message);
