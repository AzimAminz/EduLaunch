package my.utem.ftmk.edulaunch

import android.os.Bundle
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import androidx.appcompat.app.AppCompatDelegate
import androidx.core.os.LocaleListCompat
import androidx.lifecycle.lifecycleScope
import com.google.android.material.button.MaterialButton
import kotlinx.coroutines.launch
import my.utem.ftmk.edulaunch.auth.AccountService
import my.utem.ftmk.edulaunch.auth.LoginActivity
import my.utem.ftmk.edulaunch.auth.SignUpActivity
import my.utem.ftmk.edulaunch.home.HomeActivity
import my.utem.ftmk.edulaunch.ui.openFresh
import my.utem.ftmk.edulaunch.ui.openOnce
import my.utem.ftmk.edulaunch.ui.setUpScreen

/**
 * Welcome screen: "Jom mula" creates an account, "Log masuk" signs in.
 * A student who is still signed in on this phone goes straight home instead.
 */
class MainActivity : AppCompatActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        // English until the student picks a language; their pick is kept after that.
        if (AppCompatDelegate.getApplicationLocales().isEmpty) {
            AppCompatDelegate.setApplicationLocales(LocaleListCompat.forLanguageTags("en"))
        }
        super.onCreate(savedInstanceState)

        // The saved session loads from the phone's storage (no network), so this is quick.
        lifecycleScope.launch {
            if (AccountService.restoreSession()) openFresh(HomeActivity::class.java) else showWelcome()
        }
    }

    private fun showWelcome() {
        setUpScreen(R.layout.activity_main)

        // The link names the other language; tapping it switches the whole app (the screen redraws itself).
        findViewById<TextView>(R.id.language_switch).setOnClickListener {
            val english = resources.configuration.locales[0].language == "en"
            AppCompatDelegate.setApplicationLocales(LocaleListCompat.forLanguageTags(if (english) "ms" else "en"))
        }
        findViewById<MaterialButton>(R.id.button_start).setOnClickListener { openOnce(SignUpActivity::class.java) }
        findViewById<TextView>(R.id.link_login).setOnClickListener { openOnce(LoginActivity::class.java) }
    }
}
