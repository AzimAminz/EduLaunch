import type { AuthErrorKey } from './schemas';

/**
 * Supabase Auth error codes → the message we show. Unknown codes get a general message,
 * so raw server text never reaches the screen.
 * Codes: https://supabase.com/docs/guides/auth/debugging/error-codes
 */
const BY_CODE: Record<string, AuthErrorKey> = {
  invalid_credentials: 'invalidCredentials',
  user_already_exists: 'emailTaken',
  email_exists: 'emailTaken',
  email_not_confirmed: 'emailNotConfirmed',
  email_address_invalid: 'email',
  weak_password: 'passwordShort',
  same_password: 'samePassword',
  over_request_rate_limit: 'rateLimited',
  over_email_send_rate_limit: 'rateLimited',
  flow_state_expired: 'linkExpired',
  flow_state_not_found: 'linkExpired',
  otp_expired: 'linkExpired',
  bad_code_verifier: 'linkExpired',
  session_not_found: 'linkExpired',
};

export function authErrorKey(error: { code?: string | null } | null | undefined): AuthErrorKey {
  return (error?.code && BY_CODE[error.code]) || 'generic';
}
