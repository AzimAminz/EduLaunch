package my.utem.ftmk.edulaunch.home

import android.os.Bundle
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.google.android.material.button.MaterialButton
import kotlinx.coroutines.launch
import my.utem.ftmk.edulaunch.MainActivity
import my.utem.ftmk.edulaunch.R
import my.utem.ftmk.edulaunch.auth.AccountService
import my.utem.ftmk.edulaunch.ui.openFresh
import my.utem.ftmk.edulaunch.ui.setBusy
import my.utem.ftmk.edulaunch.ui.setUpScreen

/** Temporary home until the bottom tabs (Utama, Teroka, Roadmap, Merit Lab, Profil) are built. */
class HomeActivity : AppCompatActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setUpScreen(R.layout.activity_home)

        AccountService.signedInEmail?.let { email ->
            findViewById<TextView>(R.id.signed_in_as).text = getString(R.string.home_signed_in_as, email)
        }

        val signOut = findViewById<MaterialButton>(R.id.button_sign_out)
        signOut.setOnClickListener {
            setBusy(true, signOut)
            lifecycleScope.launch {
                AccountService.signOut()
                openFresh(MainActivity::class.java)
            }
        }
    }
}
