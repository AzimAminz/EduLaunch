package my.utem.ftmk.edulaunch.home

import android.util.Log
import android.view.View
import android.widget.LinearLayout
import android.widget.TextView
import android.widget.Toast
import androidx.annotation.LayoutRes
import androidx.appcompat.app.AppCompatActivity
import androidx.core.view.isVisible
import androidx.lifecycle.lifecycleScope
import com.google.android.material.button.MaterialButton
import java.io.IOException
import java.util.Calendar
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.launch
import my.utem.ftmk.edulaunch.R
import my.utem.ftmk.edulaunch.data.ApiException
import my.utem.ftmk.edulaunch.documents.ResultEntryActivity
import my.utem.ftmk.edulaunch.data.ProfileApi
import my.utem.ftmk.edulaunch.onboarding.EducationLevel
import my.utem.ftmk.edulaunch.onboarding.LevelChoice
import my.utem.ftmk.edulaunch.onboarding.LevelStore
import my.utem.ftmk.edulaunch.onboarding.Qualification
import my.utem.ftmk.edulaunch.onboarding.level
import my.utem.ftmk.edulaunch.system.OfflineActivity
import my.utem.ftmk.edulaunch.system.SessionExpiredActivity
import my.utem.ftmk.edulaunch.ui.openOnce
import my.utem.ftmk.edulaunch.ui.showSheet

/** Every qualification after SPM, in the onboarding order: certificates first, then pre-U and Diplomas. */
private val qualificationsAfterSpm = EducationLevel.AFTER_CERTIFICATE.qualifications + EducationLevel.AFTER_PREU.qualifications

private val certificates = EducationLevel.AFTER_CERTIFICATE.qualifications

/**
 * Figma "M / Kemas kini tahap pendidikan · helaian", for Form 4–5: have the SPM results come out?
 * "Ya" leads to entering the real results (not built yet); "Sudah tamat…" asks which qualification.
 */
fun AppCompatActivity.showLevelUpdateSheet(current: LevelChoice?, onSaved: (LevelChoice) -> Unit) {
    val content = layoutInflater.inflate(R.layout.sheet_level_update, null)
    content.findViewById<TextView>(R.id.chip).text =
        getString(R.string.level_update_chip, Calendar.getInstance().get(Calendar.YEAR))

    val answers = listOf(R.string.level_update_yes, R.string.level_update_not_yet, R.string.level_update_finished)
    val next = content.findViewById<MaterialButton>(R.id.button_continue)
    var picked: Int? = null
    val rows = addRadioRows(content.findViewById(R.id.options), answers, R.layout.item_qualification_option) { answer ->
        picked = answer
        next.isEnabled = true
    }
    rows.values.forEach { (it.layoutParams as LinearLayout.LayoutParams).topMargin = dp(12) }

    val sheet = showSheet(content)
    next.setOnClickListener {
        sheet.dismiss()
        when (picked) {
            R.string.level_update_yes -> openOnce(ResultEntryActivity::class.java)
            R.string.level_update_finished -> showLevelChangeSheet(current, preselect = null, onSaved = onSaved)
            else -> Unit // still in Form 5: nothing changes
        }
    }
    content.findViewById<View>(R.id.button_later).setOnClickListener { sheet.dismiss() }
}

/**
 * Figma "M / Profil · Helaian sahkan padam rekod": which qualification the student holds now. If the change
 * removes the record kept for the current qualification (the profile service's retention rule), the red box
 * names it before "Sahkan & simpan".
 */
fun AppCompatActivity.showLevelChangeSheet(current: LevelChoice?, preselect: Qualification?, onSaved: (LevelChoice) -> Unit) {
    val content = layoutInflater.inflate(R.layout.sheet_level_change, null)
    val confirm = content.findViewById<MaterialButton>(R.id.button_confirm)
    val deleteBox = content.findViewById<View>(R.id.delete_box)
    val deleteList = content.findViewById<TextView>(R.id.delete_list)
    var picked: Qualification? = null

    fun choose(q: Qualification) {
        picked = q
        confirm.isEnabled = q != current?.qualification
        val removed = removedRecord(current, q)
        deleteBox.isVisible = removed != null
        removed?.let { deleteList.text = getString(R.string.level_delete_item, getString(it.label)) }
    }

    val labels = qualificationsAfterSpm.map { it.label }
    val rows = addRadioRows(content.findViewById(R.id.options), labels, R.layout.item_radio_option) { label ->
        choose(qualificationsAfterSpm.first { it.label == label })
    }
    (preselect ?: current?.qualification)?.let { q ->
        rows[q.label]?.isSelected = true
        choose(q)
    }

    val sheet = showSheet(content)
    confirm.setOnClickListener {
        val q = picked ?: return@setOnClickListener
        sheet.dismiss()
        saveLevel(LevelChoice(q.level, formYear = null, qualification = q), onSaved)
    }
    content.findViewById<View>(R.id.button_cancel).setOnClickListener { sheet.dismiss() }
}

/**
 * The record that changing to [next] deletes, if any. Moving between two certificates, or from one pre-U or
 * Diploma qualification to another, replaces the old one; moving on from a certificate to pre-U keeps it.
 */
private fun removedRecord(current: LevelChoice?, next: Qualification): Qualification? {
    val old = current?.qualification ?: return null
    if (old == next) return null
    val oldIsCertificate = old in certificates
    return if (!oldIsCertificate || next in certificates) old else null
}

/** Saves the level with the profile service (as onboarding does), remembers it, then calls [onSaved]. */
fun AppCompatActivity.saveLevel(choice: LevelChoice, onSaved: (LevelChoice) -> Unit) {
    lifecycleScope.launch {
        try {
            ProfileApi.me() // creates the profile if the student skipped onboarding
            ProfileApi.setEducationLevel(choice)
            LevelStore.save(this@saveLevel, choice)
            Toast.makeText(this@saveLevel, R.string.level_saved, Toast.LENGTH_SHORT).show()
            onSaved(choice)
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            Log.w("LevelSheets", "Could not save the education level", e)
            when {
                e is IOException -> openOnce(OfflineActivity::class.java)
                e is ApiException && e.status == 401 -> openOnce(SessionExpiredActivity::class.java)
                else -> Toast.makeText(this@saveLevel, R.string.error_generic, Toast.LENGTH_LONG).show()
            }
        }
    }
}

/** Adds one radio row per label; tapping one selects it alone and calls [onPick]. Returns the rows by label. */
private fun AppCompatActivity.addRadioRows(
    parent: LinearLayout,
    labels: List<Int>,
    @LayoutRes layout: Int,
    onPick: (label: Int) -> Unit,
): Map<Int, View> {
    val rows = labels.associateWith { label ->
        layoutInflater.inflate(layout, parent, false).also { row ->
            row.findViewById<TextView>(R.id.title).setText(label)
            parent.addView(row)
        }
    }
    rows.forEach { (label, row) ->
        row.setOnClickListener {
            rows.values.forEach { it.isSelected = it == row }
            onPick(label)
        }
    }
    return rows
}

private fun AppCompatActivity.dp(value: Int) = (value * resources.displayMetrics.density).toInt()
