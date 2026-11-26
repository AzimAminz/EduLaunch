package my.utem.ftmk.edulaunch.ui

import android.app.Activity
import android.graphics.Color
import android.view.View
import com.google.android.material.bottomsheet.BottomSheetBehavior
import com.google.android.material.bottomsheet.BottomSheetDialog
import my.utem.ftmk.edulaunch.R

/**
 * Shows [content] as a sheet from the bottom, open all the way. The content draws its own white, rounded
 * background (bg_sheet); the screen behind is dimmed with the design's navy at 50%.
 */
fun Activity.showSheet(content: View, onDismiss: () -> Unit = {}): BottomSheetDialog {
    val sheet = BottomSheetDialog(this)
    sheet.setContentView(content)
    sheet.findViewById<View>(com.google.android.material.R.id.design_bottom_sheet)?.setBackgroundColor(Color.TRANSPARENT)
    sheet.window?.setDimAmount(0f)
    sheet.findViewById<View>(com.google.android.material.R.id.container)?.setBackgroundColor(getColor(R.color.scrim))
    sheet.behavior.apply {
        state = BottomSheetBehavior.STATE_EXPANDED
        skipCollapsed = true
    }
    sheet.setOnDismissListener { onDismiss() }
    sheet.show()
    return sheet
}
