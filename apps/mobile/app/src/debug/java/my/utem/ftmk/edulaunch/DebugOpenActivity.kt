package my.utem.ftmk.edulaunch

import android.app.Activity
import android.content.Intent
import android.os.Bundle

/**
 * Debug builds only: opens any screen of the app from the computer, for checking a design without tapping
 * through the app. The screen is the class name after the package:
 *   adb shell am start -n my.utem.ftmk.edulaunch/.DebugOpenActivity --es screen .explore.ExploreActivity
 */
class DebugOpenActivity : Activity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        intent.getStringExtra("screen")?.let { screen ->
            startActivity(Intent().setClassName(this, packageName + screen).putExtras(intent))
        }
        finish()
    }
}
