package my.utem.ftmk.edulaunch.auth

import android.os.Bundle
import android.widget.EditText
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.google.android.material.button.MaterialButton
import kotlinx.coroutines.launch
import my.utem.ftmk.edulaunch.R
import my.utem.ftmk.edulaunch.ui.FormField
import my.utem.ftmk.edulaunch.ui.appLanguage
import my.utem.ftmk.edulaunch.ui.bindPasswordToggle
import my.utem.ftmk.edulaunch.ui.checkFields
import my.utem.ftmk.edulaunch.ui.messageFor
import my.utem.ftmk.edulaunch.ui.openOnce
import my.utem.ftmk.edulaunch.ui.setBusy
import my.utem.ftmk.edulaunch.ui.setUpScreen
import my.utem.ftmk.edulaunch.ui.showAlert

/** M15 / Sign in. */
class LoginActivity : AppCompatActivity() {
    private lateinit var email: FormField
    private lateinit var password: FormField
    private lateinit var alert: TextView
    private lateinit var submit: MaterialButton

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setUpScreen(R.layout.activity_login)

        val emailInput = findViewById<EditText>(R.id.input_email)
        val passwordInput = findViewById<EditText>(R.id.input_password)
        email = FormField(emailInput, findViewById(R.id.error_email))
        password = FormField(passwordInput, findViewById(R.id.error_password))
        bindPasswordToggle(passwordInput, findViewById<TextView>(R.id.toggle_password))
        alert = findViewById(R.id.form_alert)
        submit = findViewById(R.id.button_sign_in)

        submit.setOnClickListener { signIn() }
        passwordInput.setOnEditorActionListener { _, _, _ -> signIn(); true }
        findViewById<MaterialButton>(R.id.button_create_account).setOnClickListener { openOnce(SignUpActivity::class.java) }
        findViewById<MaterialButton>(R.id.button_forgot).setOnClickListener {
            // Starts the recovery form with the e-mail already typed here.
            openOnce(ForgotPasswordActivity::class.java) { putExtra(ForgotPasswordActivity.EXTRA_EMAIL, email.text.trim()) }
        }
    }

    private fun signIn() {
        if (!submit.isEnabled) return
        alert.showAlert(null)
        val valid = checkFields(
            email to AuthValidation.email(email.text),
            password to AuthValidation.currentPassword(password.text),
        )
        if (!valid) return

        setBusy(true, submit)
        lifecycleScope.launch {
            val error = AccountService.signIn(email.text, password.text, appLanguage)
            if (error == null) {
                openSignedInStart()
                return@launch
            }
            setBusy(false, submit)
            if (error == AuthError.EMAIL_INVALID) email.show(FieldError.EMAIL) else alert.showAlert(messageFor(error))
        }
    }
}
