package my.utem.ftmk.edulaunch.auth

import org.junit.Assert.assertEquals
import org.junit.Test

class AuthErrorTest {
    @Test
    fun `Supabase codes map to the same messages as the web`() {
        assertEquals(AuthError.INVALID_CREDENTIALS, authErrorFor("invalid_credentials"))
        assertEquals(AuthError.EMAIL_TAKEN, authErrorFor("user_already_exists"))
        assertEquals(AuthError.EMAIL_TAKEN, authErrorFor("email_exists"))
        assertEquals(AuthError.EMAIL_NOT_CONFIRMED, authErrorFor("email_not_confirmed"))
        assertEquals(AuthError.EMAIL_INVALID, authErrorFor("email_address_invalid"))
        assertEquals(AuthError.PASSWORD_SHORT, authErrorFor("weak_password"))
        assertEquals(AuthError.RATE_LIMITED, authErrorFor("over_request_rate_limit"))
        assertEquals(AuthError.RATE_LIMITED, authErrorFor("over_email_send_rate_limit"))
    }

    @Test
    fun `unknown or missing codes get the general message`() {
        assertEquals(AuthError.GENERIC, authErrorFor("something_new"))
        assertEquals(AuthError.GENERIC, authErrorFor(null))
    }
}
