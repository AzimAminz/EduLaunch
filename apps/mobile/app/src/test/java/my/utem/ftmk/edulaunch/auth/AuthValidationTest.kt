package my.utem.ftmk.edulaunch.auth

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class AuthValidationTest {
    @Test
    fun `email must be filled in and look like an address`() {
        assertEquals(FieldError.REQUIRED, AuthValidation.email(""))
        assertEquals(FieldError.REQUIRED, AuthValidation.email("   "))
        assertEquals(FieldError.EMAIL, AuthValidation.email("aminah"))
        assertEquals(FieldError.EMAIL, AuthValidation.email("aminah@contoh"))
        assertEquals(FieldError.EMAIL, AuthValidation.email("ami nah@contoh.com"))
        assertNull(AuthValidation.email("aminah@contoh.com"))
        assertNull(AuthValidation.email("  aminah@contoh.com  "))
    }

    @Test
    fun `signing in only needs a password typed`() {
        assertEquals(FieldError.REQUIRED, AuthValidation.currentPassword(""))
        assertNull(AuthValidation.currentPassword("x"))
    }

    @Test
    fun `a new password needs at least 8 characters`() {
        assertEquals(FieldError.REQUIRED, AuthValidation.newPassword(""))
        assertEquals(FieldError.PASSWORD_SHORT, AuthValidation.newPassword("1234567"))
        assertNull(AuthValidation.newPassword("12345678"))
    }

    @Test
    fun `name is required and at most 120 characters`() {
        assertEquals(FieldError.REQUIRED, AuthValidation.name("  "))
        assertEquals(FieldError.TOO_LONG, AuthValidation.name("a".repeat(121)))
        assertNull(AuthValidation.name("Aminah binti Ali"))
        assertNull(AuthValidation.name("a".repeat(120)))
    }
}
