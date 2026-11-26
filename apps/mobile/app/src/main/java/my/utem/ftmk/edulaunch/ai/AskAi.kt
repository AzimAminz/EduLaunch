package my.utem.ftmk.edulaunch.ai

import my.utem.ftmk.edulaunch.R
import my.utem.ftmk.edulaunch.explore.EvidenceActivity
import my.utem.ftmk.edulaunch.explore.ExploreActivity
import my.utem.ftmk.edulaunch.home.BlockActivity
import my.utem.ftmk.edulaunch.home.Detail
import my.utem.ftmk.edulaunch.home.FeaturePage
import my.utem.ftmk.edulaunch.home.FeaturePageActivity
import my.utem.ftmk.edulaunch.home.Go
import my.utem.ftmk.edulaunch.home.PageAction
import my.utem.ftmk.edulaunch.home.Tab
import my.utem.ftmk.edulaunch.merit.EligibilityActivity
import my.utem.ftmk.edulaunch.ui.Blocks
import my.utem.ftmk.edulaunch.ui.ButtonStyle
import my.utem.ftmk.edulaunch.ui.openOnce

// Figma section "9 · Tanya AI bersumber". The answer is the design's sample until the AI service is connected.

/** M / Tanya dengan sumber: a question, an answer and the evidence behind it. */
class AskAiActivity : BlockActivity(Tab.HOME) {
    override fun Blocks.build() {
        eyebrow(R.string.ai_eyebrow)
        title(R.string.ai_title)
        intro(R.string.ai_intro, 16f)
        illustration(R.drawable.rimau_detective)
        textField(R.string.ai_question, "", hint = str(R.string.ai_question_hint))
        listOf(R.string.ai_answer_title to R.string.ai_answer_body, R.string.ai_evidence_title to R.string.ai_evidence_body).forEach { (title, body) ->
            card(radius = 14, innerGap = 10) {
                text(str(title), 19f, R.font.outfit_semibold)
                intro(body, 15f)
            }
        }
        button(R.string.ai_see_evidence, R.drawable.ic_arrow_right, iconAtEnd = true) { openOnce(EvidenceActivity::class.java) }
        button(R.string.ai_see_busy, R.drawable.ic_arrow_right, iconAtEnd = true, style = ButtonStyle.OUTLINED) { openOnce(AiBusyActivity::class.java) }
        button(R.string.ai_explore, R.drawable.ic_action_compass, style = ButtonStyle.OUTLINED) { openOnce(ExploreActivity::class.java) }
    }
}

/** M / AI sedang sibuk buat sementara. */
val aiBusyPage = FeaturePage(
    eyebrow = R.string.busy_eyebrow, title = R.string.busy_title, intro = R.string.busy_intro,
    illustration = R.drawable.rimau_hourglass, activeTab = Tab.HOME,
    details = listOf(
        Detail(R.string.busy_kept_title, R.string.busy_kept_body),
        Detail(R.string.busy_others_title, R.string.busy_others_body),
    ),
    actions = listOf(
        PageAction(R.string.busy_retry, R.drawable.ic_arrow_right, Go.To(AskAiActivity::class.java), iconAtEnd = true),
        PageAction(R.string.busy_eligibility, R.drawable.ic_check_circle, Go.To(EligibilityActivity::class.java)),
    ),
)

class AiBusyActivity : FeaturePageActivity(aiBusyPage)
