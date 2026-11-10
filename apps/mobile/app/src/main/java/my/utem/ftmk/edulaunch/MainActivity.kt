package my.utem.ftmk.edulaunch

import android.graphics.Color
import android.os.Bundle
import android.widget.TextView
import androidx.activity.SystemBarStyle
import androidx.activity.enableEdgeToEdge
import androidx.appcompat.app.AppCompatActivity
import androidx.appcompat.app.AppCompatDelegate
import androidx.core.os.LocaleListCompat
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat

/** Welcome screen. "Jom mula" (button_start) and "Log masuk" (link_login) get wired up once those screens exist. */
class MainActivity : AppCompatActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        // Bahasa Melayu until the student picks a language, as on the web; their pick is kept after that.
        if (AppCompatDelegate.getApplicationLocales().isEmpty) {
            AppCompatDelegate.setApplicationLocales(LocaleListCompat.forLanguageTags("ms"))
        }
        super.onCreate(savedInstanceState)
        // Light background, so dark status and navigation bar icons.
        enableEdgeToEdge(
            statusBarStyle = SystemBarStyle.light(Color.TRANSPARENT, Color.TRANSPARENT),
            navigationBarStyle = SystemBarStyle.light(Color.TRANSPARENT, Color.TRANSPARENT),
        )
        setContentView(R.layout.activity_main)
        ViewCompat.setOnApplyWindowInsetsListener(findViewById(R.id.main)) { v, insets ->
            val systemBars = insets.getInsets(WindowInsetsCompat.Type.systemBars())
            v.setPadding(systemBars.left, systemBars.top, systemBars.right, systemBars.bottom)
            insets
        }
        // The link names the other language; tapping it switches the whole app (the screen redraws itself).
        findViewById<TextView>(R.id.language_switch).setOnClickListener {
            val english = resources.configuration.locales[0].language == "en"
            AppCompatDelegate.setApplicationLocales(LocaleListCompat.forLanguageTags(if (english) "ms" else "en"))
        }
    }
}
