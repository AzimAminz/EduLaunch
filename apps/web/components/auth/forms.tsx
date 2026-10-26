'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { useSearchParams } from 'next/navigation';
import { requestPasswordReset, signIn, signUp, updatePassword, type FormState } from '@/lib/auth/actions';
import { AUTH_PAGES } from '@/lib/auth/routes';
import { MIN_PASSWORD_LENGTH } from '@/lib/auth/schemas';
import { format, type Dictionary, type Locale } from '@/lib/i18n/locale';
import { Icon } from '@/components/ui/icon';
import { FormAlert, PasswordField, SubmitButton, TextField } from './fields';

interface FormProps {
  locale: Locale;
  t: Dictionary['auth'];
}

const SECONDARY = 'flex w-full items-center justify-center gap-2 rounded-[10px] px-5 py-3.5 text-base font-semibold text-navy';

/** Error text for a field, in the reader's language. */
const errorText = (t: Dictionary['auth'], state: FormState, field: string) => {
  const key = state.fieldErrors?.[field];
  return key ? t.errors[key] : undefined;
};

export function SignInForm({ locale, t }: FormProps) {
  const [state, action] = useActionState(signIn, {});
  const next = useSearchParams().get('next') ?? '';
  return (
    <form action={action} noValidate className="flex flex-col gap-5">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="next" value={next} />
      <FormAlert>{state.error && t.errors[state.error]}</FormAlert>
      <TextField name="email" type="email" autoComplete="email" label={t.email} placeholder={t.emailPlaceholder} defaultValue={state.values?.email} error={errorText(t, state, 'email')} required />
      <PasswordField
        name="password"
        autoComplete="current-password"
        label={t.password}
        placeholder={t.signInPage.passwordPlaceholder}
        error={errorText(t, state, 'password')}
        showLabel={t.show}
        hideLabel={t.hide}
        required
      />
      <SubmitButton icon="/icons/log-in-white.svg">{t.signInPage.submit}</SubmitButton>
      <Link href={`/${locale}/${AUTH_PAGES.forgotPassword}`} className="self-start text-sm font-medium underline-offset-4 hover:underline">
        {t.signInPage.forgot}
      </Link>
      <div className="flex flex-col gap-2 border-t border-line pt-5">
        <p className="text-sm text-muted">{t.signInPage.noAccount}</p>
        <Link href={`/${locale}/${AUTH_PAGES.signUp}`} className={`${SECONDARY} bg-blue hover:brightness-95`}>
          <Icon src="/icons/user-plus.svg" size={20} />
          {t.signInPage.createAccount}
        </Link>
      </div>
    </form>
  );
}

export function SignUpForm({ locale, t }: FormProps) {
  const [state, action] = useActionState(signUp, {});
  const p = t.signUpPage;
  const consentError = errorText(t, state, 'consent');
  return (
    <form action={action} noValidate className="flex flex-col gap-5">
      <input type="hidden" name="locale" value={locale} />
      <FormAlert>{state.error && t.errors[state.error]}</FormAlert>
      <TextField name="fullName" autoComplete="name" label={p.name} placeholder={p.namePlaceholder} defaultValue={state.values?.fullName} error={errorText(t, state, 'fullName')} required />
      <TextField name="email" type="email" autoComplete="email" label={t.email} placeholder={t.emailPlaceholder} defaultValue={state.values?.email} error={errorText(t, state, 'email')} required />
      <PasswordField
        name="password"
        autoComplete="new-password"
        label={t.password}
        placeholder={p.passwordPlaceholder}
        hint={format(p.passwordHint, { min: MIN_PASSWORD_LENGTH })}
        error={errorText(t, state, 'password')}
        showLabel={t.show}
        hideLabel={t.hide}
        minLength={MIN_PASSWORD_LENGTH}
        required
      />
      <fieldset className={`flex flex-col gap-2 rounded-[12px] bg-bg p-4 ${consentError ? 'ring-1 ring-red' : ''}`}>
        <legend className="float-left mb-1 text-[17px] font-semibold">{p.consentTitle}</legend>
        <label className="clear-left flex items-start gap-3 text-sm text-muted">
          <input type="checkbox" name="consent" defaultChecked={state.values?.consent === 'on'} aria-invalid={consentError ? true : undefined} className="mt-0.5 size-4 shrink-0 accent-navy" required />
          {p.consent}
        </label>
        {consentError && <p className="text-[13px] text-red">{consentError}</p>}
      </fieldset>
      <SubmitButton icon="/icons/user-plus-white.svg">{p.submit}</SubmitButton>
      <Link href={`/${locale}/${AUTH_PAGES.signIn}`} className={`${SECONDARY} border border-line bg-white hover:bg-bg`}>
        {p.haveAccount}
        <Icon src="/icons/arrow-right.svg" size={18} />
      </Link>
    </form>
  );
}

export function ForgotPasswordForm({ locale, t }: FormProps) {
  const [state, action] = useActionState(requestPasswordReset, {});
  // The e-mail link sends people back here with ?ralat=pautan when it has expired.
  const linkExpired = useSearchParams().get('ralat') === 'pautan';
  const p = t.forgotPage;
  const alert = state.error ? t.errors[state.error] : linkExpired ? t.errors.linkExpired : undefined;
  return (
    <form action={action} noValidate className="flex flex-col gap-5">
      <input type="hidden" name="locale" value={locale} />
      <FormAlert>{alert}</FormAlert>
      <TextField name="email" type="email" autoComplete="email" label={t.email} placeholder={t.emailPlaceholder} defaultValue={state.values?.email} error={errorText(t, state, 'email')} required />
      <div className="flex flex-col gap-1 rounded-[12px] bg-bg p-4">
        <p className="text-[17px] font-semibold">{p.afterTitle}</p>
        <p className="text-sm text-muted">{p.afterBody}</p>
      </div>
      <SubmitButton>{p.submit}</SubmitButton>
      <Link href={`/${locale}/${AUTH_PAGES.signIn}`} className={`${SECONDARY} border border-line bg-white hover:bg-bg`}>
        <Icon src="/icons/log-in.svg" size={18} />
        {p.back}
      </Link>
    </form>
  );
}

export function NewPasswordForm({ locale, t }: FormProps) {
  const [state, action] = useActionState(updatePassword, {});
  const p = t.newPasswordPage;
  return (
    <form action={action} noValidate className="flex flex-col gap-5">
      <input type="hidden" name="locale" value={locale} />
      <FormAlert>{state.error && t.errors[state.error]}</FormAlert>
      <PasswordField
        name="password"
        autoComplete="new-password"
        label={p.password}
        placeholder={t.signUpPage.passwordPlaceholder}
        hint={format(t.signUpPage.passwordHint, { min: MIN_PASSWORD_LENGTH })}
        error={errorText(t, state, 'password')}
        showLabel={t.show}
        hideLabel={t.hide}
        minLength={MIN_PASSWORD_LENGTH}
        required
      />
      <SubmitButton>{p.submit}</SubmitButton>
    </form>
  );
}
