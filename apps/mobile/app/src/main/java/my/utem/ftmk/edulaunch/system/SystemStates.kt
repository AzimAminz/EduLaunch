package my.utem.ftmk.edulaunch.system

import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.widget.Toast
import my.utem.ftmk.edulaunch.MainActivity
import my.utem.ftmk.edulaunch.R
import my.utem.ftmk.edulaunch.ai.AskAiActivity
import my.utem.ftmk.edulaunch.auth.LoginActivity
import my.utem.ftmk.edulaunch.home.BlockActivity
import my.utem.ftmk.edulaunch.home.Detail
import my.utem.ftmk.edulaunch.home.FeaturePage
import my.utem.ftmk.edulaunch.home.FeaturePageActivity
import my.utem.ftmk.edulaunch.home.Go
import my.utem.ftmk.edulaunch.home.PageAction
import my.utem.ftmk.edulaunch.home.Tab
import my.utem.ftmk.edulaunch.roadmap.RoadmapSavedActivity
import my.utem.ftmk.edulaunch.ui.Blocks
import my.utem.ftmk.edulaunch.ui.ButtonStyle
import my.utem.ftmk.edulaunch.ui.Tone
import my.utem.ftmk.edulaunch.ui.openOnce

// Figma section "10 · Keadaan sistem": what the app shows when a service, the session or the network fails.

/** M / Permintaan belum boleh diproses (the AI or a generation service is down). */
val requestFailedPage = FeaturePage(
    eyebrow = R.string.failed_eyebrow, title = R.string.failed_title, intro = R.string.failed_intro,
    illustration = R.drawable.rimau_offline, activeTab = Tab.HOME,
    details = listOf(
        Detail(R.string.failed_results_title, R.string.failed_results_body),
        Detail(R.string.failed_options_title, R.string.failed_options_body),
    ),
    actions = listOf(
        PageAction(R.string.failed_open_roadmap, R.drawable.ic_arrow_right, Go.To(RoadmapSavedActivity::class.java), iconAtEnd = true),
        PageAction(R.string.failed_back_assistant, R.drawable.ic_arrow_right, Go.To(AskAiActivity::class.java), iconAtEnd = true),
    ),
)

/** M / Sesi anda telah tamat (the gateway answered 401). */
val sessionExpiredPage = FeaturePage(
    eyebrow = R.string.expired_eyebrow, title = R.string.expired_title, intro = R.string.expired_intro,
    illustration = R.drawable.rimau_shield, activeTab = null,
    details = listOf(
        Detail(R.string.expired_kept_title, R.string.expired_kept_body),
        Detail(R.string.expired_after_title, R.string.expired_after_body),
    ),
    actions = listOf(
        PageAction(R.string.expired_sign_in, R.drawable.ic_log_in, Go.To(LoginActivity::class.java)),
        PageAction(R.string.expired_home, R.drawable.ic_arrow_right, Go.To(MainActivity::class.java), iconAtEnd = true),
    ),
)

class RequestFailedActivity : FeaturePageActivity(requestFailedPage)
class SessionExpiredActivity : FeaturePageActivity(sessionExpiredPage)

/** M16 / Offline & retry: no tabs, Rimau unplugged, and a way back once the connection returns. */
class OfflineActivity : BlockActivity(activeTab = null, gap = 10, showTabs = false) {
    override fun Blocks.build() {
        eyebrow(R.string.offline_eyebrow)
        title(R.string.offline_title)
        intro(R.string.offline_intro)
        picture(R.drawable.rimau_offline, 168)
        infoCard(str(R.string.offline_stale_title), str(R.string.offline_stale_body), Tone.YELLOW)
        button(R.string.offline_retry, radius = 16, wrap = true) {
            if (isOnline()) finish() else Toast.makeText(activity, R.string.offline_still, Toast.LENGTH_SHORT).show()
        }
        button(R.string.offline_saved_plan, style = ButtonStyle.PLAIN, radius = 16, wrap = true) { openOnce(RoadmapSavedActivity::class.java) }
    }

    private fun isOnline(): Boolean {
        val manager = getSystemService(ConnectivityManager::class.java) ?: return false
        val capabilities = manager.getNetworkCapabilities(manager.activeNetwork) ?: return false
        return capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
    }
}
