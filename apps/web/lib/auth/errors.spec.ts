import { describe, expect, it } from 'vitest';
import { authErrorKey } from './errors';

describe('authErrorKey', () => {
  it('turns Supabase codes into messages people understand', () => {
    expect(authErrorKey({ code: 'invalid_credentials' })).toBe('invalidCredentials');
    expect(authErrorKey({ code: 'user_already_exists' })).toBe('emailTaken');
    expect(authErrorKey({ code: 'over_email_send_rate_limit' })).toBe('rateLimited');
    expect(authErrorKey({ code: 'otp_expired' })).toBe('linkExpired');
  });

  it('never shows raw server errors', () => {
    expect(authErrorKey({ code: 'unexpected_failure' })).toBe('generic');
    expect(authErrorKey({})).toBe('generic');
    expect(authErrorKey(null)).toBe('generic');
  });
});
