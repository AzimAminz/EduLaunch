package my.utem.ftmk.edulaunch.documents

import android.content.Intent
import android.graphics.pdf.PdfRenderer
import android.net.Uri
import android.provider.OpenableColumns
import android.text.format.Formatter
import android.view.Gravity
import android.view.View
import android.widget.LinearLayout
import android.widget.TextView
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.annotation.StringRes
import java.util.Calendar
import my.utem.ftmk.edulaunch.R
import my.utem.ftmk.edulaunch.explore.Program
import my.utem.ftmk.edulaunch.explore.RecommendationsActivity
import my.utem.ftmk.edulaunch.explore.openProgram
import my.utem.ftmk.edulaunch.home.BlockActivity
import my.utem.ftmk.edulaunch.home.Detail
import my.utem.ftmk.edulaunch.home.FeaturePage
import my.utem.ftmk.edulaunch.home.FeaturePageActivity
import my.utem.ftmk.edulaunch.home.Go
import my.utem.ftmk.edulaunch.home.PageAction
import my.utem.ftmk.edulaunch.merit.EligibilityActivity
import my.utem.ftmk.edulaunch.ui.Blocks
import my.utem.ftmk.edulaunch.ui.ButtonStyle
import my.utem.ftmk.edulaunch.ui.ChipSpec
import my.utem.ftmk.edulaunch.ui.Tone
import my.utem.ftmk.edulaunch.ui.openOnce

// Figma section "8 · Dokumen akademik". Choosing a file uses the phone's picker and checks that the file
// can be opened (a locked or damaged PDF, or one over 10 MB, goes to "Fail belum dapat dibaca"). Reading the
// grades out of it is the OCR service's job; until that is connected, the subjects read are the design's sample.

private const val MAX_BYTES = 10L * 1024 * 1024
private val spmScale = listOf("A+", "A", "A-", "B+", "B", "C+", "C", "D", "E", "G")

/** M21 / PDF input & consent. */
class DocumentsActivity : BlockActivity(activeTab = null, showTabs = false) {
    private val picker = registerForActivityResult(ActivityResultContracts.OpenDocument()) { uri -> uri?.let(::check) }

    override fun Blocks.build() {
        eyebrow(R.string.docs_eyebrow)
        title(R.string.docs_title)
        intro(R.string.docs_intro)
        infoCard(str(R.string.docs_upload_title), str(R.string.docs_upload_body), Tone.BLUE)
        button(R.string.docs_choose_file, R.drawable.ic_upload, radius = 16) {
            picker.launch(arrayOf("application/pdf", "image/jpeg", "image/png"))
        }
        infoCard(str(R.string.docs_consent_title), str(R.string.docs_consent_body))
        button(R.string.docs_manual, R.drawable.ic_action_pencil, style = ButtonStyle.PLAIN, radius = 16) {
            openOnce(ResultEntryActivity::class.java)
        }
        picture(R.drawable.world_documents, 210, top = 40).apply {
            (layoutParams as LinearLayout.LayoutParams).gravity = Gravity.CENTER_HORIZONTAL
        }
    }

    /** Opens the file to count its pages; anything that cannot be opened is "not readable yet". */
    private fun check(uri: Uri) {
        var name = uri.lastPathSegment ?: "-"
        var size = 0L
        contentResolver.query(uri, arrayOf(OpenableColumns.DISPLAY_NAME, OpenableColumns.SIZE), null, null, null)?.use { c ->
            if (c.moveToFirst()) {
                c.getString(0)?.let { name = it }
                size = c.getLong(1)
            }
        }
        val pages = try {
            if (contentResolver.getType(uri) == "application/pdf") {
                contentResolver.openFileDescriptor(uri, "r")!!.use { fd -> PdfRenderer(fd).use { it.pageCount } }
            } else {
                contentResolver.openInputStream(uri)!!.use { 1 }
            }
        } catch (e: Exception) {
            0
        }
        if (pages == 0 || size > MAX_BYTES) {
            openOnce(UnreadableFileActivity::class.java)
            return
        }
        openOnce(SelectedDocumentActivity::class.java) {
            putExtra("name", name)
            putExtra("size", size)
            putExtra("pages", pages)
            putExtra("uri", uri.toString())
        }
    }
}

/** M22 / Selected PDF & processing. */
class SelectedDocumentActivity : BlockActivity(activeTab = null, showTabs = false) {
    private var done = false

    override fun Blocks.build() {
        val name = intent.getStringExtra("name") ?: "Slip-SPM-contoh.pdf"
        val pages = intent.getIntExtra("pages", 2)
        val size = Formatter.formatShortFileSize(activity, intent.getLongExtra("size", 1_200_000L))
        eyebrow(R.string.selected_eyebrow)
        title(R.string.selected_title)
        intro(R.string.selected_intro)
        infoCard(name, str(R.string.selected_meta, pages, size))
        infoCard(str(R.string.selected_consent_title), str(R.string.selected_consent_body), Tone.MINT)
        progress(if (done) 1f else 0.65f)
        text(str(if (done) R.string.selected_read_done else R.string.selected_reading), 16f)
        button(R.string.selected_see_reading, R.drawable.ic_arrow_right, iconAtEnd = true, radius = 16) {
            openOnce(ReviewReadingActivity::class.java) { putExtras(intent) }
        }.isEnabled = done
        picture(R.drawable.rimau_hourglass, 154, top = 60).apply {
            (layoutParams as LinearLayout.LayoutParams).gravity = Gravity.CENTER_HORIZONTAL
        }
    }

    override fun onResume() {
        super.onResume()
        if (!done) blocks.column.postDelayed({ done = true; rebuild() }, 1800)
    }
}

/** A subject read from the slip; [reason] is set when the reading needs checking. */
private class Read(@StringRes val subject: Int, var grade: String, @StringRes var reason: Int? = null)

/** M23 / Semak bacaan · betulkan yang ditanda sahaja. */
class ReviewReadingActivity : BlockActivity(activeTab = null, gap = 14, showTabs = false) {
    private val read = mutableListOf(
        Read(R.string.subject_bm, "A"), Read(R.string.subject_bi, "B+"),
        Read(R.string.subject_math, "A-", R.string.review_math_reason),
        Read(R.string.subject_history, "B"), Read(R.string.subject_moral, "A"), Read(R.string.subject_science, "B+"),
        Read(R.string.subject_principles_accounts, "A-"), Read(R.string.subject_economics, "B"),
        Read(R.string.subject_art, "B+", R.string.review_art_reason),
    )
    private var confirmed = false

    override fun Blocks.build() {
        val flagged = read.count { it.reason != null }
        eyebrow(R.string.review_eyebrow, 11f)
        title(if (flagged > 0) str(R.string.review_title, read.size, flagged) else str(R.string.review_title_done, read.size), 24f)
        chips(listOfNotNull(
            ChipSpec(str(R.string.review_slip), Tone.BLUE, semibold = true, sizeSp = 12f, padH = 9, padV = 5),
            ChipSpec(str(R.string.review_sure, read.size - flagged), Tone.MINT, semibold = true, sizeSp = 12f, padH = 9, padV = 5),
            ChipSpec(str(R.string.review_check, flagged), Tone.YELLOW, semibold = true, sizeSp = 12f, padH = 9, padV = 5).takeIf { flagged > 0 },
        ))
        val file = LinearLayout(activity).apply {
            gravity = Gravity.CENTER_VERTICAL
            background = rounded(Tone.WHITE, 12)
            setPadding(dp(14), dp(10), dp(14), dp(10))
            addView(textView(intent.getStringExtra("name") ?: "Slip-SPM-2025.pdf", 14f, R.font.outfit_semibold), LinearLayout.LayoutParams(0, -2, 1f))
            addView(textView(str(R.string.review_view_file), 13f, R.font.outfit_semibold))
        }
        clickable(file) { viewFile() }
        add(file)
        card(radius = 16, padding = 14, paddingV = 6, innerGap = 0) {
            read.forEach { r -> readRow(r) }
        }
        val adder = textView(str(R.string.review_add), 15f, R.font.outfit_semibold).apply {
            gravity = Gravity.CENTER
            setBackgroundResource(R.drawable.bg_add_dashed)
            setPadding(dp(16), dp(14), dp(16), dp(14))
        }
        clickable(adder) {
            val missing = listOf(R.string.subject_add_math, R.string.subject_physics, R.string.subject_chemistry, R.string.subject_biology, R.string.subject_islamic)
                .filter { s -> read.none { it.subject == s } }
            if (missing.isEmpty()) Toast.makeText(activity, R.string.subject_all_added, Toast.LENGTH_SHORT).show()
            else pickFrom(adder, missing.map(::str)) { i -> read.add(Read(missing[i], "A")); rebuild() }
        }
        add(adder)
        text(str(R.string.subject_add_hint), 13f, color = R.color.muted, top = 8)
        val box = textView(if (confirmed) "✓" else "", 13f, R.font.outfit_bold, R.color.white).apply {
            gravity = Gravity.CENTER
            background = if (confirmed) rounded(Tone.NAVY, 5) else rounded(Tone.WHITE, 5, Tone.NAVY, 2)
        }
        val confirm = LinearLayout(activity).apply {
            gravity = Gravity.CENTER_VERTICAL
            minimumHeight = dp(40)
            addView(box, LinearLayout.LayoutParams(dp(20), dp(20)))
            addView(textView(str(R.string.review_confirm), 13f, R.font.outfit_medium), LinearLayout.LayoutParams(0, -2, 1f).apply { marginStart = dp(10) })
            contentDescription = str(R.string.review_confirm)
            isSelected = confirmed
        }
        clickable(confirm) { confirmed = !confirmed; rebuild() }
        add(confirm)
        button(str(R.string.review_save, read.size), R.drawable.ic_check_circle) {
            openOnce(ResultsSavedActivity::class.java); finish()
        }.isEnabled = confirmed && flagged == 0
        button(R.string.review_manual, R.drawable.ic_action_pencil, style = ButtonStyle.OUTLINED) { openOnce(ResultEntryActivity::class.java) }
        text(str(R.string.review_note), 12f, color = R.color.muted)
    }

    /** "✓ Bahasa Melayu  [A ⌄]  ×"; a flagged one is cream, with why it needs checking underneath. */
    private fun Blocks.readRow(r: Read) {
        val flagged = r.reason != null
        val row = LinearLayout(activity).apply { orientation = LinearLayout.VERTICAL }
        val line = LinearLayout(activity).apply { gravity = Gravity.CENTER_VERTICAL }
        line.addView(textView(if (flagged) "!" else "✓", 11f, R.font.outfit_bold).apply {
            gravity = Gravity.CENTER
            background = rounded(if (flagged) Tone.YELLOW else Tone.MINT, 10)
            importantForAccessibility = View.IMPORTANT_FOR_ACCESSIBILITY_NO
        }, LinearLayout.LayoutParams(dp(20), dp(20)))
        val name = str(r.subject)
        line.addView(textView(name, 14f, R.font.outfit_medium), LinearLayout.LayoutParams(0, -2, 1f).apply { marginStart = dp(8) })
        val grade = layoutInflater.inflate(R.layout.item_subject_row, column, false).findViewById<TextView>(R.id.grade).also { (it.parent as LinearLayout).removeView(it) }
        grade.text = r.grade
        grade.contentDescription = str(R.string.subject_grade, name, r.grade)
        grade.background = rounded(Tone.WHITE, 8, if (flagged) Tone.YELLOW else Tone.LINE, if (flagged) 2 else 1)
        grade.setOnClickListener { pickFrom(grade, spmScale) { i -> r.grade = spmScale[i]; r.reason = null; rebuild() } }
        line.addView(grade, LinearLayout.LayoutParams(dp(62), -2).apply { marginStart = dp(8) })
        line.addView(android.widget.ImageButton(activity).apply {
            setImageResource(R.drawable.ic_remove)
            imageTintList = android.content.res.ColorStateList.valueOf(getColor(R.color.muted))
            background = null
            contentDescription = str(R.string.subject_remove, name)
            setOnClickListener { read.remove(r); rebuild() }
        }, LinearLayout.LayoutParams(dp(40), dp(40)))
        row.addView(line)
        if (flagged) {
            row.background = rounded(Tone.CREAM, 10)
            row.setPadding(dp(8), dp(9), dp(8), dp(9))
            row.addView(textView(str(r.reason!!), 12f).apply { setPadding(dp(28), dp(4), 0, 0) })
        } else {
            row.setBackgroundResource(R.drawable.bg_subject_row)
            row.setPadding(0, dp(5), 0, dp(5))
        }
        add(row, 0)
    }

    private fun viewFile() {
        val uri = intent.getStringExtra("uri")?.let(Uri::parse)
        val view = Intent(Intent.ACTION_VIEW).setDataAndType(uri, contentResolver.getType(uri ?: Uri.EMPTY)).addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
        try {
            if (uri == null) throw android.content.ActivityNotFoundException()
            startActivity(view)
        } catch (e: android.content.ActivityNotFoundException) {
            Toast.makeText(this, R.string.review_no_viewer, Toast.LENGTH_SHORT).show()
        }
    }
}

/** M24 / Results saved: what changed, with the strongest match first. */
class ResultsSavedActivity : BlockActivity(activeTab = null, showTabs = false) {
    override fun Blocks.build() {
        eyebrow(R.string.saved_results_eyebrow)
        title(R.string.saved_results_title)
        intro(R.string.saved_results_intro)
        infoCard(str(R.string.saved_results_next_title), str(R.string.saved_results_next_body), Tone.MINT)
        button(R.string.saved_results_check, R.drawable.ic_check_circle, radius = 16) { openOnce(EligibilityActivity::class.java) }
        card(Tone.NAVY, radius = 18, padding = 16, paddingV = 18, innerGap = 12) {
            chips(listOf(ChipSpec(str(R.string.top_updated), Tone.YELLOW, semibold = true, sizeSp = 11f, padV = 5)), top = 0)
            text(str(R.string.top_title), 20f, R.font.outfit_bold, R.color.white, top = 6)
            chips(listOf(ChipSpec(str(R.string.top_new_eligible), Tone.MINT, semibold = true, sizeSp = 12f, padV = 5)), top = 8)
            card(radius = 16, padding = 14, innerGap = 8) {
                val chance = LinearLayout(activity).apply {
                    gravity = Gravity.CENTER_VERTICAL
                    background = rounded(Tone.BLUE, 999)
                    setPadding(dp(9), dp(5), dp(9), dp(5))
                    addView(meter(3, fill = Tone.GREEN))
                    addView(textView(str(R.string.top_chance_high), 11f, R.font.outfit_semibold), LinearLayout.LayoutParams(-2, -2).apply { marginStart = dp(6) })
                }
                val badges = chips(listOf(
                    ChipSpec(str(R.string.top_strongest), Tone.YELLOW, semibold = true, sizeSp = 12f, padV = 5),
                    ChipSpec(str(R.string.top_eligible), Tone.MINT, semibold = true, sizeSp = 12f, padV = 5),
                ), top = 0)
                badges.addView(chance)
                text(str(R.string.program_engineering_full), 18f, R.font.outfit_bold)
                text(str(R.string.top_eng_meta), 13f, color = R.color.muted)
                listOf(R.string.top_eng_r1, R.string.top_eng_r2, R.string.top_eng_r3).forEach { marked("✓", str(it), R.color.green) }
                val requirements = button(R.string.rec_requirements, R.drawable.ic_arrow_right, iconAtEnd = true) { openProgram(Program.ENGINEERING) }
                val save = button(R.string.rec_save, R.drawable.ic_action_bookmark, style = ButtonStyle.OUTLINED) {}
                save.setOnClickListener { save.text = str(R.string.rec_saved) }
                listOf(requirements, save).forEach { it.textSize = 14f; it.minHeight = dp(44); it.setPadding(dp(8), 0, dp(8), 0) }
                row(requirements, save)
            }
            text(str(R.string.top_others), 13f, R.font.outfit_semibold, R.color.yellow)
            listOf(
                Triple(R.string.program_computer_full, R.string.top_cs_place, R.string.top_eligible to Tone.MINT),
                Triple(R.string.top_matric, R.string.top_matric_place, R.string.top_almost to Tone.YELLOW),
            ).forEach { (name, place, status) ->
                val option = LinearLayout(activity).apply {
                    gravity = Gravity.CENTER_VERTICAL
                    background = rounded(Tone.WHITE, 12).apply { setColor(0x1AFFFFFF) }
                    setPadding(dp(14), dp(12), dp(14), dp(12))
                    val texts = LinearLayout(activity).apply { orientation = LinearLayout.VERTICAL }
                    texts.addView(textView(str(name), 14f, R.font.outfit_semibold, R.color.white))
                    texts.addView(textView(str(place), 12f, color = R.color.white))
                    addView(texts, LinearLayout.LayoutParams(0, -2, 1f))
                    addView(chip(ChipSpec(str(status.first), status.second, semibold = true, sizeSp = 11f, padV = 5)))
                }
                clickable(option) { openOnce(RecommendationsActivity::class.java) }
                add(option, 8)
            }
            button(R.string.top_see_all, R.drawable.ic_arrow_right, iconAtEnd = true, style = ButtonStyle.YELLOW, top = 8) {
                openOnce(RecommendationsActivity::class.java)
            }.apply { textSize = 14f }
            text(str(R.string.top_footer), 11f, color = R.color.white, top = 8)
        }
        picture(R.drawable.rimau_cheer, 210).apply { (layoutParams as LinearLayout.LayoutParams).gravity = Gravity.CENTER_HORIZONTAL }
    }
}

private class Entered(@StringRes val subject: Int, @StringRes val group: Int, var grade: String)

/** M13 / Academic result entry: real SPM grades, typed in. */
class ResultEntryActivity : BlockActivity(activeTab = null, gap = 10) {
    private val subjects = mutableListOf(
        Entered(R.string.subject_bm, R.string.category_spm_core, "A"), Entered(R.string.subject_bi, R.string.category_spm_core, "B+"),
        Entered(R.string.subject_math, R.string.category_spm_core, "A-"), Entered(R.string.subject_history, R.string.category_spm_core, "B"),
        Entered(R.string.subject_moral, R.string.category_spm_core, "A"), Entered(R.string.subject_principles_accounts, R.string.category_elective, "A-"),
    )
    private var year = Calendar.getInstance().get(Calendar.YEAR) - 1

    override fun Blocks.build() {
        eyebrow(R.string.entry_eyebrow)
        title(R.string.entry_title)
        intro(R.string.entry_intro)
        add(layoutInflater.inflate(R.layout.include_upload_banner, column, false).also { banner ->
            banner.findViewById<View>(R.id.button_upload).setOnClickListener { openOnce(DocumentsActivity::class.java) }
        })
        card {
            pairs(listOf(str(R.string.entry_qualification) to "SPM"), 19f, R.font.outfit_semibold, top = 0)
        }
        card(onClick = {}) {
            pairs(listOf(str(R.string.entry_year) to str(R.string.entry_spm_year, year)), 19f, R.font.outfit_semibold, top = 0)
        }.let { yearCard ->
            yearCard.setOnClickListener {
                val years = (0..4).map { Calendar.getInstance().get(Calendar.YEAR) - it }
                pickFrom(yearCard, years.map { str(R.string.entry_spm_year, it) }) { i -> year = years[i]; rebuild() }
            }
        }
        card(radius = 16, padding = 16, paddingV = 12, innerGap = 0) {
            subjects.forEach { s ->
                val row = layoutInflater.inflate(R.layout.item_subject_row, column, false)
                val name = str(s.subject)
                row.findViewById<TextView>(R.id.name).text = name
                row.findViewById<TextView>(R.id.category).setText(s.group)
                row.findViewById<TextView>(R.id.grade).apply {
                    text = s.grade
                    contentDescription = str(R.string.subject_grade, name, s.grade)
                    setOnClickListener { pickFrom(this, spmScale) { i -> s.grade = spmScale[i]; rebuild() } }
                }
                row.findViewById<View>(R.id.remove).apply {
                    contentDescription = str(R.string.subject_remove, name)
                    setOnClickListener { subjects.remove(s); rebuild() }
                }
                add(row, 0)
            }
        }
        val adder = textView(str(R.string.subject_add), 15f, R.font.outfit_semibold).apply {
            gravity = Gravity.CENTER
            setBackgroundResource(R.drawable.bg_add_dashed)
            setPadding(dp(16), dp(14), dp(16), dp(14))
        }
        clickable(adder) {
            val catalogue = listOf(R.string.subject_islamic, R.string.subject_add_math, R.string.subject_physics, R.string.subject_chemistry,
                R.string.subject_biology, R.string.subject_economics, R.string.subject_art)
            val missing = catalogue.filter { c -> subjects.none { it.subject == c } }
            if (missing.isEmpty()) Toast.makeText(activity, R.string.subject_all_added, Toast.LENGTH_SHORT).show()
            else pickFrom(adder, missing.map(::str)) { i -> subjects.add(Entered(missing[i], R.string.category_elective, "A")); rebuild() }
        }
        add(adder)
        text(str(R.string.subject_add_hint), 13f, color = R.color.muted, top = 8)
        val required = subjects.any { it.subject == R.string.subject_bm } && subjects.any { it.subject == R.string.subject_history }
        add(textView(str(if (required) R.string.entry_summary else R.string.entry_summary_missing, subjects.size), 13f, R.font.outfit_medium).apply {
            background = rounded(if (required) Tone.MINT else Tone.CREAM, 12)
            setPadding(dp(14), dp(10), dp(14), dp(10))
        })
        button(R.string.entry_check_choices, radius = 16, wrap = true) { openOnce(RecommendationsActivity::class.java) }.isEnabled = required
        text(str(R.string.entry_note), 12f, color = R.color.muted)
    }
}

/** M / Fail belum dapat dibaca. */
val unreadablePage = FeaturePage(
    eyebrow = R.string.unreadable_eyebrow, title = R.string.unreadable_title, intro = R.string.unreadable_intro,
    illustration = R.drawable.rimau_detective, activeTab = null,
    details = listOf(
        Detail(R.string.unreadable_kept_title, R.string.unreadable_kept_body),
        Detail(R.string.unreadable_continue_title, R.string.unreadable_continue_body),
    ),
    actions = listOf(
        PageAction(R.string.unreadable_other_file, R.drawable.ic_upload, Go.To(DocumentsActivity::class.java)),
        PageAction(R.string.docs_manual, R.drawable.ic_action_pencil, Go.To(ResultEntryActivity::class.java)),
    ),
)

class UnreadableFileActivity : FeaturePageActivity(unreadablePage)
