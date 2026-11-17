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
import my.utem.ftmk.edulaunch.ui.checkFields
import my.utem.ftmk.edulaunch.ui.messageFor
import my.utem.ftmk.edulaunch.ui.openOnce
import my.utem.ftmk.edulaunch.ui.setBusy
import my.utem.ftmk.edulaunch.ui.setUpScreen
import my.utem.ftmk.edulaunch.ui.showAlert

/** M / Pulihkan akses akaun. Sending goes on to "Semak peti masuk"; "Ubah e-mel" there comes back here. */
class ForgotPasswordActivity : AppCompatActivity() {
    private lateinit var email: FormField
    private lateinit var alert: TextView
    private lateinit var submit: MaterialButton

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setUpScreen(R.layout.activity_forgot_password)

        val emailInput = findViewById<EditText>(R.id.input_email)
        email = FormField(emailInput, findViewById(R.id.error_email))
        if (savedInstanceState == null) emailInput.setText(intent.getStringExtra(EXTRA_EMAIL).orEmpty())
        alert = findViewById(R.id.form_alert)
        submit = findViewById(R.id.button_send)

        emailInput.setOnEditorActionListener { _, _, _ -> send(); true }
        submit.setOnClickListener { send() }
        findViewById<MaterialButton>(R.id.button_back).setOnClickListener { finish() }
    }

    private fun send() {
        if (!submit.isEnabled) return
        alert.showAlert(null)
        if (!checkFields(email to AuthValidation.email(email.text))) return

        setBusy(true, submit)
        lifecycleScope.launch {
            val error = AccountService.requestPasswordReset(email.text, appLanguage)
            setBusy(false, submit)
            if (error == null) openOnce(CheckInboxActivity::class.java) else alert.showAlert(messageFor(error))
        }
    }

    companion object {
        const val EXTRA_EMAIL = "email"
    }
}
