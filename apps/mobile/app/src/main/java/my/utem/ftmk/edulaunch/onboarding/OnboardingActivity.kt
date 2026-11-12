package my.utem.ftmk.edulaunch.onboarding

import android.os.Bundle
import android.view.Gravity
import android.view.View
import android.view.ViewGroup
import android.widget.LinearLayout
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import androidx.core.os.BundleCompat
import androidx.core.view.isVisible
import androidx.lifecycle.lifecycleScope
import com.google.android.material.bottomsheet.BottomSheetDialog
import com.google.android.material.button.MaterialButton
import java.io.IOException
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.launch
import my.utem.ftmk.edulaunch.R
import my.utem.ftmk.edulaunch.data.ProfileApi
import my.utem.ftmk.edulaunch.home.HomeActivity
import my.utem.ftmk.edulaunch.ui.openFresh
import my.utem.ftmk.edulaunch.ui.setBusy
import my.utem.ftmk.edulaunch.ui.setUpScreen
import my.utem.ftmk.edulaunch.ui.showAlert

/**
 * M / Onboarding · Mulakan dari situasi anda (step 2 of 3, after creating an account).
 * Form 1–3 and Form 4–5 ask which form on the card; the two levels after SPM ask the qualification in a sheet.
 */
class OnboardingActivity : AppCompatActivity() {
    private var level: EducationLevel? = null
    private var formYear: Int? = null
    private var qualification: Qualification? = null

    private lateinit var errorView: TextView
    private lateinit var alert: TextView
    private lateinit var submit: MaterialButton
    private val cards = mutableMapOf<EducationLevel, View>()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setUpScreen(R.layout.activity_onboarding)

        savedInstanceState?.let { state ->
            level = BundleCompat.getSerializable(state, KEY_LEVEL, EducationLevel::class.java)
            formYear = state.getInt(KEY_FORM, 0).takeIf { it != 0 }
            qualification = BundleCompat.getSerializable(state, KEY_QUALIFICATION, Qualification::class.java)
        }

        errorView = findViewById(R.id.error_level)
        val options = findViewById<LinearLayout>(R.id.level_options)
        EducationLevel.entries.forEach { option -> cards[option] = addLevelCard(options, option) }
        render()

        alert = findViewById(R.id.form_alert)
        submit = findViewById(R.id.button_continue)
        // "Langkau" goes on without saving; the student is asked again at the next sign-in, as on the web.
        findViewById<TextView>(R.id.button_skip).setOnClickListener { openFresh(HomeActivity::class.java) }
        submit.setOnClickListener { submit() }
    }

    override fun onSaveInstanceState(outState: Bundle) {
        super.onSaveInstanceState(outState)
        outState.putSerializable(KEY_LEVEL, level)
        outState.putInt(KEY_FORM, formYear ?: 0)
        outState.putSerializable(KEY_QUALIFICATION, qualification)
    }

    private fun addLevelCard(parent: ViewGroup, option: EducationLevel): View {
        val card = layoutInflater.inflate(R.layout.item_level_option, parent, false)
        card.findViewById<TextView>(R.id.title).setText(option.title)
        card.findViewById<TextView>(R.id.body).setText(option.body)
        card.setOnClickListener {
            if (level != option) {
                // A form or qualification belongs to one level; choosing another level asks again.
                level = option
                formYear = null
                qualification = null
            }
            render()
        }
        val forms = card.findViewById<LinearLayout>(R.id.forms)
        option.forms.forEach { n -> forms.addView(formChip(n)) }
        parent.addView(card)
        return card
    }

    /** A round form number on the chosen Form 1–3 / Form 4–5 card. */
    private fun formChip(n: Int): TextView {
        val size = resources.getDimensionPixelSize(R.dimen.form_chip_size)
        return TextView(this).apply {
            layoutParams = LinearLayout.LayoutParams(size, size).apply { marginStart = size / 6 }
            gravity = Gravity.CENTER
            text = n.toString()
            textSize = 14f
            tag = n
            contentDescription = "${getString(R.string.onboarding_form_label)} $n"
            setBackgroundResource(R.drawable.bg_form_chip)
            setOnClickListener {
                formYear = n
                render()
            }
        }
    }

    /** Shows the current choice on every card. */
    private fun render() {
        if (level != null) errorView.isVisible = false
        cards.forEach { (option, card) ->
            val chosen = option == level
            card.isSelected = chosen

            val forms = card.findViewById<LinearLayout>(R.id.forms)
            forms.isVisible = chosen && option.asksForm
            for (i in 0 until forms.childCount) {
                val chip = forms.getChildAt(i)
                val n = chip.tag as? Int ?: continue
                chip.isSelected = n == formYear
                (chip as TextView).setTextColor(ContextCompat.getColor(this, if (chip.isSelected) R.color.white else R.color.navy))
            }

            val picked = card.findViewById<TextView>(R.id.qualification)
            val shown = qualification.takeIf { chosen && it in option.qualifications }
            picked.isVisible = shown != null
            shown?.let { picked.setText(it.label) }
        }
    }

    private fun submit() {
        if (!submit.isEnabled) return
        alert.showAlert(null)
        when (checkLevelChoice(level, formYear, qualification)) {
            LevelProblem.LEVEL_REQUIRED -> showError(R.string.error_level_required)
            LevelProblem.FORM_REQUIRED -> showError(R.string.error_form_required)
            LevelProblem.QUALIFICATION_REQUIRED -> askQualification(level!!)
            null -> save()
        }
    }

    private fun showError(message: Int) {
        errorView.setText(message)
        errorView.isVisible = true
        cards[level ?: EducationLevel.entries.first()]?.requestFocus()
    }

    /** "Sahkan perubahan tahap": pick the qualification, then save. */
    private fun askQualification(forLevel: EducationLevel) {
        val sheet = BottomSheetDialog(this)
        val content = layoutInflater.inflate(R.layout.sheet_qualification, null)
        val list = content.findViewById<LinearLayout>(R.id.qualification_options)
        val confirm = content.findViewById<MaterialButton>(R.id.button_confirm)
        var picked: Qualification? = null
        val rows = forLevel.qualifications.associateWith { q ->
            layoutInflater.inflate(R.layout.item_qualification_option, list, false).also { row ->
                row.findViewById<TextView>(R.id.title).setText(q.label)
                list.addView(row)
            }
        }
        rows.forEach { (q, row) ->
            row.setOnClickListener {
                picked = q
                rows.forEach { (other, otherRow) -> otherRow.isSelected = other == q }
                confirm.isEnabled = true
            }
        }
        confirm.setOnClickListener {
            qualification = picked
            sheet.dismiss()
            render()
            save()
        }
        content.findViewById<MaterialButton>(R.id.button_cancel).setOnClickListener { sheet.dismiss() }
        sheet.setContentView(content)
        sheet.show()
    }

    /** Saves the level with the profile service, then goes on to the dashboard (step 3 of 3). */
    private fun save() {
        val choice = LevelChoice(level ?: return, formYear, qualification)
        setBusy(true, submit)
        lifecycleScope.launch {
            try {
                // The first profile call after sign-up creates the profile, so it exists before the level is saved.
                ProfileApi.me()
                ProfileApi.setEducationLevel(choice)
                openFresh(HomeActivity::class.java)
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                setBusy(false, submit)
                alert.showAlert(if (e is IOException) R.string.error_network else R.string.error_generic)
            }
        }
    }

    private companion object {
        const val KEY_LEVEL = "level"
        const val KEY_FORM = "formYear"
        const val KEY_QUALIFICATION = "qualification"
    }
}
