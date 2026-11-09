'use client';

import { FormAlert, PasswordField, TextField } from '@/components/auth/fields';
import { Notice } from '@/components/ui/notice';
import { useFormAction } from '@/components/ui/use-form-action';
import type { Dictionary } from '@/lib/i18n/locale';
import { changeEmail, changePassword, saveProfile, signOutOtherDevices, type SettingsState } from '@/lib/settings/actions';

type Errors = Dictionary['auth']['errors'];
type T = Dictionary['settings'];

const save = 'h-11 rounded-[12px] bg-navy px-5 text-sm font-semibold text-white transition-colors hover:bg-navy/90 disabled:opacity-60';

/** Each form saves on its own, with its button at the bottom and a quiet "Saved" beside it. */
function Footer({ pending, label, saved, savedAt }: { pending: boolean; label: string; saved: string; savedAt: number | undefined }) {
  return (
    <div className="flex flex-wrap items-center gap-3 border-t border-line pt-4">
      <button type="submit" disabled={pending} className={save}>
        {label}
      </button>
      <Notice showKey={savedAt}>{saved}</Notice>
    </div>
  );
}

const err = (state: SettingsState, errors: Errors, field: string) => {
  const key = state.fieldErrors?.[field];
  return key ? errors[key] : undefined;
};

export function ProfileForm({ locale, values, t, errors }: { locale: string; values: { fullName: string; schoolName: string; dateOfBirth: string }; t: T; errors: Errors }) {
  const [state, onSubmit, pending] = useFormAction<SettingsState>(saveProfile, {});
  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <input type="hidden" name="locale" value={locale} />
      <FormAlert>{!pending && state.error ? errors[state.error] : undefined}</FormAlert>
      <TextField name="fullName" label={t.profile.fullName} defaultValue={values.fullName} maxLength={120} autoComplete="name" required error={err(state, errors, 'fullName')} />
      <TextField name="schoolName" label={t.profile.school} hint={t.profile.schoolHint} defaultValue={values.schoolName} maxLength={160} autoComplete="organization" error={err(state, errors, 'schoolName')} />
      <TextField name="dateOfBirth" type="date" label={t.profile.dateOfBirth} hint={t.profile.dateOfBirthHint} defaultValue={values.dateOfBirth} autoComplete="bday" error={err(state, errors, 'dateOfBirth')} />
      <Footer pending={pending} label={t.save} saved={t.saved} savedAt={state.savedAt} />
    </form>
  );
}

export function EmailForm({ locale, email, t, errors }: { locale: string; email: string; t: T; errors: Errors }) {
  const [state, onSubmit, pending] = useFormAction<SettingsState>(changeEmail, {});
  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <input type="hidden" name="locale" value={locale} />
      <p className="text-sm">
        {t.security.currentEmail} <span className="font-semibold">{email}</span>
      </p>
      <FormAlert>{!pending && state.error ? errors[state.error] : undefined}</FormAlert>
      <TextField name="email" type="email" label={t.security.newEmail} autoComplete="email" required error={err(state, errors, 'email')} />
      {!pending && state.notice === 'emailSent' && (
        <p role="status" className="rounded-[12px] bg-mint px-4 py-3 text-sm text-[#1f6b47]">
          {t.security.emailSent}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-3 border-t border-line pt-4">
        <button type="submit" disabled={pending} className={save}>
          {t.security.changeEmail}
        </button>
      </div>
    </form>
  );
}

export function PasswordForm({ locale, t, errors }: { locale: string; t: T; errors: Errors }) {
  const [state, onSubmit, pending] = useFormAction<SettingsState>(changePassword, {});
  const show = { showLabel: t.security.show, hideLabel: t.security.hide };
  return (
    // A new key after each save empties the fields.
    <form key={state.savedAt ?? 0} onSubmit={onSubmit} className="flex flex-col gap-4">
      <input type="hidden" name="locale" value={locale} />
      <FormAlert>{!pending && state.error ? errors[state.error] : undefined}</FormAlert>
      <PasswordField name="currentPassword" label={t.security.currentPassword} autoComplete="current-password" required error={err(state, errors, 'currentPassword')} {...show} />
      <PasswordField name="newPassword" label={t.security.newPassword} hint={t.security.passwordHint} autoComplete="new-password" required error={err(state, errors, 'newPassword')} {...show} />
      <PasswordField name="confirmPassword" label={t.security.confirmPassword} autoComplete="new-password" required error={err(state, errors, 'confirmPassword')} {...show} />
      <Footer pending={pending} label={t.security.changePassword} saved={t.security.passwordChanged} savedAt={state.savedAt} />
    </form>
  );
}

export function SignOutOthers({ t, errors }: { t: T; errors: Errors }) {
  const [state, onSubmit, pending] = useFormAction<SettingsState>(signOutOtherDevices, {});
  return (
    <form onSubmit={onSubmit} className="flex flex-wrap items-center gap-3">
      <button type="submit" disabled={pending} className="h-11 rounded-[12px] border border-line bg-white px-5 text-sm font-semibold transition-colors hover:bg-bg disabled:opacity-60">
        {t.security.signOutOthers}
      </button>
      <Notice showKey={state.notice === 'signedOutOthers' ? state.savedAt : undefined}>{t.security.signedOutOthers}</Notice>
      {!pending && state.error && <p className="text-[13px] text-[#b33a35]">{errors[state.error]}</p>}
    </form>
  );
}
