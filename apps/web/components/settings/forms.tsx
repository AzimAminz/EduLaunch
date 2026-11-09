'use client';

import { FormAlert, PasswordField, TextField } from '@/components/auth/fields';
import { Notice } from '@/components/ui/notice';
import { useFormAction } from '@/components/ui/use-form-action';
import type { Dictionary } from '@/lib/i18n/locale';
import { useRef } from 'react';
import { changeEmail, changePassword, confirmParentConsent, deleteAccount, saveNotifications, saveProfile, signOutOtherDevices, type SettingsState } from '@/lib/settings/actions';

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

/** A switch that saves as soon as it changes, with a quiet "Saved". */
export function NotificationsForm({ locale, requirementChanges, t, errors }: { locale: string; requirementChanges: boolean; t: T; errors: Errors }) {
  const [state, onSubmit, pending] = useFormAction<SettingsState>(saveNotifications, {});
  const form = useRef<HTMLFormElement>(null);
  return (
    <form ref={form} onSubmit={onSubmit} className="flex flex-col gap-3">
      <input type="hidden" name="locale" value={locale} />
      <label className="flex cursor-pointer items-start justify-between gap-4">
        <span className="flex flex-col gap-0.5">
          <span className="font-semibold">{t.notifications.requirementChanges}</span>
          <span className="text-sm text-muted">{t.notifications.requirementChangesHint}</span>
        </span>
        <input
          type="checkbox"
          name="requirementChanges"
          defaultChecked={requirementChanges}
          disabled={pending}
          onChange={() => form.current?.requestSubmit()}
          className="peer sr-only"
        />
        <span
          aria-hidden
          className="relative mt-1 h-6 w-11 shrink-0 rounded-full bg-[#c3c9d4] transition-colors after:absolute after:left-0.5 after:top-0.5 after:size-5 after:rounded-full after:bg-white after:shadow after:transition-transform peer-checked:bg-[#1f6b47] peer-checked:after:translate-x-5 peer-focus-visible:ring-2 peer-focus-visible:ring-navy/40 motion-reduce:after:transition-none"
        />
      </label>
      <div className="min-h-5">
        <Notice showKey={state.savedAt}>{t.saved}</Notice>
        {!pending && state.error && <p className="text-[13px] text-[#b33a35]">{errors[state.error]}</p>}
      </div>
    </form>
  );
}

export function ParentConsentForm({ locale, t, errors }: { locale: string; t: T; errors: Errors }) {
  const [state, onSubmit, pending] = useFormAction<SettingsState>(confirmParentConsent, {});
  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3">
      <input type="hidden" name="locale" value={locale} />
      <label className="flex cursor-pointer items-start gap-3 text-sm">
        <input type="checkbox" name="agree" className="mt-0.5 size-4 shrink-0 accent-[#1b2a4a]" />
        <span>{t.privacy.consentStatement}</span>
      </label>
      {err(state, errors, 'agree') && <p className="text-[13px] text-[#b33a35]">{t.privacy.consentRequired}</p>}
      <div>
        <button type="submit" disabled={pending} className={save}>
          {t.privacy.consentConfirm}
        </button>
      </div>
    </form>
  );
}

export function DeleteAccountForm({ locale, t, errors }: { locale: string; t: T; errors: Errors }) {
  const [state, onSubmit, pending] = useFormAction<SettingsState>(deleteAccount, {});
  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <input type="hidden" name="locale" value={locale} />
      <ul className="flex list-disc flex-col gap-1 pl-5 text-sm">
        {t.privacy.deleteWhat.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
      <FormAlert>{!pending && state.error ? errors[state.error] : undefined}</FormAlert>
      <PasswordField name="password" label={t.security.currentPassword} autoComplete="current-password" required error={err(state, errors, 'password')} showLabel={t.security.show} hideLabel={t.security.hide} />
      <TextField name="confirmWord" label={t.privacy.confirmWordLabel} autoComplete="off" required error={err(state, errors, 'confirmWord')} />
      <div className="border-t border-line pt-4">
        <button type="submit" disabled={pending} className="h-11 rounded-[12px] bg-[#b33a35] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#9c302b] disabled:opacity-60">
          {t.privacy.deleteButton}
        </button>
      </div>
    </form>
  );
}
