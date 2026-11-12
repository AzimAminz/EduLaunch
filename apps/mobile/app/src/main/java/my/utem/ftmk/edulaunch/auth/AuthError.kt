package my.utem.ftmk.edulaunch.auth

/** Why an account request failed; each one has its own message (strings.xml, error_*). */
enum class AuthError {
    INVALID_CREDENTIALS,
    EMAIL_TAKEN,
    EMAIL_NOT_CONFIRMED,
    EMAIL_INVALID,
    PASSWORD_SHORT,
    RATE_LIMITED,
    /** The server could not be reached (no internet, or the backend is not running). */
    NETWORK,
    GENERIC,
}

/**
 * Supabase Auth error codes → what the student is told. The same table as the web
 * (apps/web/lib/auth/errors.ts); unknown codes get the general message, so raw server text never shows.
 */
fun authErrorFor(code: String?): AuthError = when (code) {
    "invalid_credentials" -> AuthError.INVALID_CREDENTIALS
    "user_already_exists", "email_exists" -> AuthError.EMAIL_TAKEN
    "email_not_confirmed" -> AuthError.EMAIL_NOT_CONFIRMED
    "email_address_invalid" -> AuthError.EMAIL_INVALID
    "weak_password" -> AuthError.PASSWORD_SHORT
    "over_request_rate_limit", "over_email_send_rate_limit" -> AuthError.RATE_LIMITED
    else -> AuthError.GENERIC
}
