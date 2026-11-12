package my.utem.ftmk.edulaunch.auth

import android.os.Bundle
import androidx.appcompat.app.AppCompatActivity
import com.google.android.material.button.MaterialButton
import my.utem.ftmk.edulaunch.R
import my.utem.ftmk.edulaunch.ui.openOnce
import my.utem.ftmk.edulaunch.ui.setUpScreen

/** M / Semak peti masuk anda, after a recovery link was requested. */
class CheckInboxActivity : AppCompatActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setUpScreen(R.layout.activity_check_inbox)

        // Back to the sign-in screen that started the recovery, closing the recovery screens.
        findViewById<MaterialButton>(R.id.button_back).setOnClickListener { openOnce(LoginActivity::class.java) }
        // The recovery form is still underneath, with the e-mail as it was typed.
        findViewById<MaterialButton>(R.id.button_change_email).setOnClickListener { finish() }
    }
}
