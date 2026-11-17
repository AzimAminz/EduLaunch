package my.utem.ftmk.edulaunch.ui

import android.app.Activity
import android.content.Intent
import android.graphics.Color
import android.view.View
import androidx.activity.SystemBarStyle
import androidx.activity.enableEdgeToEdge
import androidx.annotation.LayoutRes
import androidx.appcompat.app.AppCompatActivity
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import my.utem.ftmk.edulaunch.R

/**
 * Shows [layout] edge to edge on the light background (dark status and navigation bar icons).
 * The layout's root must have the id `main`; it is padded clear of the system bars and of the keyboard,
 * so the field being typed in can still be scrolled into view.
 */
fun AppCompatActivity.setUpScreen(@LayoutRes layout: Int) {
    enableEdgeToEdge(
        statusBarStyle = SystemBarStyle.light(Color.TRANSPARENT, Color.TRANSPARENT),
        navigationBarStyle = SystemBarStyle.light(Color.TRANSPARENT, Color.TRANSPARENT),
    )
    setContentView(layout)
    ViewCompat.setOnApplyWindowInsetsListener(findViewById<View>(R.id.main)) { v, insets ->
        val bars = insets.getInsets(WindowInsetsCompat.Type.systemBars())
        val keyboard = insets.getInsets(WindowInsetsCompat.Type.ime())
        v.setPadding(bars.left, bars.top, bars.right, maxOf(bars.bottom, keyboard.bottom))
        insets
    }
}

/** Opens [screen], returning to it if it is already further back (so the back button never loops between two screens). */
fun Activity.openOnce(screen: Class<out Activity>, configure: Intent.() -> Unit = {}) {
    startActivity(Intent(this, screen).addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP).apply(configure))
}

/** Opens [screen] as the only screen left, so the back button cannot return to the account forms. */
fun Activity.openFresh(screen: Class<out Activity>) {
    startActivity(Intent(this, screen).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK))
}
