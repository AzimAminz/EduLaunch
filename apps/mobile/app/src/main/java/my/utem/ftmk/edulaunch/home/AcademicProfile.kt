package my.utem.ftmk.edulaunch.home

import android.os.Bundle
import android.text.InputType
import android.view.View
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.TextView
import android.widget.Toast
import androidx.annotation.DrawableRes
import androidx.annotation.StringRes
import androidx.appcompat.app.AppCompatActivity
import androidx.appcompat.widget.PopupMenu
import androidx.core.view.isVisible
import androidx.core.view.updateLayoutParams
import androidx.lifecycle.lifecycleScope
import com.google.android.material.chip.ChipGroup
import java.util.Calendar
import kotlinx.coroutines.launch
import my.utem.ftmk.edulaunch.R
import my.utem.ftmk.edulaunch.onboarding.EducationLevel
import my.utem.ftmk.edulaunch.onboarding.LevelChoice
import my.utem.ftmk.edulaunch.onboarding.LevelStore
import my.utem.ftmk.edulaunch.onboarding.Qualification
import my.utem.ftmk.edulaunch.documents.DocumentsActivity
import my.utem.ftmk.edulaunch.explore.ExploreActivity
import my.utem.ftmk.edulaunch.merit.MeritLabActivity
import my.utem.ftmk.edulaunch.roadmap.RoadmapActivity
import my.utem.ftmk.edulaunch.ui.openOnce
import my.utem.ftmk.edulaunch.ui.setUpScreen

/** The five versions of the academic profile in Figma section "3.1 · Profil akademik ikut tahap". */
enum class AcademicForm { FORM1_3, FORM4_5, PRE_U, DIPLOMA, CERTIFICATE }

private val diplomas = setOf(Qualification.DIPLOMA, Qualification.DVM, Qualification.DKM)

/**
 * The version for a level. "Lepasan SPM" has no version here (entering real SPM results is Figma section 8),
 * so it uses the Form 4–5 subjects for now, as does a student who has not chosen a level yet.
 */
fun LevelChoice?.academicForm(): AcademicForm = when (this?.level) {
    EducationLevel.FORM1_3 -> AcademicForm.FORM1_3
    EducationLevel.FORM4_5, EducationLevel.AFTER_SPM, null -> AcademicForm.FORM4_5
    EducationLevel.AFTER_CERTIFICATE -> AcademicForm.CERTIFICATE
    EducationLevel.AFTER_PREU -> if (qualification in diplomas) AcademicForm.DIPLOMA else AcademicForm.PRE_U
}

/** A subject in the official list, with the group shown under its name. */
private data class Subject(@StringRes val name: Int, @StringRes val group: Int)

/** A subject on the student's list, with its grade (and target, on Form 4–5). */
private class Entry(val subject: Subject, var grade: String, var target: String? = null)

private val schoolScale = listOf("A", "B", "C", "D", "E", "F")
private val spmScale = listOf("A+", "A", "A-", "B+", "B", "C+", "C", "D", "E", "G")
private val stpmScale = listOf("A", "A-", "B+", "B", "B-", "C+", "C", "C-", "D+", "D", "F")

// Sample lists from the design until the subject catalogue is read from the profile service.
private val schoolSubjects = listOf(
    Subject(R.string.subject_bm, R.string.category_language), Subject(R.string.subject_bi, R.string.category_language),
    Subject(R.string.subject_math, R.string.category_science_math), Subject(R.string.subject_science, R.string.category_science_math),
    Subject(R.string.subject_history, R.string.category_humanities), Subject(R.string.subject_islamic, R.string.category_religion),
    Subject(R.string.subject_arabic, R.string.category_language), Subject(R.string.subject_moral, R.string.category_religion),
    Subject(R.string.subject_geography, R.string.category_humanities), Subject(R.string.subject_rbt, R.string.category_technical),
)
private val spmSubjects = listOf(
    Subject(R.string.subject_bm, R.string.category_spm_core), Subject(R.string.subject_bi, R.string.category_spm_core),
    Subject(R.string.subject_math, R.string.category_spm_core), Subject(R.string.subject_history, R.string.category_spm_core),
    Subject(R.string.subject_islamic, R.string.category_spm_core), Subject(R.string.subject_add_math, R.string.category_science_elective),
    Subject(R.string.subject_physics, R.string.category_science_elective), Subject(R.string.subject_chemistry, R.string.category_science_elective),
    Subject(R.string.subject_biology, R.string.category_science_elective), Subject(R.string.subject_moral, R.string.category_spm_core),
    Subject(R.string.subject_computer_science, R.string.category_science_elective),
)
private val stpmSubjects = listOf(
    Subject(R.string.subject_general_studies, R.string.category_stpm_core), Subject(R.string.subject_economics, R.string.category_social_science),
    Subject(R.string.subject_business, R.string.category_social_science), Subject(R.string.subject_math_m, R.string.category_math),
    Subject(R.string.subject_math_t, R.string.category_math), Subject(R.string.subject_accounting, R.string.category_social_science),
    Subject(R.string.subject_physics, R.string.category_science_math), Subject(R.string.subject_chemistry, R.string.category_science_math),
)

private val institutions = listOf(
    R.string.institution_uitm, R.string.institution_utem, R.string.institution_utm,
    R.string.institution_puo, R.string.institution_pmm, R.string.institution_kk,
)
private val fields = listOf(
    R.string.field_tvet, R.string.field_education, R.string.field_engineering, R.string.field_electrical, R.string.field_it,
    R.string.field_business, R.string.field_accounting, R.string.field_health, R.string.field_science, R.string.field_arts,
    R.string.field_design, R.string.field_agriculture, R.string.field_law,
)
private val streams = listOf(R.string.stream_pure_science, R.string.stream_stem_technical, R.string.stream_social_arts, R.string.stream_tvet)
private val preUTypes = listOf(Qualification.STPM, Qualification.MATRICULATION, Qualification.FOUNDATION, Qualification.A_LEVEL)

/**
 * Profil akademik (Figma section 3.1): one screen, five versions by education level. Opened from the profile
 * ("Urus akademik / dokumen") and from the Form 1–3 dashboard. The level comes from this phone's copy and is
 * checked with the profile service; tapping the eyebrow (or a qualification chip) changes it.
 *
 * The subjects and grades are sample values from the design: they can be edited here but are not stored yet,
 * so the save button and the upload say "coming soon" until the academic records API is connected.
 */
class AcademicProfileActivity : AppCompatActivity() {
    private var choice: LevelChoice? = null
    private lateinit var blocks: LinearLayout

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setUpScreen(R.layout.activity_academic_profile)
        setUpChrome(active = null)
        blocks = findViewById(R.id.blocks)

        findViewById<View>(R.id.button_upload).setOnClickListener { openOnce(DocumentsActivity::class.java) }
        findViewById<View>(R.id.eyebrow_row).apply {
            contentDescription = getString(R.string.academic_change_level)
            setOnClickListener { changeLevel(preselect = null) }
        }

        show(LevelStore.load(this))
        lifecycleScope.launch {
            val fresh = LevelStore.fetch(this@AcademicProfileActivity)
            if (fresh != null && fresh != choice) show(fresh)
        }
    }

    private fun show(level: LevelChoice?) {
        choice = level
        blocks.removeAllViews()
        when (level.academicForm()) {
            AcademicForm.FORM1_3 -> showForm13()
            AcademicForm.FORM4_5 -> showForm45()
            AcademicForm.PRE_U -> showPreU()
            AcademicForm.DIPLOMA -> showPostSecondary(
                R.string.academic_diploma_eyebrow, R.string.academic_diploma_title, R.string.academic_diploma_intro,
                R.string.academic_diploma_institution, R.string.institution_uitm,
                R.string.academic_diploma_field, R.string.field_it,
                R.string.academic_diploma_programme, R.string.sample_diploma_programme, cgpa = "3.42", muetBand = 3,
                R.string.academic_diploma_related,
                listOf(R.string.path_computer_science, R.string.path_software_engineering, R.string.path_information_systems),
                R.string.academic_diploma_note, R.string.academic_diploma_save,
            )
            AcademicForm.CERTIFICATE -> showPostSecondary(
                R.string.academic_cert_eyebrow, R.string.academic_cert_title, R.string.academic_cert_intro,
                R.string.academic_cert_institution, R.string.institution_puo,
                R.string.academic_cert_field, R.string.field_electrical,
                R.string.academic_cert_programme, R.string.sample_cert_programme, cgpa = "3.20", muetBand = null,
                R.string.academic_cert_related,
                listOf(R.string.path_diploma_electrical, R.string.path_diploma_electronics, R.string.path_dkm_wiring),
                R.string.academic_cert_note, R.string.academic_cert_save,
            )
        }
    }

    // ---- The five versions ----

    /** M / Profil akademik · Tingkatan 1–3: school exam grades (A–F) for the Form 4 stream suggestion. */
    private fun showForm13() {
        heading(R.string.academic_f13_eyebrow, R.string.academic_f13_title, R.string.academic_f13_intro, R.string.academic_f13_save)
        val year = Calendar.getInstance().get(Calendar.YEAR)
        val form = choice?.formYear?.takeIf { it in 1..3 } ?: 3
        add(pair(
            formField(listOf(1, 2, 3), form) { getString(R.string.academic_form_n, it) },
            dropdown(R.string.academic_exam, listOf(
                getString(R.string.academic_exam_end, year - 1),
                getString(R.string.academic_exam_mid, year),
                getString(R.string.academic_exam_mid, year - 1),
            ), selected = 0),
        ))
        add(subjectCard(
            title = R.string.academic_f13_subjects, hint = R.string.academic_f13_subjects_hint, scale = schoolScale,
            catalogue = schoolSubjects,
            entries = listOf("A", "B", "A", "A", "B", "A", "B").mapIndexed { i, g -> Entry(schoolSubjects[i], g) },
        ))
        add(note(R.string.academic_f13_note, caution = false))
    }

    /** M / Profil akademik · Tingkatan 4–5: SPM subjects with the current grade and a target for Merit Lab. */
    private fun showForm45() {
        heading(R.string.academic_f45_eyebrow, R.string.academic_f45_title, R.string.academic_f45_intro, R.string.academic_f45_save)
        val form = choice?.formYear?.takeIf { it in 4..5 } ?: 5
        add(pair(
            formField(listOf(4, 5), form) { getString(R.string.academic_form_short, it) },
            dropdown(R.string.academic_stream, streams.map(::getString), selected = 0),
        ))
        val grades = listOf("A-" to "A", "B+" to "A-", "A" to "A+", "B" to "A", "A" to "A", "B" to "A-", "B+" to "A", "B" to "A-")
        add(subjectCard(
            title = null, hint = null, scale = spmScale, catalogue = spmSubjects, withTarget = true,
            entries = grades.mapIndexed { i, (now, target) -> Entry(spmSubjects[i], now, target) },
        ))
        add(note(R.string.academic_f45_note, caution = true))
    }

    /** M / Profil akademik · Lepasan STPM / Matrikulasi / Asasi / A-Level. */
    private fun showPreU() {
        heading(R.string.academic_preu_eyebrow, R.string.academic_preu_title, R.string.academic_preu_intro, R.string.academic_preu_save)
        val type = choice?.qualification?.takeIf { it in preUTypes } ?: Qualification.STPM
        add(preUChips(type))
        add(pair(
            textField(R.string.academic_pngk, "3.67", InputType.TYPE_CLASS_NUMBER or InputType.TYPE_NUMBER_FLAG_DECIMAL),
            muetField(band = 4),
        ))
        val typeName = if (type == Qualification.A_LEVEL) getString(R.string.academic_preu_a_level) else getString(type.label)
        add(subjectCard(
            titleText = getString(R.string.academic_preu_grades, typeName), hint = null, scale = stpmScale, catalogue = stpmSubjects,
            entries = listOf("A-", "A", "B+", "A-").mapIndexed { i, g -> Entry(stpmSubjects[i], g) },
        ))
        add(chipCard(
            R.string.academic_spm_base, R.string.academic_spm_base_hint, R.drawable.bg_pill_mint,
            listOf(R.string.academic_spm_bm, R.string.academic_spm_history, R.string.academic_spm_bi),
        ))
        add(note(R.string.academic_preu_note, caution = false))
    }

    /** M / Profil akademik · Diploma, and · Lepasan Sijil: the same fields with different names and paths. */
    private fun showPostSecondary(
        @StringRes eyebrow: Int, @StringRes title: Int, @StringRes intro: Int,
        @StringRes institutionLabel: Int, @StringRes institution: Int,
        @StringRes fieldLabel: Int, @StringRes field: Int,
        @StringRes programmeLabel: Int, @StringRes programme: Int, cgpa: String, muetBand: Int?,
        @StringRes related: Int, paths: List<Int>,
        @StringRes noteText: Int, @StringRes save: Int,
    ) {
        heading(eyebrow, title, intro, save)
        add(combobox(institutionLabel, institutions, institution))
        add(combobox(fieldLabel, fields, field))
        add(textField(programmeLabel, getString(programme), InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_FLAG_CAP_WORDS))
        add(pair(
            textField(R.string.academic_cgpa, cgpa, InputType.TYPE_CLASS_NUMBER or InputType.TYPE_NUMBER_FLAG_DECIMAL),
            muetField(muetBand),
        ))
        add(chipCard(related, hint = null, R.drawable.bg_pill_blue, paths))
        add(note(noteText, caution = true))
    }

    // ---- Level changes ----

    /** School levels are asked whether SPM results are out; the rest pick their qualification. */
    private fun changeLevel(preselect: Qualification?) {
        val onSaved: (LevelChoice) -> Unit = { show(it) }
        when (choice?.level) {
            EducationLevel.FORM1_3, EducationLevel.FORM4_5, EducationLevel.AFTER_SPM, null -> showLevelUpdateSheet(choice, onSaved)
            else -> showLevelChangeSheet(choice, preselect, onSaved)
        }
    }

    /** The "Tingkatan" field: picking another form saves it as the student's form at once. */
    private fun formField(forms: List<Int>, selected: Int, name: (Int) -> String): View =
        dropdown(R.string.academic_form, forms.map(name), forms.indexOf(selected)) { i ->
            val level = choice?.level?.takeIf { it.asksForm } ?: if (forms.first() == 1) EducationLevel.FORM1_3 else EducationLevel.FORM4_5
            if (forms[i] != choice?.formYear) saveLevel(LevelChoice(level, forms[i], null)) { choice = it }
        }

    // ---- Building blocks ----

    private fun heading(@StringRes eyebrow: Int, @StringRes title: Int, @StringRes intro: Int, @StringRes save: Int) {
        findViewById<TextView>(R.id.eyebrow).setText(eyebrow)
        findViewById<TextView>(R.id.title).setText(title)
        findViewById<TextView>(R.id.intro).setText(intro)
        findViewById<TextView>(R.id.button_save).apply {
            setText(save)
            setOnClickListener {
                when (save) {
                    R.string.academic_f13_save -> openOnce(RoadmapActivity::class.java)
                    R.string.academic_f45_save -> openOnce(MeritLabActivity::class.java)
                    else -> openOnce(ExploreActivity::class.java)
                }
            }
        }
    }

    /** Adds a block 16dp below the one before (the design's "Kandungan" gap). */
    private fun add(view: View) {
        blocks.addView(view)
        view.updateLayoutParams<LinearLayout.LayoutParams> { topMargin = dp(16) }
    }

    /** Two fields side by side, 10dp apart. */
    private fun pair(first: View, second: View): View = LinearLayout(this).apply {
        orientation = LinearLayout.HORIZONTAL
        addView(first, LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f))
        addView(second, LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f).apply { marginStart = dp(10) })
    }

    /** A labelled box that opens [options] in a menu; [onPick] gets the index chosen. */
    private fun dropdown(@StringRes label: Int, options: List<String>, selected: Int, onPick: (Int) -> Unit = {}): View {
        val field = layoutInflater.inflate(R.layout.item_field_dropdown, blocks, false)
        val labelText = getString(label)
        field.findViewById<TextView>(R.id.label).text = labelText
        val value = field.findViewById<TextView>(R.id.value)
        fun set(i: Int) {
            value.text = options[i]
            value.contentDescription = "$labelText: ${options[i]}"
        }
        set(selected.coerceIn(options.indices))
        value.setOnClickListener {
            pickFrom(value, options) { i ->
                set(i)
                onPick(i)
            }
        }
        return field
    }

    private fun muetField(band: Int?): View {
        val options = (1..6).map { getString(R.string.academic_muet_band, it) } + getString(R.string.academic_muet_none)
        return dropdown(R.string.academic_muet, options, selected = band?.minus(1) ?: options.lastIndex)
    }

    private fun textField(@StringRes label: Int, value: String, inputType: Int): View {
        val field = layoutInflater.inflate(R.layout.item_field_text, blocks, false)
        field.findViewById<TextView>(R.id.label).setText(label)
        field.findViewById<EditText>(R.id.value).apply {
            setText(value)
            this.inputType = inputType
        }
        return field
    }

    /** A searchable list (institution, field); × empties it until another is picked. */
    private fun combobox(@StringRes label: Int, options: List<Int>, @StringRes selected: Int): View {
        val field = layoutInflater.inflate(R.layout.item_combobox, blocks, false)
        val labelText = getString(label)
        field.findViewById<TextView>(R.id.label).text = labelText
        val box = field.findViewById<View>(R.id.box)
        val value = field.findViewById<TextView>(R.id.value)
        val clear = field.findViewById<View>(R.id.clear)
        clear.contentDescription = getString(R.string.field_clear, labelText)
        fun set(@StringRes option: Int?) {
            value.text = option?.let(::getString) ?: getString(R.string.field_choose)
            value.setTextColor(getColor(if (option != null) R.color.navy else R.color.muted))
            clear.isVisible = option != null
            box.contentDescription = "$labelText: ${value.text}"
        }
        set(selected)
        box.setOnClickListener { pickFrom(value, options.map(::getString)) { set(options[it]) } }
        clear.setOnClickListener { set(null) }
        return field
    }

    /**
     * A white card listing [entries]: tap a grade to change it, × removes the subject, "+ Tambah subjek"
     * offers the subjects in [catalogue] that are not on the list yet.
     */
    private fun subjectCard(
        @StringRes title: Int? = null,
        titleText: String? = title?.let(::getString),
        @StringRes hint: Int?,
        scale: List<String>,
        catalogue: List<Subject>,
        entries: List<Entry>,
        withTarget: Boolean = false,
    ): View {
        val card = layoutInflater.inflate(R.layout.item_subject_card, blocks, false)
        card.findViewById<TextView>(R.id.card_title).apply {
            isVisible = titleText != null
            text = titleText
        }
        card.findViewById<TextView>(R.id.card_hint).apply {
            isVisible = hint != null
            hint?.let(::setText)
        }
        card.findViewById<View>(R.id.columns).isVisible = withTarget
        val rows = card.findViewById<LinearLayout>(R.id.rows)
        val list = entries.toMutableList()

        fun addRow(entry: Entry) {
            val row = layoutInflater.inflate(R.layout.item_subject_row, rows, false)
            val name = getString(entry.subject.name)
            row.findViewById<TextView>(R.id.name).text = name
            row.findViewById<TextView>(R.id.category).setText(entry.subject.group)
            gradePicker(row.findViewById(R.id.grade), scale, entry.grade, R.string.subject_grade, name) { entry.grade = it }
            row.findViewById<TextView>(R.id.target).let { target ->
                target.isVisible = withTarget
                if (withTarget) gradePicker(target, scale, entry.target ?: scale.first(), R.string.subject_target, name) { entry.target = it }
            }
            row.findViewById<View>(R.id.remove).apply {
                contentDescription = getString(R.string.subject_remove, name)
                setOnClickListener {
                    list.remove(entry)
                    rows.removeView(row)
                }
            }
            rows.addView(row)
        }
        list.forEach(::addRow)

        val add = card.findViewById<View>(R.id.button_add)
        add.setOnClickListener {
            val missing = catalogue.filter { s -> list.none { it.subject == s } }
            if (missing.isEmpty()) {
                Toast.makeText(this, R.string.subject_all_added, Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }
            pickFrom(add, missing.map { getString(it.name) }) { i ->
                val entry = Entry(missing[i], scale.first(), scale.first().takeIf { withTarget })
                list.add(entry)
                addRow(entry)
            }
        }
        return card
    }

    private fun gradePicker(view: TextView, scale: List<String>, grade: String, @StringRes describe: Int, subject: String, onPick: (String) -> Unit) {
        fun set(g: String) {
            view.text = g
            view.contentDescription = getString(describe, subject, g)
        }
        set(grade)
        view.setOnClickListener {
            pickFrom(view, scale) { i ->
                set(scale[i])
                onPick(scale[i])
            }
        }
    }

    /** STPM · Matrikulasi · Asasi · A-Level: tapping another one confirms the change of qualification. */
    private fun preUChips(selected: Qualification): View {
        val group = ChipGroup(this).apply {
            chipSpacingHorizontal = dp(6)
            chipSpacingVertical = dp(6)
        }
        for (type in preUTypes) {
            val chip = layoutInflater.inflate(R.layout.item_chip_choice, group, false) as TextView
            chip.text = if (type == Qualification.A_LEVEL) getString(R.string.academic_preu_a_level) else getString(type.label)
            chip.isSelected = type == selected
            chip.setOnClickListener { if (type != selected) changeLevel(preselect = type) }
            group.addView(chip)
        }
        return group
    }

    private fun chipCard(@StringRes title: Int, @StringRes hint: Int?, @DrawableRes chipBackground: Int, chips: List<Int>): View {
        val card = layoutInflater.inflate(R.layout.item_chip_card, blocks, false)
        card.findViewById<TextView>(R.id.card_title).setText(title)
        card.findViewById<TextView>(R.id.card_hint).apply {
            isVisible = hint != null
            hint?.let(::setText)
        }
        val group = card.findViewById<ChipGroup>(R.id.chips)
        for (text in chips) {
            val chip = layoutInflater.inflate(R.layout.item_chip, group, false) as TextView
            chip.setText(text)
            chip.setBackgroundResource(chipBackground)
            group.addView(chip)
        }
        return card
    }

    /** "i" on light blue for information, "!" on cream for a caution. */
    private fun note(@StringRes text: Int, caution: Boolean): View {
        val note = layoutInflater.inflate(R.layout.item_note, blocks, false)
        note.setBackgroundResource(if (caution) R.drawable.bg_note_cream else R.drawable.bg_note_blue)
        note.findViewById<TextView>(R.id.mark).text = if (caution) "!" else "i"
        note.findViewById<TextView>(R.id.text).setText(text)
        return note
    }

    private fun pickFrom(anchor: View, options: List<String>, onPick: (Int) -> Unit) {
        PopupMenu(this, anchor).apply {
            options.forEachIndexed { i, option -> menu.add(0, i, i, option) }
            setOnMenuItemClickListener { item ->
                onPick(item.itemId)
                true
            }
            show()
        }
    }

    private fun dp(value: Int) = (value * resources.displayMetrics.density).toInt()
}
