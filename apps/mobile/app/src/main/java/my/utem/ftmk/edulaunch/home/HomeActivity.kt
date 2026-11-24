package my.utem.ftmk.edulaunch.home

import android.os.Bundle
import android.view.View
import android.widget.LinearLayout
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import java.util.Calendar
import kotlinx.coroutines.launch
import my.utem.ftmk.edulaunch.R
import my.utem.ftmk.edulaunch.auth.AccountService
import my.utem.ftmk.edulaunch.discover.QuizActivity
import my.utem.ftmk.edulaunch.explore.CompareActivity
import my.utem.ftmk.edulaunch.explore.Program
import my.utem.ftmk.edulaunch.explore.RecommendationsActivity
import my.utem.ftmk.edulaunch.explore.openProgram
import my.utem.ftmk.edulaunch.onboarding.EducationLevel
import my.utem.ftmk.edulaunch.onboarding.LevelChoice
import my.utem.ftmk.edulaunch.onboarding.LevelStore
import my.utem.ftmk.edulaunch.ui.openOnce
import my.utem.ftmk.edulaunch.ui.setUpScreen

/**
 * Student home. Form 1–3 students see their own dashboard (Figma: M / Dashboard · Tingkatan 1–3), focused on
 * choosing a Form 4 stream; everyone else sees M03 / Student home. The top bar and tabs come from AppChrome.kt.
 * Things not built yet say "coming soon".
 */
class HomeActivity : AppCompatActivity() {
    /** The level this screen was drawn for; when it changes (in the academic profile, or on the server), it redraws. */
    private var shownFor: LevelChoice? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        shownFor = LevelStore.load(this)
        val level = shownFor
        if (level?.level == EducationLevel.FORM1_3) {
            setUpScreen(R.layout.activity_home_form13)
            setUpChrome(active = Tab.HOME)
            showForm13(level)
        } else {
            setUpScreen(R.layout.activity_home)
            setUpChrome(active = Tab.HOME)
            findViewById<View>(R.id.top_match).setOnClickListener { openProgram(Program.ENGINEERING) }
            findViewById<View>(R.id.button_see_all).setOnClickListener { openOnce(RecommendationsActivity::class.java) }
            findViewById<View>(R.id.button_start_quiz).setOnClickListener { openOnce(QuizActivity::class.java) }
        }

        lifecycleScope.launch {
            LevelStore.fetch(this@HomeActivity)
            redrawIfLevelChanged()
        }
    }

    override fun onResume() {
        super.onResume()
        redrawIfLevelChanged()
    }

    private fun redrawIfLevelChanged() {
        if (LevelStore.load(this) != shownFor) recreate()
    }

    private fun showForm13(level: LevelChoice) {
        val year = Calendar.getInstance().get(Calendar.YEAR)
        findViewById<TextView>(R.id.eyebrow).text = getString(R.string.dash13_eyebrow, level.formYear ?: 3, year)
        findViewById<TextView>(R.id.greeting).text = greeting()

        // Sample matches from the design until the recommendations service ranks the streams.
        val streams = findViewById<LinearLayout>(R.id.streams)
        listOf(
            R.string.stream_pure_science to true, R.string.stream_stem_technical to true,
            R.string.stream_social_arts to false, R.string.stream_tvet to false,
        ).forEach { (stream, high) ->
            val row = layoutInflater.inflate(R.layout.item_stream, streams, false)
            row.findViewById<TextView>(R.id.name).setText(stream)
            row.findViewById<TextView>(R.id.match).apply {
                setText(if (high) R.string.dash13_match_high else R.string.dash13_match_medium)
                setBackgroundResource(if (high) R.drawable.bg_pill_mint else R.drawable.bg_pill_yellow)
            }
            streams.addView(row)
        }

        findViewById<View>(R.id.button_compare).setOnClickListener { openOnce(CompareActivity::class.java) }
        findViewById<View>(R.id.button_fill_grades).setOnClickListener { openOnce(AcademicProfileActivity::class.java) }
    }

    /** "Selamat pagi, Aiman": by the time of day, with the first name given at sign-up. */
    private fun greeting(): String {
        val name = AccountService.signedInName?.trim()?.split(Regex("\\s+"))?.firstOrNull()
            ?: return getString(R.string.dash13_hello)
        val hour = Calendar.getInstance().get(Calendar.HOUR_OF_DAY)
        val text = when {
            hour < 12 -> R.string.dash13_morning
            hour < 19 -> R.string.dash13_afternoon
            else -> R.string.dash13_evening
        }
        return getString(text, name)
    }
}
