import { describe, expect, it } from 'vitest';
import { NewPasswordForm, SignInForm, SignUpForm, parseForm } from './schemas';

const form = (values: Record<string, string>) => {
  const data = new FormData();
  for (const [k, v] of Object.entries(values)) data.set(k, v);
  return data;
};

describe('parseForm', () => {
  it('accepts a correct sign-in and trims the e-mail', () => {
    expect(parseForm(SignInForm, form({ email: '  aina@contoh.com ', password: 'x' }))).toEqual({ ok: true, data: { email: 'aina@contoh.com', password: 'x' } });
  });

  it('reports each problem field once, as a dictionary key', () => {
    expect(parseForm(SignInForm, form({ email: 'bukan-emel', password: '' }))).toEqual({ ok: false, fieldErrors: { email: 'email', password: 'required' } });
  });

  it('treats missing fields as required', () => {
    expect(parseForm(SignInForm, new FormData())).toEqual({ ok: false, fieldErrors: { email: 'required', password: 'required' } });
  });

  it('needs a name, a password of 8 characters and consent to sign up', () => {
    const result = parseForm(SignUpForm, form({ fullName: ' ', email: 'aina@contoh.com', password: '1234567' }));
    expect(result).toEqual({ ok: false, fieldErrors: { fullName: 'required', password: 'passwordShort', consent: 'consent' } });
  });

  it('accepts a complete sign-up', () => {
    const result = parseForm(SignUpForm, form({ fullName: 'Aina', email: 'aina@contoh.com', password: '12345678', consent: 'on' }));
    expect(result.ok).toBe(true);
  });

  it('checks the length of a new password', () => {
    expect(parseForm(NewPasswordForm, form({ password: 'short' }))).toEqual({ ok: false, fieldErrors: { password: 'passwordShort' } });
  });
});
