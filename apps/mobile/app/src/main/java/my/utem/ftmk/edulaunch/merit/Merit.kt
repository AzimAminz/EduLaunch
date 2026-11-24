package my.utem.ftmk.edulaunch.merit

import android.view.Gravity
import android.widget.TextView
import my.utem.ftmk.edulaunch.R
import my.utem.ftmk.edulaunch.explore.ExploreActivity
import my.utem.ftmk.edulaunch.home.BlockActivity
import my.utem.ftmk.edulaunch.home.Tab
import my.utem.ftmk.edulaunch.roadmap.RoadmapActivity
import my.utem.ftmk.edulaunch.ui.Blocks
import my.utem.ftmk.edulaunch.ui.Tone
import my.utem.ftmk.edulaunch.ui.openOnce

// Figma section "5 · Kelayakan & Merit Lab".

/** M14 / Eligibility breakdown: what is known, what waits for an official source. */
class EligibilityActivity : BlockActivity(Tab.MERIT_LAB) {
    override fun Blocks.build() {
        eyebrow(R.string.elig_eyebrow)
        title(R.string.elig_title)
        intro(R.string.elig_intro)
        badge(str(R.string.elig_badge))
        infoCard(str(R.string.elig_academic_title), str(R.string.elig_academic_body), Tone.MINT)
        infoCard(str(R.string.elig_requirements_title), str(R.string.elig_requirements_body), Tone.YELLOW)
        infoCard(str(R.string.elig_interview_title), str(R.string.elig_interview_body), Tone.WHITE)
        button(R.string.elig_alternatives, radius = 16, wrap = true) { openOnce(ExploreActivity::class.java) }
    }
}

private val spmScale = listOf("A+", "A", "A-", "B+", "B", "C+", "C", "D", "E", "G")

/** Sample points per grade; the real formula depends on the session and category (see the note on screen). */
private fun points(grade: String) = when (grade) {
    "A+" -> 18; "A" -> 16; "A-" -> 14; "B+" -> 12; "B" -> 10; "C+" -> 8; "C" -> 6; "D" -> 4; "E" -> 2; else -> 0
}

/** M09 / Merit Lab: change a target grade and the sample merit changes with it. */
class MeritLabActivity : BlockActivity(Tab.MERIT_LAB, gap = 10) {
    private var math = "A"
    private var malay = "A"

    override fun Blocks.build() {
        eyebrow(R.string.merit_eyebrow)
        title(R.string.merit_title)
        intro(R.string.merit_intro)
        lateinit var score: TextView
        card(Tone.YELLOW) {
            text(str(R.string.merit_target_title), 19f, R.font.outfit_semibold)
            intro(R.string.merit_target_body, 14f)
            score = text("", 56f, R.font.outfit_bold)
            text(str(R.string.merit_target_from), 13f)
        }
        fun update() {
            score.text = String.format(java.util.Locale.US, "%.2f", 22.4 + 2 * points(math) + 2 * points(malay))
        }
        update()
        card {
            text(str(R.string.merit_try_title), 19f, R.font.outfit_semibold)
            gradeLine(str(R.string.subject_math), "B+", math) { math = it; update() }
            gradeLine(str(R.string.subject_bm), null, malay) { malay = it; update() }
            row(textView(str(R.string.merit_cocurricular), 16f, R.font.outfit_medium), textView(str(R.string.merit_estimate), 16f, R.font.outfit_medium))
        }
        button(R.string.merit_plan, radius = 16, wrap = true) { openOnce(RoadmapActivity::class.java) }
        text(str(R.string.merit_formula), 12f, color = R.color.muted)
    }

    /** "Matematik   [ B+ ] → [ A ]": the current grade, then the target in a box that opens the scale. */
    private fun Blocks.gradeLine(subject: String, current: String?, target: String, onPick: (String) -> Unit) {
        val picker = textView(str(R.string.merit_grade_box, target), 16f, R.font.outfit_medium).apply {
            minHeight = dp(36)
            gravity = Gravity.CENTER_VERTICAL
            contentDescription = str(R.string.subject_target, subject, target)
        }
        clickable(picker) {
            pickFrom(picker, spmScale) { i ->
                picker.text = str(R.string.merit_grade_box, spmScale[i])
                picker.contentDescription = str(R.string.subject_target, subject, spmScale[i])
                onPick(spmScale[i])
            }
        }
        val grades = if (current != null) inlineViews(textView(str(R.string.merit_from_grade, current), 16f, R.font.outfit_medium), picker) else picker
        row(textView(subject, 16f, R.font.outfit_medium), grades)
    }

    private fun Blocks.inlineViews(vararg views: android.view.View) = android.widget.LinearLayout(activity).apply {
        gravity = Gravity.CENTER_VERTICAL
        views.forEachIndexed { i, v -> addView(v, android.widget.LinearLayout.LayoutParams(-2, -2).apply { if (i > 0) marginStart = dp(4) }) }
    }
}
