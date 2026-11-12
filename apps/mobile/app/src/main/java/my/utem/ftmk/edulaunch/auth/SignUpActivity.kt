package my.utem.ftmk.edulaunch.auth

import android.os.Bundle
import android.view.View
import android.widget.CheckBox
import android.widget.EditText
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import androidx.core.view.isVisible
import androidx.lifecycle.lifecycleScope
import com.google.android.material.button.MaterialButton
import kotlinx.coroutines.launch
import my.utem.ftmk.edulaunch.R
import my.utem.ftmk.edulaunch.onboarding.OnboardingActivity
import my.utem.ftmk.edulaunch.ui.FormField
import my.utem.ftmk.edulaunch.ui.appLanguage
import my.utem.ftmk.edulaunch.ui.bindPasswordToggle
import my.utem.ftmk.edulaunch.ui.checkFields
import my.utem.ftmk.edulaunch.ui.messageFor
import my.utem.ftmk.edulaunch.ui.openFresh
import my.utem.ftmk.edulaunch.ui.openOnce
import my.utem.ftmk.edulaunch.ui.setBusy
import my.utem.ftmk.edulaunch.ui.setUpScreen
import my.utem.ftmk.edulaunch.ui.showAlert

/** M / Cipta akaun EduLaunch. A new account goes on to onboarding (step 2 of 3). */
class SignUpActivity : AppCompatActivity() {
    private lateinit var name: FormField
    private lateinit var email: FormField
    private lateinit var password: FormField
    private lateinit var consent: CheckBox
    private lateinit var consentBox: View
    private lateinit var consentError: View
    private lateinit var alert: TextView
    private lateinit var submit: MaterialButton

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setUpScreen(R.layout.activity_sign_up)

        val passwordInput = findViewById<EditText>(R.id.input_password)
        name = FormField(findViewById(R.id.input_name), findViewById(R.id.error_name))
        email = FormField(findViewById(R.id.input_email), findViewById(R.id.error_email))
        password = FormField(passwordInput, findViewById(R.id.error_password))
        bindPasswordToggle(passwordInput, findViewById(R.id.toggle_password))

        consent = findViewById(R.id.check_consent)
        consentBox = findViewById(R.id.consent_box)
        consentError = findViewById(R.id.error_consent)
        consent.setOnCheckedChangeListener { _, checked -> if (checked) showConsentError(false) }
        alert = findViewById(R.id.form_alert)
        submit = findViewById(R.id.button_sign_up)

        submit.setOnClickListener { signUp() }
        findViewById<MaterialButton>(R.id.button_have_account).setOnClickListener { openOnce(LoginActivity::class.java) }
    }

    private fun signUp() {
        if (!submit.isEnabled) return
        alert.showAlert(null)
        val fieldsValid = checkFields(
            name to AuthValidation.name(name.text),
            email to AuthValidation.email(email.text),
            password to AuthValidation.newPassword(password.text),
        )
        showConsentError(!consent.isChecked)
        if (!fieldsValid || !consent.isChecked) return

        setBusy(true, submit)
        lifecycleScope.launch {
            when (val result = AccountService.signUp(name.text, email.text, password.text, appLanguage)) {
                SignUpResult.SignedIn -> openFresh(OnboardingActivity::class.java)
                SignUpResult.CheckEmail -> {
                    setBusy(false, submit)
                    openOnce(CheckInboxActivity::class.java)
                }
                is SignUpResult.Failed -> {
                    setBusy(false, submit)
                    when (result.error) {
                        AuthError.EMAIL_INVALID -> email.show(FieldError.EMAIL)
                        AuthError.PASSWORD_SHORT -> password.show(FieldError.PASSWORD_SHORT)
                        else -> alert.showAlert(messageFor(result.error))
                    }
                }
            }
        }
    }

    private fun showConsentError(show: Boolean) {
        consentError.isVisible = show
        consentBox.setBackgroundResource(if (show) R.drawable.bg_card_error else R.drawable.bg_card)
    }
}
