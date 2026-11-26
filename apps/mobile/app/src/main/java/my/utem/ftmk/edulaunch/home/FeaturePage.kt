package my.utem.ftmk.edulaunch.home

import android.app.Activity
import android.os.Bundle
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.TextView
import androidx.annotation.DrawableRes
import androidx.annotation.StringRes
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.google.android.material.button.MaterialButton
import kotlinx.coroutines.launch
import my.utem.ftmk.edulaunch.MainActivity
import my.utem.ftmk.edulaunch.R
import my.utem.ftmk.edulaunch.auth.AccountService
import my.utem.ftmk.edulaunch.documents.DocumentsActivity
import my.utem.ftmk.edulaunch.explore.CompareActivity
import my.utem.ftmk.edulaunch.explore.EvidenceActivity
import my.utem.ftmk.edulaunch.explore.ExploreActivity
import my.utem.ftmk.edulaunch.explore.ProgramDetailActivity
import my.utem.ftmk.edulaunch.roadmap.RoadmapVersionsActivity
import my.utem.ftmk.edulaunch.onboarding.LevelStore
import my.utem.ftmk.edulaunch.ui.openFresh
import my.utem.ftmk.edulaunch.ui.openOnce
import my.utem.ftmk.edulaunch.ui.setUpScreen

/** What a button on a page does. */
sealed interface Go {
    /** Opens another page (or goes back to it if it is further back). */
    data class To(val screen: Class<out Activity>) : Go

    data object SignOut : Go

    /** Not built yet: says "coming soon". */
    data object Soon : Go
}

/** A white card with a heading and a line of text. */
data class Detail(@StringRes val title: Int, @StringRes val body: Int)

/** A button. The first one on a page is navy; the rest are white with a border. [iconAtEnd] puts the icon after the text. */
data class PageAction(
    @StringRes val text: Int,
    @DrawableRes val icon: Int,
    val go: Go,
    val iconAtEnd: Boolean = false,
)

/** Everything one page shows, in the order of the design. */
data class FeaturePage(
    @StringRes val eyebrow: Int,
    @StringRes val title: Int,
    @StringRes val intro: Int,
    @DrawableRes val illustration: Int,
    val activeTab: Tab?,
    val details: List<Detail>,
    val actions: List<PageAction>,
)

private val backToProfile = PageAction(R.string.back_to_profile, R.drawable.ic_arrow_right, Go.To(ProfileActivity::class.java), iconAtEnd = true)

/** Figma: M / Profil & perjalanan saya. Opened from the avatar in the top bar. */
val profilePage = FeaturePage(
    eyebrow = R.string.profile_eyebrow,
    title = R.string.profile_title,
    intro = R.string.profile_intro,
    illustration = R.drawable.rimau_navigator,
    activeTab = null,
    details = listOf(
        Detail(R.string.profile_academic_title, R.string.profile_academic_body),
        Detail(R.string.profile_interests_title, R.string.profile_interests_body),
        Detail(R.string.profile_roadmap_title, R.string.profile_roadmap_body),
    ),
    actions = listOf(
        PageAction(R.string.profile_manage_academic, R.drawable.ic_action_document, Go.To(AcademicProfileActivity::class.java)),
        PageAction(R.string.profile_saved, R.drawable.ic_action_bookmark, Go.To(SavedActivity::class.java)),
        PageAction(R.string.profile_notifications, R.drawable.ic_arrow_right, Go.To(UpdatesActivity::class.java), iconAtEnd = true),
        PageAction(R.string.profile_privacy, R.drawable.ic_arrow_right, Go.To(PrivacyActivity::class.java), iconAtEnd = true),
        PageAction(R.string.profile_help, R.drawable.ic_action_help, Go.To(HelpActivity::class.java)),
    ),
)

/** Figma: M / Pilihan yang anda simpan. */
val savedPage = FeaturePage(
    eyebrow = R.string.saved_eyebrow,
    title = R.string.saved_title,
    intro = R.string.saved_intro,
    illustration = R.drawable.world_campus,
    activeTab = Tab.EXPLORE,
    details = listOf(
        Detail(R.string.saved_sample_1_title, R.string.saved_sample_1_body),
        Detail(R.string.saved_sample_2_title, R.string.saved_sample_2_body),
    ),
    actions = listOf(
        PageAction(R.string.saved_view_first, R.drawable.ic_arrow_right, Go.To(ProgramDetailActivity::class.java), iconAtEnd = true),
        PageAction(R.string.saved_compare, R.drawable.ic_action_columns, Go.To(CompareActivity::class.java)),
        PageAction(R.string.saved_explore, R.drawable.ic_action_compass, Go.To(ExploreActivity::class.java)),
    ),
)

/** Figma: M / Kemas kini yang berkaitan. Opened from the bell in the top bar. */
val updatesPage = FeaturePage(
    eyebrow = R.string.updates_eyebrow,
    title = R.string.updates_title,
    intro = R.string.updates_intro,
    illustration = R.drawable.rimau_detective,
    activeTab = Tab.HOME,
    details = listOf(
        Detail(R.string.updates_requirements_title, R.string.updates_requirements_body),
        Detail(R.string.updates_roadmap_title, R.string.updates_roadmap_body),
    ),
    actions = listOf(
        PageAction(R.string.updates_check_evidence, R.drawable.ic_action_check, Go.To(EvidenceActivity::class.java)),
        PageAction(R.string.updates_compare_roadmap, R.drawable.ic_action_columns, Go.To(RoadmapVersionsActivity::class.java)),
        backToProfile,
    ),
)

/** Figma: M / Privasi & tetapan. Logging out lives here. */
val privacyPage = FeaturePage(
    eyebrow = R.string.privacy_eyebrow,
    title = R.string.privacy_title,
    intro = R.string.privacy_intro,
    illustration = R.drawable.world_documents,
    activeTab = null,
    details = listOf(
        Detail(R.string.privacy_motion_title, R.string.privacy_motion_body),
        Detail(R.string.privacy_notifications_title, R.string.privacy_notifications_body),
        Detail(R.string.privacy_data_title, R.string.privacy_data_body),
    ),
    actions = listOf(
        PageAction(R.string.privacy_manage_documents, R.drawable.ic_action_document, Go.To(DocumentsActivity::class.java)),
        backToProfile,
        PageAction(R.string.home_sign_out, R.drawable.ic_action_log_out, Go.SignOut),
    ),
)

/** Figma: M / Bantuan & maklumat. */
val helpPage = FeaturePage(
    eyebrow = R.string.help_eyebrow,
    title = R.string.help_title,
    intro = R.string.help_intro,
    illustration = R.drawable.world_documents,
    activeTab = null,
    details = listOf(
        Detail(R.string.help_guide_title, R.string.help_guide_body),
        Detail(R.string.help_about_title, R.string.help_about_body),
        Detail(R.string.help_terms_title, R.string.help_terms_body),
    ),
    actions = listOf(
        PageAction(R.string.help_contact, R.drawable.ic_action_message, Go.Soon),
        backToProfile,
        PageAction(R.string.help_report, R.drawable.ic_action_message, Go.Soon),
    ),
)

/** Shows a [FeaturePage] in activity_feature, with the shared top bar and tabs. */
open class FeaturePageActivity(private val page: FeaturePage) : AppCompatActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setUpScreen(R.layout.activity_feature)
        setUpChrome(page.activeTab)

        findViewById<TextView>(R.id.eyebrow).setText(page.eyebrow)
        findViewById<TextView>(R.id.title).setText(page.title)
        findViewById<TextView>(R.id.intro).setText(page.intro)
        findViewById<ImageView>(R.id.illustration).setImageResource(page.illustration)

        val details = findViewById<LinearLayout>(R.id.details)
        for (detail in page.details) {
            val card = layoutInflater.inflate(R.layout.item_detail_card, details, false)
            card.findViewById<TextView>(R.id.card_title).setText(detail.title)
            card.findViewById<TextView>(R.id.card_body).setText(detail.body)
            details.addView(card)
        }

        val actions = findViewById<LinearLayout>(R.id.actions)
        page.actions.forEachIndexed { index, action ->
            val layout = if (index == 0) R.layout.item_action_primary else R.layout.item_action_outlined
            val button = layoutInflater.inflate(layout, actions, false) as MaterialButton
            button.setText(action.text)
            button.setIconResource(action.icon)
            button.iconGravity = if (action.iconAtEnd) MaterialButton.ICON_GRAVITY_TEXT_END else MaterialButton.ICON_GRAVITY_TEXT_START
            button.setOnClickListener { run(action) }
            actions.addView(button)
        }
    }

    private fun run(action: PageAction) {
        when (val go = action.go) {
            is Go.To -> openOnce(go.screen)
            Go.SignOut -> lifecycleScope.launch {
                AccountService.signOut()
                LevelStore.clear(this@FeaturePageActivity)
                openFresh(MainActivity::class.java)
            }
            Go.Soon -> showComingSoon(getString(action.text))
        }
    }
}

// One small class per page, so each has its own place in the back stack (and "Kembali profil" returns to the profile).
class ProfileActivity : FeaturePageActivity(profilePage)
class SavedActivity : FeaturePageActivity(savedPage)
class UpdatesActivity : FeaturePageActivity(updatesPage)
class PrivacyActivity : FeaturePageActivity(privacyPage)
class HelpActivity : FeaturePageActivity(helpPage)
