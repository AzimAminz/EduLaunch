package my.utem.ftmk.edulaunch.home

import android.os.Bundle
import android.widget.LinearLayout
import androidx.appcompat.app.AppCompatActivity
import my.utem.ftmk.edulaunch.R
import my.utem.ftmk.edulaunch.ui.Blocks
import my.utem.ftmk.edulaunch.ui.setUpScreen

/**
 * A signed-in screen built from [Blocks] (layout activity_blocks: top bar, scrolling column, tabs).
 * Subclasses describe their content in [build]; [rebuild] draws it again after a choice changes it.
 */
abstract class BlockActivity(
    private val activeTab: Tab?,
    private val gap: Int = 18,
    private val showTabs: Boolean = true,
) : AppCompatActivity() {
    protected lateinit var blocks: Blocks
        private set

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setUpScreen(R.layout.activity_blocks)
        setUpChrome(activeTab)
        if (!showTabs) findViewById<android.view.View>(R.id.tab_bar).visibility = android.view.View.GONE
        blocks = Blocks(this, findViewById<LinearLayout>(R.id.blocks), gap)
        blocks.build()
    }

    protected abstract fun Blocks.build()

    protected fun rebuild() {
        blocks.column.removeAllViews()
        blocks.gap = gap
        blocks.build()
    }
}
