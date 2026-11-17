package my.utem.ftmk.edulaunch.auth

/** What is wrong with one field; the screen turns it into text in the student's language. */
enum class FieldError { REQUIRED, EMAIL, PASSWORD_SHORT, TOO_LONG }

/**
 * The account form rules, the same as the web's (apps/web/lib/auth/schemas.ts).
 * Supabase checks them again, so these only save the student a round trip.
 */
object AuthValidation {
    const val MIN_PASSWORD_LENGTH = 8
    const val MAX_NAME_LENGTH = 120

    private val EMAIL = Regex("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$")

    fun email(value: String): FieldError? {
        val email = value.trim()
        return when {
            email.isEmpty() -> FieldError.REQUIRED
            !EMAIL.matches(email) -> FieldError.EMAIL
            else -> null
        }
    }

    /** Signing in only needs something typed; the server says whether it is right. */
    fun currentPassword(value: String): FieldError? = if (value.isEmpty()) FieldError.REQUIRED else null

    fun newPassword(value: String): FieldError? = when {
        value.isEmpty() -> FieldError.REQUIRED
        value.length < MIN_PASSWORD_LENGTH -> FieldError.PASSWORD_SHORT
        else -> null
    }

    fun name(value: String): FieldError? {
        val name = value.trim()
        return when {
            name.isEmpty() -> FieldError.REQUIRED
            name.length > MAX_NAME_LENGTH -> FieldError.TOO_LONG
            else -> null
        }
    }
}
