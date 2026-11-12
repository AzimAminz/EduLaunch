package my.utem.ftmk.edulaunch.auth

import android.app.Activity
import kotlinx.coroutines.CancellationException
import my.utem.ftmk.edulaunch.data.ProfileApi
import my.utem.ftmk.edulaunch.home.HomeActivity
import my.utem.ftmk.edulaunch.onboarding.OnboardingActivity
import my.utem.ftmk.edulaunch.ui.openFresh

/**
 * After signing in: students without an education level go to onboarding first, as on the web
 * (landingFor in apps/web/lib/auth/actions.ts). If the profile cannot be read, they go home.
 */
suspend fun Activity.openSignedInStart() {
    val needsLevel = try {
        ProfileApi.me().educationLevel == null
    } catch (e: CancellationException) {
        throw e
    } catch (e: Exception) {
        false
    }
    openFresh(if (needsLevel) OnboardingActivity::class.java else HomeActivity::class.java)
}
