package my.utem.ftmk.edulaunch.ui

import android.text.method.PasswordTransformationMethod
import android.widget.EditText
import android.widget.TextView
import androidx.core.view.isVisible
import androidx.core.widget.doAfterTextChanged
import my.utem.ftmk.edulaunch.R
import my.utem.ftmk.edulaunch.auth.AuthValidation
import my.utem.ftmk.edulaunch.auth.FieldError

/** A text field with its error line underneath. The error goes away as soon as the student types again. */
class FormField(private val input: EditText, private val errorView: TextView) {
    val text: String get() = input.text.toString()

    init {
        input.doAfterTextChanged { if (errorView.isVisible) show(null) }
    }

    fun show(error: FieldError?) {
        errorView.isVisible = error != null
        errorView.text = error?.let { messageFor(it) }
        input.setBackgroundResource(if (error == null) R.drawable.bg_field else R.drawable.bg_field_error)
    }

    fun focus() = input.requestFocus()

    private fun messageFor(error: FieldError): String {
        val res = input.resources
        return when (error) {
            FieldError.REQUIRED -> res.getString(R.string.error_required)
            FieldError.EMAIL -> res.getString(R.string.error_email)
            FieldError.PASSWORD_SHORT -> res.getString(R.string.error_password_short, AuthValidation.MIN_PASSWORD_LENGTH)
            FieldError.TOO_LONG -> res.getString(R.string.error_too_long)
        }
    }
}

/** Shows every field's error at once and moves to the first one. Returns true when nothing is wrong. */
fun checkFields(vararg checks: Pair<FormField, FieldError?>): Boolean {
    checks.forEach { (field, error) -> field.show(error) }
    checks.firstOrNull { it.second != null }?.first?.focus()
    return checks.all { it.second == null }
}

/** "Tunjuk" / "Sembunyi" inside a password field. */
fun bindPasswordToggle(input: EditText, toggle: TextView) {
    toggle.setOnClickListener {
        val hidden = input.transformationMethod is PasswordTransformationMethod
        input.transformationMethod = if (hidden) null else PasswordTransformationMethod.getInstance()
        input.setSelection(input.text.length)
        toggle.setText(if (hidden) R.string.auth_hide else R.string.auth_show)
    }
}
