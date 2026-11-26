package my.utem.ftmk.edulaunch.home

import android.app.Activity
import android.view.View
import android.view.ViewGroup
import android.widget.ImageView
import android.widget.TextView
import android.widget.Toast
import androidx.annotation.IdRes
import androidx.annotation.StringRes
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.res.ResourcesCompat
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.updatePadding
import my.utem.ftmk.edulaunch.R
import my.utem.ftmk.edulaunch.ai.AskAiActivity
import my.utem.ftmk.edulaunch.discover.FieldDiscoveryActivity
import my.utem.ftmk.edulaunch.documents.DocumentsActivity
import my.utem.ftmk.edulaunch.discover.QuizActivity
import my.utem.ftmk.edulaunch.explore.CompareActivity
import my.utem.ftmk.edulaunch.explore.ExploreActivity
import my.utem.ftmk.edulaunch.explore.ProgramSearchActivity
import my.utem.ftmk.edulaunch.explore.RecommendationsActivity
import my.utem.ftmk.edulaunch.merit.EligibilityActivity
import my.utem.ftmk.edulaunch.merit.MeritLabActivity
import my.utem.ftmk.edulaunch.roadmap.RoadmapActivity
import my.utem.ftmk.edulaunch.auth.AccountService
import my.utem.ftmk.edulaunch.ui.openOnce

/** The bottom tabs that can be highlighted. The round "Semua alat" button opens a sheet instead. */
enum class Tab(@IdRes val id: Int) {
    HOME(R.id.tab_home),
    EXPLORE(R.id.tab_explore),
    ROADMAP(R.id.tab_roadmap),
    MERIT_LAB(R.id.tab_merit_lab),
}

/**
 * Wires the shared top bar (include_top_bar) and bottom tabs (include_tab_bar) of a signed-in screen.
 * [active] is the highlighted tab, or null for pages reached from the profile, which highlight none.
 * The layout needs the ids `main` and `scroll` around them, as in activity_home and activity_feature.
 */
fun AppCompatActivity.setUpChrome(active: Tab?) {
    keepTabBarAboveNavigation()

    findViewById<TextView>(R.id.notifications_badge).text = "3" // sample count until the notices are read
    findViewById<TextView>(R.id.button_profile).apply {
        text = initials(AccountService.signedInName, AccountService.signedInEmail)
        setOnClickListener { openOnce(ProfileActivity::class.java) }
    }
    onClick(R.id.button_search) { openOnce(ProgramSearchActivity::class.java) }
    onClick(R.id.button_notifications) { openOnce(UpdatesActivity::class.java) }

    onClick(R.id.tab_home) { if (this !is HomeActivity) openOnce(HomeActivity::class.java) }
    onClick(R.id.tab_explore) { if (this !is ExploreActivity) openOnce(ExploreActivity::class.java) }
    onClick(R.id.tab_all_tools) { openAllTools() }
    onClick(R.id.tab_roadmap) { if (this !is RoadmapActivity) openOnce(RoadmapActivity::class.java) }
    onClick(R.id.tab_merit_lab) { if (this !is MeritLabActivity) openOnce(MeritLabActivity::class.java) }

    active?.let { highlight(it) }
}

/** Says that [name] is not built yet. */
fun Activity.showComingSoon(name: String) {
    Toast.makeText(this, getString(R.string.coming_soon, name), Toast.LENGTH_SHORT).show()
}

/** Opens the screen for a tool picked in the "Semua alat" sheet; the ones not built yet say so. */
private fun Activity.openTool(@StringRes tool: Int) {
    when (tool) {
        R.string.tools_my_recommendations -> openOnce(RecommendationsActivity::class.java)
        R.string.tool_explore_programmes -> openOnce(ExploreActivity::class.java)
        R.string.tool_compare -> openOnce(CompareActivity::class.java)
        R.string.tool_saved -> openOnce(SavedActivity::class.java)
        R.string.tool_eligibility -> openOnce(EligibilityActivity::class.java)
        R.string.tool_merit_lab -> openOnce(MeritLabActivity::class.java)
        R.string.tool_roadmap -> openOnce(RoadmapActivity::class.java)
        R.string.tool_ask_ai -> openOnce(AskAiActivity::class.java)
        R.string.tool_assessment -> openOnce(QuizActivity::class.java)
        R.string.tool_activities -> openOnce(FieldDiscoveryActivity::class.java)
        R.string.tool_documents -> openOnce(DocumentsActivity::class.java)
        R.string.tool_privacy -> openOnce(PrivacyActivity::class.java)
        R.string.tool_help -> openOnce(HelpActivity::class.java)
        else -> showComingSoon(getString(tool))
    }
}

/** The round middle tab turns yellow while its sheet is open, as in the design. */
private fun Activity.openAllTools() {
    val circle = findViewById<View>(R.id.tab_all_tools_circle)
    val icon = findViewById<ImageView>(R.id.tab_all_tools_icon)
    fun highlight(open: Boolean) {
        circle.setBackgroundResource(if (open) R.drawable.bg_tab_center_open else R.drawable.bg_tab_center)
        icon.setColorFilter(getColor(if (open) R.color.navy else R.color.white))
    }
    highlight(true)
    showAllToolsSheet(onOpen = ::openTool, onDismiss = { highlight(false) })
}

/** Light blue background and a semibold name, as on the design's active tab. */
private fun Activity.highlight(tab: Tab) {
    val view = findViewById<ViewGroup>(tab.id)
    view.setBackgroundResource(R.drawable.bg_tab_active)
    view.isSelected = true
    (view.getChildAt(1) as TextView).typeface = ResourcesCompat.getFont(this, R.font.outfit_semibold)
}

/**
 * The white tab bar reaches the bottom edge, with its tabs above the navigation bar, and the page scrolls
 * far enough that its last card clears the tab bar.
 */
private fun Activity.keepTabBarAboveNavigation() {
    val root = findViewById<View>(R.id.main)
    val tabBar = findViewById<View>(R.id.tab_bar)
    val scroll = findViewById<View>(R.id.scroll)
    val tabBarBottom = tabBar.paddingBottom
    val tabBarHeight = (84 * resources.displayMetrics.density).toInt() // white part: 10 + 62 + 12
    ViewCompat.setOnApplyWindowInsetsListener(root) { v, insets ->
        val bars = insets.getInsets(WindowInsetsCompat.Type.systemBars())
        v.setPadding(bars.left, bars.top, bars.right, 0)
        tabBar.updatePadding(bottom = tabBarBottom + bars.bottom)
        scroll.updatePadding(bottom = tabBarHeight + bars.bottom)
        insets
    }
}

private fun Activity.onClick(@IdRes id: Int, action: () -> Unit) {
    findViewById<View>(id).setOnClickListener { action() }
}

/** "Nur Aisyah binti Ali" → "NA"; without a name, the e-mail's first letter. */
fun initials(name: String?, email: String?): String {
    val words = name?.trim()?.split(Regex("\\s+"))?.filter { it.isNotEmpty() && it.lowercase() !in setOf("bin", "binti", "a/l", "a/p") }.orEmpty()
    return when {
        words.size >= 2 -> "${words[0].first()}${words[1].first()}"
        words.size == 1 -> words[0].take(2)
        else -> email?.firstOrNull()?.toString() ?: "?"
    }.uppercase()
}
