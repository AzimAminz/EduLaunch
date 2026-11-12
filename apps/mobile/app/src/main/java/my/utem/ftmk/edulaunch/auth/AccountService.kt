package my.utem.ftmk.edulaunch.auth

import android.util.Log
import io.github.jan.supabase.auth.exception.AuthRestException
import io.github.jan.supabase.auth.providers.builtin.Email
import io.github.jan.supabase.exceptions.RestException
import java.io.IOException
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone
import kotlinx.coroutines.CancellationException
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.jsonPrimitive
import kotlinx.serialization.json.put
import my.utem.ftmk.edulaunch.BuildConfig
import my.utem.ftmk.edulaunch.data.Backend

sealed interface SignUpResult {
    /** E-mail confirmation is off (local development): the new account is signed in already. */
    data object SignedIn : SignUpResult
    /** E-mail confirmation is on: the student opens the link we sent first. */
    data object CheckEmail : SignUpResult
    data class Failed(val error: AuthError) : SignUpResult
}

/** Accounts with Supabase Auth, doing what the web's server actions do (apps/web/lib/auth/actions.ts). */
object AccountService {
    private val auth get() = Backend.auth

    /** Waits for a saved session to load. True when someone is signed in on this phone. */
    suspend fun restoreSession(): Boolean {
        auth.awaitInitialization()
        return auth.currentSessionOrNull() != null
    }

    val signedInEmail: String? get() = auth.currentUserOrNull()?.email

    /** [locale] is "ms" or "en"; later e-mails (such as "forgot password") use it. */
    suspend fun signIn(email: String, password: String, locale: String): AuthError? = attempt {
        auth.signInWith(Email) {
            this.email = email.trim()
            this.password = password
        }
        rememberLocale(locale)
    }

    suspend fun signUp(name: String, email: String, password: String, locale: String): SignUpResult {
        var user: io.github.jan.supabase.auth.user.UserInfo? = null
        val error = attempt {
            user = auth.signUpWith(Email) {
                this.email = email.trim()
                this.password = password
                // full_name and consented_at are read by the profile service; locale picks the e-mail language.
                data = buildJsonObject {
                    put("full_name", name.trim())
                    put("consented_at", isoNow())
                    put("locale", locale)
                }
            }
        }
        if (error != null) return SignUpResult.Failed(error)
        // With e-mail confirmation on, Supabase hides existing accounts: no identities means "already registered".
        if (user?.identities?.isEmpty() == true) return SignUpResult.Failed(AuthError.EMAIL_TAKEN)
        return if (auth.currentSessionOrNull() != null) SignUpResult.SignedIn else SignUpResult.CheckEmail
    }

    /**
     * Sends the recovery e-mail. Its link opens the website's "new password" page.
     * As on the web, unknown e-mails are not reported (nobody can find out who has an account);
     * only a rate limit or an unreachable server is.
     */
    suspend fun requestPasswordReset(email: String, locale: String): AuthError? {
        val error = attempt {
            auth.resetPasswordForEmail(
                email = email.trim(),
                redirectUrl = "${BuildConfig.WEB_URL}/$locale/auth/callback?next=/$locale/kata-laluan-baharu",
            )
        }
        return error.takeIf { it == AuthError.RATE_LIMITED || it == AuthError.NETWORK }
    }

    /** Ends the session on this phone, even if the server cannot be told. */
    suspend fun signOut() {
        if (attempt { auth.signOut() } != null) auth.clearSession()
    }

    private suspend fun rememberLocale(locale: String) {
        val saved = auth.currentUserOrNull()?.userMetadata?.get("locale")?.jsonPrimitive?.content
        if (saved == locale) return
        // Not worth failing the sign-in for.
        attempt { auth.updateUser { data { put("locale", locale) } } }
    }

    /** Runs [block]; returns null when it worked, or why it did not. */
    private suspend fun attempt(block: suspend () -> Unit): AuthError? = try {
        block()
        null
    } catch (e: CancellationException) {
        throw e
    } catch (e: AuthRestException) {
        Log.w(TAG, "Supabase Auth refused the request", e)
        authErrorFor(e.errorCode?.value ?: e.error)
    } catch (e: RestException) {
        Log.w(TAG, "Supabase Auth refused the request", e)
        authErrorFor(e.error)
    } catch (e: IOException) {
        Log.w(TAG, "Supabase Auth could not be reached", e)
        AuthError.NETWORK
    } catch (e: Exception) {
        Log.w(TAG, "Account request failed", e)
        AuthError.GENERIC
    }

    private const val TAG = "AccountService"

    private fun isoNow(): String =
        SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US).apply { timeZone = TimeZone.getTimeZone("UTC") }.format(Date())
}
