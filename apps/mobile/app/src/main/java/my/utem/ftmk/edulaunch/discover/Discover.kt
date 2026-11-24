package my.utem.ftmk.edulaunch.discover

import android.view.Gravity
import android.widget.ImageView
import android.widget.LinearLayout
import androidx.annotation.DrawableRes
import androidx.annotation.StringRes
import my.utem.ftmk.edulaunch.R
import my.utem.ftmk.edulaunch.explore.ExploreActivity
import my.utem.ftmk.edulaunch.home.AcademicProfileActivity
import my.utem.ftmk.edulaunch.home.BlockActivity
import my.utem.ftmk.edulaunch.home.Detail
import my.utem.ftmk.edulaunch.home.FeaturePage
import my.utem.ftmk.edulaunch.home.FeaturePageActivity
import my.utem.ftmk.edulaunch.home.Go
import my.utem.ftmk.edulaunch.home.PageAction
import my.utem.ftmk.edulaunch.roadmap.BuildRoadmapActivity
import my.utem.ftmk.edulaunch.ui.Blocks
import my.utem.ftmk.edulaunch.ui.ButtonStyle
import my.utem.ftmk.edulaunch.ui.Tone
import my.utem.ftmk.edulaunch.ui.openOnce

// Figma section "6 · Kenali diri": the interest quiz, its result, short field experiences and a reflection.
// The questions and scores are the design's sample until the assessment service is connected.

private val questions = listOf(R.string.quiz_q1, R.string.quiz_q2, R.string.quiz_q3, R.string.quiz_q4, R.string.quiz_q5, R.string.quiz_q6)
private val answers = listOf(R.string.quiz_strongly_agree, R.string.quiz_agree, R.string.quiz_disagree_a_bit, R.string.quiz_disagree)

/** M04 / Psychometric question and M04b (an answer picked): one statement at a time. */
class QuizActivity : BlockActivity(activeTab = null, gap = 12, showTabs = false) {
    private var index = 0
    private var picked: Int? = null

    override fun Blocks.build() {
        badge(str(R.string.quiz_badge, index + 1, questions.size), Tone.BLUE)
        progress((index + 1f) / questions.size)
        eyebrow(R.string.quiz_eyebrow)
        title(questions[index])
        intro(R.string.quiz_hint)
        picture(R.drawable.rimau_detective, 75)
        answers.forEachIndexed { i, answer ->
            button(answer, style = ButtonStyle.PLAIN, radius = 16) { picked = i; rebuild() }.apply {
                gravity = Gravity.START or Gravity.CENTER_VERTICAL
                setPadding(dp(16), 0, dp(16), 0)
                isSelected = picked == i
                if (picked == i) {
                    backgroundTintList = android.content.res.ColorStateList.valueOf(getColor(R.color.yellow))
                    strokeWidth = dp(2)
                    setStrokeColorResource(R.color.navy)
                }
            }
        }
        button(R.string.quiz_next, R.drawable.ic_arrow_right, iconAtEnd = true, radius = 16) {
            if (index < questions.lastIndex) {
                index++; picked = null; rebuild()
                (blocks.column.parent as? android.widget.ScrollView)?.scrollTo(0, 0)
            } else {
                openOnce(DiscoveringActivity::class.java); finish()
            }
        }.isEnabled = picked != null
    }
}

/** M05 / Discovering results, then M05b / Loading · reveal, then the result. */
class DiscoveringActivity : BlockActivity(activeTab = null, showTabs = false) {
    private var revealed = false

    override fun Blocks.build() {
        eyebrow(R.string.discover_eyebrow)
        title(R.string.discover_title)
        intro(R.string.discover_intro)
        picture(if (revealed) R.drawable.rimau_scientist else R.drawable.rimau_detective, 280)
        progress(if (revealed) 0.97f else 0.7f)
        badge(str(R.string.discover_badge))
        text(str(R.string.discover_note), 14f, color = R.color.muted)
    }

    override fun onResume() {
        super.onResume()
        val column = blocks.column
        column.postDelayed({ revealed = true; rebuild() }, 1500)
        column.postDelayed({ openOnce(InterestResultActivity::class.java); finish() }, 3000)
    }

    override fun onPause() {
        super.onPause()
        blocks.column.handler?.removeCallbacksAndMessages(null)
    }
}

/** M06 / Interest result. */
class InterestResultActivity : BlockActivity(activeTab = null, gap = 9) {
    override fun Blocks.build() {
        eyebrow(R.string.result_eyebrow)
        title(R.string.result_title)
        intro(R.string.result_intro)
        picture(R.drawable.rimau_cheer, 236)
        card {
            text(str(R.string.result_pattern), 19f, R.font.outfit_semibold)
            listOf(R.string.riasec_investigative to 0.88f, R.string.riasec_realistic to 0.72f, R.string.riasec_social to 0.48f).forEach { (name, score) ->
                text(str(name), 13f)
                progress(score)
            }
        }
        button(R.string.result_try, radius = 16, wrap = true) { openOnce(FieldDiscoveryActivity::class.java) }
        text(str(R.string.result_note), 12f, color = R.color.muted)
    }
}

/** The three short experiences. */
enum class Experience(
    @StringRes val cardTitle: Int,
    @StringRes val cardBody: Int,
    @DrawableRes val picture: Int,
    val tone: Tone,
    @StringRes val title: Int,
    @StringRes val intro: Int,
    val steps: List<Int>,
) {
    LOGIC(R.string.field_logic_title, R.string.field_logic_body, R.drawable.world_technology, Tone.BLUE,
        R.string.exp_logic_title, R.string.exp_logic_intro, listOf(R.string.exp_logic_1, R.string.exp_logic_2, R.string.exp_logic_3)),
    SPACE(R.string.field_space_title, R.string.field_space_body, R.drawable.world_design, Tone.YELLOW,
        R.string.exp_space_title, R.string.exp_space_intro, listOf(R.string.exp_space_1, R.string.exp_space_2, R.string.exp_space_3)),
    HELP(R.string.field_help_title, R.string.field_help_body, R.drawable.rimau_cheer, Tone.MINT,
        R.string.exp_help_title, R.string.exp_help_intro, listOf(R.string.exp_help_1, R.string.exp_help_2, R.string.exp_help_3)),
}

/** M17 / Guided field discovery: pick one of three short experiences. */
class FieldDiscoveryActivity : BlockActivity(activeTab = null, showTabs = false) {
    override fun Blocks.build() {
        eyebrow(R.string.field_eyebrow)
        title(R.string.field_title)
        intro(R.string.field_intro)
        Experience.entries.forEachIndexed { i, exp ->
            val box = card(exp.tone, onClick = { openOnce(ExperienceActivity::class.java) { putExtra("experience", exp.name) } }) {
                val texts = LinearLayout(activity).apply { orientation = LinearLayout.VERTICAL }
                Blocks(activity, texts, 9).apply {
                    text(str(exp.cardTitle), 19f, R.font.outfit_semibold)
                    intro(exp.cardBody, 14f)
                    badge(str(R.string.field_activity, i + 1), exp.tone)
                }
                add(LinearLayout(activity).apply {
                    gravity = Gravity.CENTER_VERTICAL
                    addView(texts, LinearLayout.LayoutParams(0, -2, 1f))
                    addView(ImageView(activity).apply {
                        setImageResource(exp.picture)
                        importantForAccessibility = android.view.View.IMPORTANT_FOR_ACCESSIBILITY_NO
                    }, LinearLayout.LayoutParams(dp(112), dp(112)))
                }, 0)
            }
            box.contentDescription = str(exp.cardTitle)
        }
        text(str(R.string.field_note), 12f, color = R.color.muted)
    }
}

/** M18 / Hands-on, M18b / Creative and M18c / Community exploration: put the missing step in place. */
class ExperienceActivity : BlockActivity(activeTab = null, showTabs = false) {
    private var placed = false

    override fun Blocks.build() {
        val exp = Experience.entries.find { it.name == intent.getStringExtra("experience") } ?: Experience.LOGIC
        eyebrow(R.string.exp_eyebrow).text = str(R.string.exp_eyebrow, exp.ordinal + 1)
        title(exp.title)
        intro(exp.intro)
        progress(if (placed) 1f else 0.33f)
        card(Tone.NAVY, radius = 24, padding = 18, innerGap = 12) {
            exp.steps.forEachIndexed { i, step ->
                val missing = i == 1 && !placed
                val number = String.format(java.util.Locale.US, "%02d", i + 1)
                val row = LinearLayout(activity).apply {
                    setBackgroundColor(getColor(if (missing) R.color.yellow else R.color.white))
                    setPadding(dp(15), dp(15), dp(15), dp(15))
                    addView(textView(if (missing) "?" else number, 12f, R.font.outfit_medium).apply {
                        background = rounded(if (missing) Tone.WHITE else Tone.BLUE, 12)
                        setPadding(dp(9), dp(9), dp(9), dp(9))
                    }, LinearLayout.LayoutParams(dp(90), -2))
                    addView(textView(str(step), 15f, R.font.outfit_medium), LinearLayout.LayoutParams(0, -2, 1f).apply { marginStart = dp(12) })
                }
                if (missing) {
                    row.contentDescription = str(R.string.exp_place_step, number) + ": " + str(step)
                    clickable(row) { placed = true; rebuild() }
                }
                add(row)
            }
        }
        button(R.string.exp_done, R.drawable.ic_arrow_right, iconAtEnd = true, style = ButtonStyle.YELLOW, radius = 16) {
            openOnce(ReflectionActivity::class.java)
        }
        button(R.string.exp_other, R.drawable.ic_arrow_right, iconAtEnd = true, style = ButtonStyle.PLAIN, radius = 16) {
            openOnce(FieldDiscoveryActivity::class.java)
        }
        text(str(R.string.exp_note), 12f, color = R.color.muted)
    }
}

/** M / Bagaimana pengalaman tadi? */
class ReflectionActivity : BlockActivity(activeTab = null) {
    private var choice = 0

    override fun Blocks.build() {
        eyebrow(R.string.reflect_eyebrow)
        title(R.string.reflect_title)
        intro(R.string.reflect_intro, 16f)
        illustration(R.drawable.rimau_artist)
        listOf(
            R.string.reflect_again_title to R.string.reflect_again_body,
            R.string.reflect_unsure_title to R.string.reflect_unsure_body,
            R.string.reflect_other_title to R.string.reflect_other_body,
        ).forEachIndexed { i, (title, body) ->
            val chosen = i == choice
            card(if (chosen) Tone.BLUE else Tone.WHITE, radius = 14, innerGap = 10, stroke = if (chosen) Tone.NAVY else null, onClick = { choice = i; rebuild() }) {
                text(str(title), 19f, R.font.outfit_semibold)
                intro(body, 15f)
            }.apply {
                isSelected = chosen
                if (chosen) (background as android.graphics.drawable.GradientDrawable).setStroke(dp(2), getColor(R.color.navy))
            }
        }
        button(if (choice == 0) R.string.reflect_choose_again else R.string.reflect_continue, R.drawable.ic_refresh) {
            openOnce(NextOptionsActivity::class.java)
        }
        button(R.string.reflect_other_activity, R.drawable.ic_arrow_right, iconAtEnd = true, style = ButtonStyle.OUTLINED) {
            openOnce(FieldDiscoveryActivity::class.java)
        }
    }
}

/** M / Pilihan untuk diteroka seterusnya. */
val nextOptionsPage = FeaturePage(
    eyebrow = R.string.next_eyebrow, title = R.string.next_title, intro = R.string.next_intro,
    illustration = R.drawable.world_technology, activeTab = null,
    details = listOf(
        Detail(R.string.next_tech_title, R.string.next_tech_body),
        Detail(R.string.next_design_title, R.string.next_design_body),
    ),
    actions = listOf(
        PageAction(R.string.next_check_programs, R.drawable.ic_check_circle, Go.To(ExploreActivity::class.java)),
        PageAction(R.string.next_build_roadmap, R.drawable.ic_tab_route, Go.To(BuildRoadmapActivity::class.java)),
        PageAction(R.string.next_edit_academic, R.drawable.ic_action_pencil, Go.To(AcademicProfileActivity::class.java)),
    ),
)

class NextOptionsActivity : FeaturePageActivity(nextOptionsPage)
