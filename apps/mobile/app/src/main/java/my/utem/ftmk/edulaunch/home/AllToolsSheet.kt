package my.utem.ftmk.edulaunch.home

import android.app.Activity
import android.view.View
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.TextView
import androidx.annotation.DrawableRes
import androidx.annotation.StringRes
import androidx.core.content.res.ResourcesCompat
import androidx.core.view.updateLayoutParams
import com.google.android.material.bottomsheet.BottomSheetDialog
import my.utem.ftmk.edulaunch.R
import my.utem.ftmk.edulaunch.ui.showSheet

/** A tool in the sheet. [badge] is a small count on its icon ("2/3", "5", "60%"); [badgeBlue] uses the light blue pill. */
private data class Tool(
    @StringRes val name: Int,
    @DrawableRes val icon: Int,
    val badge: String? = null,
    val badgeBlue: Boolean = false,
)

private data class ToolGroup(@StringRes val label: Int, val tools: List<Tool>)

/** The sheet's groups, in the order of the Figma design. The counts are sample values until the services provide them. */
private val groups = listOf(
    ToolGroup(R.string.tools_group_explore, listOf(
        Tool(R.string.tool_explore_programmes, R.drawable.ic_tool_compass),
        Tool(R.string.tool_compare, R.drawable.ic_tool_columns, badge = "2/3"),
        Tool(R.string.tool_saved, R.drawable.ic_tool_bookmark, badge = "5"),
    )),
    ToolGroup(R.string.tools_group_plan, listOf(
        Tool(R.string.tool_eligibility, R.drawable.ic_tool_check),
        Tool(R.string.tool_merit_lab, R.drawable.ic_tool_calc),
        Tool(R.string.tool_roadmap, R.drawable.ic_tool_route),
    )),
    ToolGroup(R.string.tools_group_self, listOf(
        Tool(R.string.tool_assessment, R.drawable.ic_tool_spark, badge = "60%", badgeBlue = true),
        Tool(R.string.tool_activities, R.drawable.ic_tool_puzzle),
        Tool(R.string.tool_ask_ai, R.drawable.ic_tool_msg),
    )),
    ToolGroup(R.string.tools_group_account, listOf(
        Tool(R.string.tool_documents, R.drawable.ic_tool_file),
        Tool(R.string.tool_privacy, R.drawable.ic_tool_shield),
        Tool(R.string.tool_help, R.drawable.ic_tool_help),
    )),
)

/**
 * Figma "M / Semua alat · helaian": every tool, grouped, over a dimmed home screen.
 * [onOpen] is called with the name (a string resource) of whatever the student taps.
 */
fun Activity.showAllToolsSheet(onOpen: (tool: Int) -> Unit, onDismiss: () -> Unit): BottomSheetDialog {
    lateinit var sheet: BottomSheetDialog
    val content = layoutInflater.inflate(R.layout.sheet_all_tools, null)
    val column = content.findViewById<LinearLayout>(R.id.sheet_content)
    val density = resources.displayMetrics.density
    fun dp(value: Int) = (value * density).toInt()

    fun open(@StringRes tool: Int) {
        sheet.dismiss()
        onOpen(tool)
    }

    for (group in groups) {
        val label = TextView(this).apply {
            setText(group.label)
            setTextColor(getColor(R.color.muted))
            textSize = 13f
            typeface = ResourcesCompat.getFont(this@showAllToolsSheet, R.font.outfit_semibold)
        }
        column.addView(label, LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.WRAP_CONTENT, LinearLayout.LayoutParams.WRAP_CONTENT,
        ).apply { topMargin = dp(18) })

        val row = LinearLayout(this).apply { orientation = LinearLayout.HORIZONTAL }
        group.tools.forEachIndexed { index, tool ->
            val tile = layoutInflater.inflate(R.layout.item_tool, row, false)
            val name = getString(tool.name)
            tile.findViewById<ImageView>(R.id.icon).setImageResource(tool.icon)
            tile.findViewById<TextView>(R.id.name).text = name
            tool.badge?.let { count ->
                tile.findViewById<TextView>(R.id.badge).apply {
                    text = count
                    visibility = View.VISIBLE
                    if (tool.badgeBlue) setBackgroundResource(R.drawable.bg_pill_blue)
                }
            }
            tile.contentDescription = if (tool.badge != null) "$name, ${tool.badge}" else name
            tile.setOnClickListener { open(tool.name) }
            row.addView(tile)
            if (index > 0) tile.updateLayoutParams<LinearLayout.LayoutParams> { marginStart = dp(10) }
        }
        column.addView(row)
        row.updateLayoutParams<LinearLayout.LayoutParams> {
            width = LinearLayout.LayoutParams.MATCH_PARENT
            topMargin = dp(12)
        }
    }

    content.findViewById<View>(R.id.button_close).setOnClickListener { sheet.dismiss() }
    content.findViewById<View>(R.id.my_recommendations).setOnClickListener {
        open(R.string.tools_my_recommendations)
    }

    sheet = showSheet(content, onDismiss)
    return sheet
}
