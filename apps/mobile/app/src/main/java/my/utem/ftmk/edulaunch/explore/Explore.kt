package my.utem.ftmk.edulaunch.explore

import android.content.Intent
import androidx.annotation.StringRes
import com.google.android.material.button.MaterialButton
import my.utem.ftmk.edulaunch.R
import my.utem.ftmk.edulaunch.home.AcademicProfileActivity
import my.utem.ftmk.edulaunch.home.BlockActivity
import my.utem.ftmk.edulaunch.home.Detail
import my.utem.ftmk.edulaunch.home.FeaturePage
import my.utem.ftmk.edulaunch.home.FeaturePageActivity
import my.utem.ftmk.edulaunch.home.Go
import my.utem.ftmk.edulaunch.home.PageAction
import my.utem.ftmk.edulaunch.home.SavedActivity
import my.utem.ftmk.edulaunch.home.Tab
import my.utem.ftmk.edulaunch.merit.MeritLabActivity
import my.utem.ftmk.edulaunch.roadmap.RoadmapActivity
import my.utem.ftmk.edulaunch.ui.Blocks
import my.utem.ftmk.edulaunch.ui.ButtonStyle
import my.utem.ftmk.edulaunch.ui.ChipSpec
import my.utem.ftmk.edulaunch.ui.Tone
import my.utem.ftmk.edulaunch.ui.openOnce

// Figma section "4 · Teroka program". Programmes are sample data from the design until the catalogue
// service is read; the filters, tabs and "save" work on that sample.

enum class Category(@StringRes val label: Int) {
    TECH(R.string.explore_tech), SCIENCE(R.string.explore_science), DESIGN(R.string.field_design),
}

enum class Program(
    @StringRes val shortName: Int,
    @StringRes val meta: Int,
    @StringRes val fullName: Int,
    val tone: Tone,
    val category: Category,
    @StringRes val level: Int,
    val years: String,
) {
    COMPUTER(R.string.program_computer, R.string.program_computer_meta, R.string.program_computer_full, Tone.BLUE, Category.TECH, R.string.level_diploma, "3"),
    ENGINEERING(R.string.program_engineering, R.string.program_engineering_meta, R.string.program_engineering_full, Tone.YELLOW, Category.SCIENCE, R.string.level_foundation, "1"),
    DESIGN(R.string.program_design, R.string.program_design_meta, R.string.program_design_full, Tone.MINT, Category.DESIGN, R.string.level_diploma, "2.5"),
}

private const val EXTRA_CATEGORY = "category"
private const val EXTRA_LEVEL = "level"
private const val EXTRA_LABEL = "label"
private const val EXTRA_PROGRAM = "program"

private val levels = listOf(R.string.level_diploma, R.string.level_foundation, R.string.level_degree, R.string.level_certificate)
private val universities = listOf(
    R.string.institution_uitm, R.string.institution_utem, R.string.institution_utm,
    R.string.institution_puo, R.string.institution_pmm, R.string.institution_kk,
)
private val fields = listOf(
    R.string.field_tvet, R.string.field_education, R.string.field_engineering, R.string.field_electrical, R.string.field_it,
    R.string.field_business, R.string.field_accounting, R.string.field_health, R.string.field_science, R.string.field_arts,
    R.string.field_design, R.string.field_agriculture, R.string.field_law,
)

/** Which sample category a field of study belongs to (null: none of the samples). */
private fun categoryOf(@StringRes field: Int): Category? = when (field) {
    R.string.field_it -> Category.TECH
    R.string.field_engineering, R.string.field_electrical, R.string.field_science -> Category.SCIENCE
    R.string.field_design -> Category.DESIGN
    else -> null
}

fun android.app.Activity.openProgram(program: Program) =
    openOnce(ProgramDetailActivity::class.java) { putExtra(EXTRA_PROGRAM, program.name) }

/** M07 / Explore programs, and M / Hasil program ditapis once a chip or the filter narrows it. */
class ExploreActivity : BlockActivity(Tab.EXPLORE) {
    private var category: Category? = null
    private var level: Int? = null
    private var label: String? = null
    private var noMatch = false

    override fun onCreate(savedInstanceState: android.os.Bundle?) {
        readFilter(intent)
        super.onCreate(savedInstanceState)
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        readFilter(intent)
        rebuild()
    }

    private fun readFilter(intent: Intent) {
        category = intent.getStringExtra(EXTRA_CATEGORY)?.let { name -> Category.entries.find { it.name == name } }
        level = intent.getIntExtra(EXTRA_LEVEL, 0).takeIf { it != 0 }
        label = intent.getStringExtra(EXTRA_LABEL)
        noMatch = intent.getBooleanExtra("noMatch", false)
    }

    override fun Blocks.build() {
        val shown = if (noMatch) emptyList() else Program.entries.filter { p ->
            (category == null || p.category == category) && (level == null || p.level == level)
        }
        val filterName = label ?: category?.let { str(it.label) }
        eyebrow(R.string.explore_eyebrow)
        title(R.string.explore_title)
        intro(if (filterName != null) str(R.string.explore_results, shown.size, filterName) else str(R.string.explore_intro))
        infoCard(filterName ?: str(R.string.explore_search), null, Tone.WHITE) { openOnce(ProgramSearchActivity::class.java) }

        fun pick(c: Category?) {
            category = c; level = null; label = null; noMatch = false
            rebuild()
        }
        val chipStyle = { text: Int, c: Category? ->
            val on = category == c && filterName == category?.let { str(it.label) }
            ChipSpec(str(text), if (on || (c == null && filterName == null)) Tone.YELLOW else Tone.BLUE, sizeSp = 12f, radius = 12, padH = 9, padV = 9) { pick(c) }
        }
        chips(listOf(chipStyle(R.string.explore_all, null), chipStyle(R.string.explore_tech, Category.TECH), chipStyle(R.string.explore_science, Category.SCIENCE)), spacing = 16)

        linkBanner(R.drawable.ic_sparkle, str(R.string.explore_matches_title), str(R.string.explore_matches_body)) {
            openOnce(RecommendationsActivity::class.java)
        }
        shown.forEach { p -> infoCard(str(p.shortName), str(p.meta), p.tone) { openProgram(p) } }
        if (shown.isEmpty()) note(R.string.explore_none)

        button(R.string.explore_filter, R.drawable.ic_search, style = ButtonStyle.OUTLINED, radius = 16) { openOnce(ProgramSearchActivity::class.java) }
        button(R.string.explore_university, R.drawable.ic_arrow_right, iconAtEnd = true, style = ButtonStyle.OUTLINED, radius = 16, top = 12) {
            openOnce(UniversityActivity::class.java)
        }
        button(R.string.explore_saved, R.drawable.ic_arrow_right, iconAtEnd = true, style = ButtonStyle.OUTLINED, radius = 16, top = 12) {
            openOnce(SavedActivity::class.java)
        }
    }
}

/** M / Cari program mengikut pilihan: university, field and level, then the filtered list. Also the top bar's search. */
class ProgramSearchActivity : BlockActivity(Tab.EXPLORE) {
    private var university: Int? = null
    private var field: Int? = null
    private var level: Int? = null

    override fun Blocks.build() {
        eyebrow(R.string.search_eyebrow)
        title(R.string.search_title)
        intro(R.string.search_intro, 16f)
        illustration(R.drawable.world_campus)
        combobox(R.string.search_university, universities.map(::str), university?.let(universities::indexOf),
            str(R.string.search_university_placeholder), str(R.string.search_university_hint)) { university = it?.let(universities::get) }
        combobox(R.string.search_field, fields.map(::str), field?.let(fields::indexOf),
            str(R.string.search_field_placeholder), str(R.string.search_field_hint)) { field = it?.let(fields::get) }
        dropdown(R.string.search_level, levels.map(::str), level?.let(levels::indexOf), str(R.string.search_any_level)) { level = levels[it] }
        button(R.string.search_show, R.drawable.ic_arrow_right, iconAtEnd = true) { showResults() }
        button(R.string.search_clear, R.drawable.ic_close, style = ButtonStyle.OUTLINED) {
            university = null; field = null; level = null
            rebuild()
        }
    }

    private fun showResults() {
        val names = listOfNotNull(university, field, level).map(::getString)
        val category = field?.let(::categoryOf)
        openOnce(ExploreActivity::class.java) {
            category?.let { putExtra(EXTRA_CATEGORY, it.name) }
            level?.let { putExtra(EXTRA_LEVEL, it) }
            if (names.isNotEmpty()) putExtra(EXTRA_LABEL, names.joinToString(" • "))
            if (field != null && category == null) putExtra("noMatch", true)
        }
    }
}

/** M08 / Program details. */
class ProgramDetailActivity : BlockActivity(Tab.EXPLORE) {
    override fun Blocks.build() {
        val program = intent.getStringExtra(EXTRA_PROGRAM)?.let { name -> Program.entries.find { it.name == name } } ?: Program.COMPUTER
        badge(str(R.string.detail_badge))
        eyebrow(program.category.label).apply { text = text.toString().uppercase() }
        title(program.fullName)
        intro(R.string.detail_institution)
        infoCard(str(R.string.detail_field), str(R.string.detail_duration, str(R.string.detail_years, program.years)), Tone.BLUE)
        card {
            text(str(R.string.detail_targets), 19f, R.font.outfit_semibold)
            intro(R.string.detail_targets_body, 14f)
            pairs(listOf(
                str(R.string.subject_math) to str(R.string.detail_your_target, "A"),
                str(R.string.subject_bi) to str(R.string.detail_your_target, "B+"),
            ))
        }
        button(R.string.detail_try_merit, radius = 16, wrap = true) { openOnce(MeritLabActivity::class.java) }
        button(R.string.detail_compare, style = ButtonStyle.PLAIN, radius = 16, wrap = true) { openOnce(CompareActivity::class.java) }
    }
}

/** M11 / Compare: the shortlist side by side. */
class CompareActivity : BlockActivity(Tab.EXPLORE) {
    override fun Blocks.build() {
        eyebrow(R.string.compare_eyebrow)
        title(R.string.compare_title)
        intro(R.string.compare_intro)
        for (option in listOf(R.string.compare_a, R.string.compare_b)) {
            card {
                text(str(option), 19f, R.font.outfit_semibold)
                intro(R.string.compare_meta, 14f)
                progress(0.8f)
                pairs(listOf(
                    str(R.string.compare_interest) to str(R.string.compare_high),
                    str(R.string.compare_eligibility) to str(R.string.compare_not_checked),
                ), font = R.font.outfit_regular, color = R.color.muted)
            }
        }
        button(R.string.compare_roadmap, radius = 16, wrap = true) { openOnce(RoadmapActivity::class.java) }
    }
}

private enum class Fit { ELIGIBLE, ALMOST, NOT_YET }

private class Recommendation(
    @StringRes val name: Int,
    @StringRes val institution: Int,
    val fit: Fit,
    val highFit: Boolean,
    val reasons: List<Int>,
    val cautions: List<Int>,
    val chance: Int,
    @StringRes val chanceText: Int,
    val program: Program?,
)

private val recommendations = listOf(
    Recommendation(R.string.program_engineering_full, R.string.rec_eng_institution, Fit.ELIGIBLE, true,
        listOf(R.string.rec_eng_r1, R.string.rec_eng_r2, R.string.rec_eng_r3), listOf(R.string.rec_eng_c1), 3, R.string.rec_eng_chance, Program.ENGINEERING),
    Recommendation(R.string.program_computer_full, R.string.rec_cs_institution, Fit.ELIGIBLE, true,
        listOf(R.string.rec_cs_r1, R.string.rec_cs_r2), emptyList(), 2, R.string.rec_cs_chance, Program.COMPUTER),
    Recommendation(R.string.program_design_full, R.string.rec_design_institution, Fit.ALMOST, false,
        listOf(R.string.rec_design_r1), listOf(R.string.rec_design_c1), 2, R.string.rec_design_chance, Program.DESIGN),
    Recommendation(R.string.rec_med_full, R.string.rec_med_institution, Fit.NOT_YET, false,
        emptyList(), listOf(R.string.rec_med_c1, R.string.rec_med_c2), 1, R.string.rec_med_chance, null),
)

/** M / Cadangan program · padanan AI: eligible first, with reasons, source and offer chance. */
class RecommendationsActivity : BlockActivity(Tab.EXPLORE, gap = 14) {
    private var tab = Fit.ELIGIBLE
    private val saved = mutableSetOf<Int>()

    override fun Blocks.build() {
        eyebrow(R.string.rec_eyebrow, 11f)
        title(R.string.rec_title, 26f, top = 6)
        intro(R.string.rec_intro, 14f, top = 6)
        val small = { text: Int -> ChipSpec(str(text), Tone.WHITE, sizeSp = 12f, padH = 9, padV = 5) }
        chips(listOf(
            small(R.string.rec_profile_level), small(R.string.rec_profile_subjects), small(R.string.rec_profile_interest),
            ChipSpec(str(R.string.rec_profile_check), outlined = true, semibold = true, sizeSp = 12f, padH = 9, padV = 5) {
                openOnce(AcademicProfileActivity::class.java)
            },
        ))
        val tabs = listOf(Fit.ELIGIBLE to str(R.string.rec_tab_eligible, 12), Fit.ALMOST to str(R.string.rec_tab_almost, 5), Fit.NOT_YET to str(R.string.rec_tab_not_yet, 8))
        chips(tabs.map { (fit, text) ->
            ChipSpec(text, Tone.WHITE, selected = fit == tab, semibold = true, padH = 9, padV = 5) { tab = fit; rebuild() }
        })
        recommendations.filter { it.fit == tab }.forEach { programCard(it) }

        card(Tone.BLUE, radius = 16, padding = 16, innerGap = 8) {
            text(str(R.string.rec_how_title), 16f, R.font.outfit_semibold)
            listOf(R.string.rec_how_1, R.string.rec_how_2, R.string.rec_how_3, R.string.rec_how_4).forEach { text(str(it), 13f) }
            text(str(R.string.rec_how_note), 12f, R.font.outfit_medium)
        }
    }

    private fun Blocks.programCard(rec: Recommendation) = card(radius = 16, padding = 16, innerGap = 8) {
        val status = when (rec.fit) {
            Fit.ELIGIBLE -> R.string.rec_status_eligible
            Fit.ALMOST -> R.string.rec_status_almost
            Fit.NOT_YET -> R.string.rec_status_not_yet
        }
        chips(listOf(
            ChipSpec(str(status), if (rec.fit == Fit.ELIGIBLE) Tone.MINT else Tone.CREAM, semibold = true, sizeSp = 12f, padH = 9, padV = 5),
            ChipSpec(str(if (rec.highFit) R.string.rec_fit_high else R.string.rec_fit_medium), Tone.BLUE, sizeSp = 12f, padH = 9, padV = 5),
        ))
        text(str(rec.name), 17f, R.font.outfit_semibold)
        intro(rec.institution, 13f)
        text(str(R.string.rec_why), 12f, R.font.outfit_semibold, R.color.muted)
        rec.reasons.forEach { marked("✓", str(it), R.color.green) }
        rec.cautions.forEach { marked("!", str(it), R.color.muted) }
        text(str(R.string.rec_source), 11f, color = R.color.muted)
        card(Tone.BG, radius = 10, padding = 12, paddingV = 9, innerGap = 3) {
            val level = when (rec.chance) { 3 -> R.string.rec_chance_high; 2 -> R.string.rec_chance_medium; else -> R.string.rec_chance_low }
            inline(
                textView(str(R.string.rec_chance), 12f, R.font.outfit_semibold),
                meter(rec.chance, fill = if (rec.chance == 3) Tone.GREEN else Tone.YELLOW),
                textView(str(level), 12f, R.font.outfit_bold),
            )
            text(str(rec.chanceText), 11f, color = R.color.muted)
        }
        val save = button(str(if (rec.name in saved) R.string.rec_saved else R.string.rec_save), R.drawable.ic_action_bookmark, style = ButtonStyle.OUTLINED) {}
        val requirements = button(R.string.rec_requirements, R.drawable.ic_arrow_right, iconAtEnd = true) { openOnce(EvidenceActivity::class.java) }
        save.setOnClickListener { view ->
            if (!saved.add(rec.name)) saved.remove(rec.name)
            (view as MaterialButton).text = str(if (rec.name in saved) R.string.rec_saved else R.string.rec_save)
        }
        listOf(save, requirements).forEach { it.textSize = 15f; it.iconPadding = dp(6); it.setPadding(dp(4), 0, dp(4), 0) }
        row(save, requirements)
    }
}

/** M / Universiti Contoh A (sample institution profile). */
val universityPage = FeaturePage(
    eyebrow = R.string.university_eyebrow,
    title = R.string.university_title,
    intro = R.string.university_intro,
    illustration = R.drawable.world_campus,
    activeTab = Tab.EXPLORE,
    details = listOf(
        Detail(R.string.university_programs_title, R.string.university_programs_body),
        Detail(R.string.university_info_title, R.string.university_info_body),
    ),
    actions = listOf(
        PageAction(R.string.university_programs, R.drawable.ic_arrow_right, Go.To(ProgramDetailActivity::class.java), iconAtEnd = true),
        PageAction(R.string.university_back, R.drawable.ic_arrow_right, Go.To(ExploreActivity::class.java), iconAtEnd = true),
    ),
)

/** M / Semak bukti sebelum membuat keputusan (sources behind a programme's requirements). */
val evidencePage = FeaturePage(
    eyebrow = R.string.evidence_eyebrow,
    title = R.string.evidence_title,
    intro = R.string.evidence_intro,
    illustration = R.drawable.world_documents,
    activeTab = Tab.EXPLORE,
    details = listOf(
        Detail(R.string.evidence_status_title, R.string.evidence_status_body),
        Detail(R.string.evidence_when_title, R.string.evidence_when_body),
    ),
    actions = listOf(
        PageAction(R.string.evidence_back, R.drawable.ic_arrow_right, Go.To(ProgramDetailActivity::class.java), iconAtEnd = true),
        PageAction(R.string.evidence_explore, R.drawable.ic_action_compass, Go.To(ExploreActivity::class.java)),
    ),
)

class UniversityActivity : FeaturePageActivity(universityPage)
class EvidenceActivity : FeaturePageActivity(evidencePage)
