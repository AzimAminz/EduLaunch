package my.utem.ftmk.edulaunch.ui

import android.content.Context
import android.view.View
import android.widget.TextView
import androidx.annotation.StringRes
import androidx.core.view.isVisible
import my.utem.ftmk.edulaunch.R
import my.utem.ftmk.edulaunch.auth.AuthError
import my.utem.ftmk.edulaunch.auth.AuthValidation

/** Shows [message] in a form's alert box (Edulaunch.FormAlert), or hides the box when null. */
fun TextView.showAlert(@StringRes message: Int?) {
    isVisible = message != null
    // The extra argument fills error_password_short's %1$d; other messages ignore it.
    if (message != null) text = resources.getString(message, AuthValidation.MIN_PASSWORD_LENGTH)
}

@StringRes
fun messageFor(error: AuthError): Int = when (error) {
    AuthError.INVALID_CREDENTIALS -> R.string.error_invalid_credentials
    AuthError.EMAIL_TAKEN -> R.string.error_email_taken
    AuthError.EMAIL_NOT_CONFIRMED -> R.string.error_email_not_confirmed
    AuthError.EMAIL_INVALID -> R.string.error_email
    AuthError.PASSWORD_SHORT -> R.string.error_password_short
    AuthError.RATE_LIMITED -> R.string.error_rate_limited
    AuthError.NETWORK -> R.string.error_network
    AuthError.GENERIC -> R.string.error_generic
}

/** While a request is on its way, its buttons cannot be pressed again. */
fun setBusy(busy: Boolean, vararg views: View) = views.forEach { it.isEnabled = !busy }

/** "ms" or "en": the language the app shows now, sent with account requests so e-mails match it. */
val Context.appLanguage: String
    get() = if (resources.configuration.locales[0].language == "en") "en" else "ms"
