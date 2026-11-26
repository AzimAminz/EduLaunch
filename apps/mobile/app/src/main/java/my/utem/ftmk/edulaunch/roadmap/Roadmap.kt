package my.utem.ftmk.edulaunch.roadmap

import android.view.Gravity
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.Toast
import androidx.annotation.StringRes
import my.utem.ftmk.edulaunch.R
import my.utem.ftmk.edulaunch.explore.CompareActivity
import my.utem.ftmk.edulaunch.home.AcademicProfileActivity
import my.utem.ftmk.edulaunch.home.BlockActivity
import my.utem.ftmk.edulaunch.home.Detail
import my.utem.ftmk.edulaunch.home.FeaturePage
import my.utem.ftmk.edulaunch.home.FeaturePageActivity
import my.utem.ftmk.edulaunch.home.Go
import my.utem.ftmk.edulaunch.home.PageAction
import my.utem.ftmk.edulaunch.home.ProfileActivity
import my.utem.ftmk.edulaunch.home.Tab
import my.utem.ftmk.edulaunch.home.showComingSoon
import my.utem.ftmk.edulaunch.onboarding.EducationLevel
import my.utem.ftmk.edulaunch.onboarding.LevelStore
import my.utem.ftmk.edulaunch.onboarding.Qualification
import my.utem.ftmk.edulaunch.system.RequestFailedActivity
import my.utem.ftmk.edulaunch.ui.Blocks
import my.utem.ftmk.edulaunch.ui.ButtonStyle
import my.utem.ftmk.edulaunch.ui.ChipSpec
import my.utem.ftmk.edulaunch.ui.Tone
import my.utem.ftmk.edulaunch.ui.openOnce

// Figma section "7 · Roadmap". The Roadmap tab shows the version for the student's level:
// Form 1–3 choose a stream, Diploma holders choose work or a degree, everyone else picks a study branch.

/** M10 / Roadmap (and its STPM / Asasi / Diploma branches), M / Roadmap · Tingkatan 1–3, M / Roadmap · Lepasan Diploma. */
class RoadmapActivity : BlockActivity(Tab.ROADMAP) {
    private var branch = R.string.level_diploma
    private var stream = 0
    private var diplomaPath = 1

    override fun Blocks.build() {
        val level = LevelStore.load(activity)
        when {
            level?.level == EducationLevel.FORM1_3 -> { gap = 16; streams(level.formYear ?: 3) }
            level?.qualification in setOf(Qualification.DIPLOMA, Qualification.DVM, Qualification.DKM) -> { gap = 16; afterDiploma() }
            else -> branches()
        }
    }

    override fun onResume() {
        super.onResume()
        rebuild() // the level may have changed in the academic profile
    }

    private fun saved(@StringRes message: Int) = Toast.makeText(this, message, Toast.LENGTH_SHORT).show()

    /** M10 / Roadmap with the STPM, Asasi or Diploma branch. */
    private fun Blocks.branches() {
        eyebrow(R.string.road_eyebrow)
        title(R.string.road_title)
        intro(R.string.road_intro)
        infoCard(str(R.string.road_now_title), str(R.string.road_now_body), Tone.YELLOW)
        text(str(R.string.road_choose_branch), 15f, R.font.outfit_semibold)
        val choices = listOf(R.string.qualification_stpm, R.string.level_foundation, R.string.level_diploma).map { option ->
            button(str(option), R.drawable.ic_arrow_right, iconAtEnd = true, style = ButtonStyle.PLAIN, radius = 16) { branch = option; rebuild() }.apply {
                setPadding(dp(6), 0, dp(6), 0)
                iconPadding = dp(4)
                if (option == branch) { strokeWidth = dp(2); setStrokeColorResource(R.color.navy) }
                isSelected = option == branch
            }
        }
        row(*choices.toTypedArray())
        pathMap(listOf(
            Blocks.Step(str(R.string.road_step_branch, str(branch)), str(R.string.road_step_branch_body), Tone.BLUE),
            Blocks.Step(str(R.string.road_step_degree), str(R.string.road_step_degree_body), Tone.MINT),
            Blocks.Step(str(R.string.road_step_industry), str(R.string.road_step_industry_body), Tone.BLUE),
        ))
        card(Tone.NAVY) {
            text(str(R.string.road_careers), 19f, R.font.outfit_semibold, R.color.white)
            text(str(R.string.road_careers_list), 14f, color = R.color.white)
        }
        button(R.string.road_save_path, R.drawable.ic_action_bookmark, radius = 16) { saved(R.string.road_saved); openOnce(RoadmapSavedActivity::class.java) }
        button(R.string.road_generate, R.drawable.ic_action_pencil, radius = 16, top = 32) { openOnce(BuildRoadmapActivity::class.java) }
        button(R.string.road_versions, R.drawable.ic_arrow_right, iconAtEnd = true, style = ButtonStyle.PLAIN, radius = 16, top = 14) {
            openOnce(RoadmapVersionsActivity::class.java)
        }
        button(R.string.road_save_branch, R.drawable.ic_action_bookmark, style = ButtonStyle.PLAIN, radius = 16, top = 14) {
            saved(R.string.road_saved); openOnce(RoadmapSavedActivity::class.java)
        }
    }

    /** M / Roadmap · Tingkatan 1–3 · pilih aliran. */
    private fun Blocks.streams(form: Int) {
        eyebrow(R.string.stream_eyebrow, 11f).text = str(R.string.stream_eyebrow, form)
        title(R.string.stream_title, 26f, top = 4)
        intro(R.string.stream_intro, 14f, top = 4)
        card(Tone.MINT_SOFT, radius = 18, padding = 16, innerGap = 10, stroke = Tone.MINT_LINE) {
            val score = textView("86/100", 14f, R.font.outfit_bold)
            val best = chip(ChipSpec(str(R.string.stream_best), Tone.YELLOW, semibold = true, sizeSp = 11f, padH = 8, padV = 3))
            add(LinearLayout(activity).apply {
                gravity = Gravity.CENTER_VERTICAL
                addView(best)
                addView(android.view.View(activity), LinearLayout.LayoutParams(0, 1, 1f))
                addView(score)
            }, 0)
            text(str(R.string.stream_pure_science), 20f, R.font.outfit_semibold)
            listOf(R.string.stream_reason_grades, R.string.stream_reason_interest).forEach { reason ->
                inline(ImageView(activity).apply {
                    setImageResource(R.drawable.ic_check_circle)
                    layoutParams = LinearLayout.LayoutParams(dp(14), dp(14))
                    importantForAccessibility = android.view.View.IMPORTANT_FOR_ACCESSIBILITY_NO
                }, textView(str(reason), 13f))
            }
            text(str(R.string.stream_subjects), 12f, color = R.color.muted)
        }
        val options = listOf(
            Triple(R.string.stream_pure_science, R.string.stream_science_study, R.string.stream_science_jobs),
            Triple(R.string.stream_stem_technical, R.string.stream_stem_study, R.string.stream_stem_jobs),
            Triple(R.string.stream_social_arts, R.string.stream_social_study, R.string.stream_social_jobs),
            Triple(R.string.stream_vocational, R.string.stream_vocational_study, R.string.stream_vocational_jobs),
        )
        card(radius = 18, padding = 16, innerGap = 10) {
            text(str(R.string.stream_chart), 16f, R.font.outfit_semibold)
            flowChart(str(R.string.flow_now), str(R.string.academic_form_n, form), options.mapIndexed { i, (name, study, jobs) ->
                Blocks.FlowOption(
                    str(name), str(study), str(jobs),
                    tag = when { i == stream && i == 0 -> str(R.string.flow_suggested); i == stream -> str(R.string.flow_chosen); else -> null },
                    chosen = i == stream,
                ) { stream = i; rebuild() }
            })
        }
        button(R.string.stream_save, R.drawable.ic_action_bookmark, radius = 14) { saved(R.string.stream_saved) }
        button(R.string.stream_other, R.drawable.ic_action_compass, style = ButtonStyle.OUTLINED, radius = 14) { openOnce(CompareActivity::class.java) }
        text(str(R.string.stream_note), 12f, color = R.color.muted)
    }

    /** M / Roadmap · Lepasan Diploma · kerja atau sambung. */
    private fun Blocks.afterDiploma() {
        eyebrow(R.string.dip_eyebrow, 11f)
        title(R.string.dip_title, 26f, top = 4)
        intro(R.string.dip_intro, 14f, top = 4)
        segmented(listOf(str(R.string.dip_work), str(R.string.dip_degree), str(R.string.dip_both)), diplomaPath) { diplomaPath = it; rebuild() }
        careers(R.string.dip_work_now, R.string.dip_accepted, Tone.MINT_CHIP, R.color.green, 4, listOf(
            R.string.dip_job_web to R.string.dip_interest_high, R.string.dip_job_support to R.string.dip_interest_high,
        ))
        careers(R.string.dip_with_degree, R.string.dip_needs_degree, Tone.BLUE, R.color.link, 3, listOf(
            R.string.dip_job_engineer to R.string.dip_job_engineer_body, R.string.dip_job_data to R.string.dip_job_data_body,
        ))
        val paths = listOf(
            Triple(R.string.dip_a, R.string.dip_job_web, R.string.dip_a_next),
            Triple(R.string.dip_b, R.string.dip_b_study, R.string.dip_b_jobs),
            Triple(R.string.dip_c, R.string.dip_c_study, R.string.dip_c_jobs),
        )
        card(radius = 18, padding = 16, innerGap = 10) {
            text(str(R.string.dip_chart), 16f, R.font.outfit_semibold)
            flowChart(str(R.string.flow_now), str(R.string.dip_now), paths.mapIndexed { i, (name, study, jobs) ->
                Blocks.FlowOption(str(name), str(study), str(jobs), tag = str(R.string.flow_chosen).takeIf { i == diplomaPath }, chosen = i == diplomaPath) {
                    diplomaPath = i; rebuild()
                }
            })
        }
        button(R.string.road_save_path, R.drawable.ic_action_bookmark, radius = 14) { saved(R.string.road_saved) }
        text(str(R.string.dip_note), 12f, color = R.color.muted)
    }

    /** A white card of careers: a heading with a chip, rows that open a career, and "Lihat N kerjaya →". */
    private fun Blocks.careers(@StringRes title: Int, @StringRes chipText: Int, chipTone: Tone, chipColor: Int, count: Int, jobs: List<Pair<Int, Int>>) =
        card(radius = 18, padding = 16, innerGap = 0) {
            inline(
                textView(str(title), 16f, R.font.outfit_semibold),
                chip(ChipSpec(str(chipText), chipTone, semibold = true, sizeSp = 11f, padH = 8, padV = 3, textColor = chipColor)),
                top = 0,
            )
            jobs.forEach { (job, note) ->
                val row = LinearLayout(activity).apply {
                    gravity = Gravity.CENTER_VERTICAL
                    setPadding(0, dp(10), 0, dp(10))
                    val texts = LinearLayout(activity).apply { orientation = LinearLayout.VERTICAL }
                    texts.addView(textView(str(job), 15f, R.font.outfit_semibold))
                    texts.addView(textView(str(note), 12f, color = R.color.muted))
                    addView(texts, LinearLayout.LayoutParams(0, -2, 1f))
                    addView(ImageView(activity).apply {
                        setImageResource(R.drawable.ic_arrow_right)
                        importantForAccessibility = android.view.View.IMPORTANT_FOR_ACCESSIBILITY_NO
                    }, LinearLayout.LayoutParams(dp(16), dp(16)))
                }
                clickable(row) { activity.showComingSoon(str(R.string.career_details)) }
                add(row, 0)
            }
            text(str(R.string.dip_see_careers, count), 14f, R.font.outfit_semibold, R.color.link, top = 0).also { link ->
                link.minHeight = dp(40)
                link.gravity = Gravity.CENTER_VERTICAL
                clickable(link) { activity.showComingSoon(str(R.string.career_details)) }
            }
        }
}

/** M / Bina laluan mengikut diri anda: what the plan is built from. */
class BuildRoadmapActivity : BlockActivity(Tab.ROADMAP) {
    override fun Blocks.build() {
        eyebrow(R.string.build_eyebrow)
        title(R.string.build_title)
        intro(R.string.build_intro, 16f)
        illustration(R.drawable.world_pathways)
        textField(R.string.build_goal, "", hint = str(R.string.build_goal_hint))
        dropdown(R.string.build_record, listOf(R.string.build_record_target, R.string.build_record_spm, R.string.build_record_preu).map(::str), 0)
        dropdown(R.string.build_priority, listOf(R.string.build_priority_all, R.string.build_priority_cost, R.string.build_priority_near, R.string.build_priority_short).map(::str), 0)
        card(radius = 14, innerGap = 10) {
            text(str(R.string.build_inputs_title), 19f, R.font.outfit_semibold)
            intro(R.string.build_inputs_body, 15f)
        }
        button(R.string.build_generate, R.drawable.ic_tab_route) { openOnce(GeneratingRoadmapActivity::class.java) }
        button(R.string.build_complete_academic, R.drawable.ic_action_document, style = ButtonStyle.OUTLINED) { openOnce(AcademicProfileActivity::class.java) }
    }
}

/** M / Menyusun pilihan anda (the plan being generated). */
val generatingPage = FeaturePage(
    eyebrow = R.string.gen_eyebrow, title = R.string.gen_title, intro = R.string.gen_intro,
    illustration = R.drawable.rimau_laptop, activeTab = Tab.ROADMAP,
    details = listOf(
        Detail(R.string.gen_match_title, R.string.gen_match_body),
        Detail(R.string.gen_check_title, R.string.gen_check_body),
        Detail(R.string.gen_save_title, R.string.gen_save_body),
    ),
    actions = listOf(
        PageAction(R.string.gen_see_plan, R.drawable.ic_arrow_right, Go.To(RoadmapVersionsActivity::class.java), iconAtEnd = true),
        PageAction(R.string.gen_see_failed, R.drawable.ic_arrow_right, Go.To(RequestFailedActivity::class.java), iconAtEnd = true),
    ),
)

/** M / Semak perubahan sebelum aktifkan (a new roadmap version next to the active one). */
val versionsPage = FeaturePage(
    eyebrow = R.string.ver_eyebrow, title = R.string.ver_title, intro = R.string.ver_intro,
    illustration = R.drawable.world_pathways, activeTab = Tab.ROADMAP,
    details = listOf(
        Detail(R.string.ver_v1_title, R.string.ver_v1_body),
        Detail(R.string.ver_v2_title, R.string.ver_v2_body),
        Detail(R.string.ver_kept_title, R.string.ver_kept_body),
    ),
    actions = listOf(
        PageAction(R.string.ver_activate, R.drawable.ic_arrow_right, Go.To(RoadmapSavedActivity::class.java), iconAtEnd = true),
        PageAction(R.string.ver_keep, R.drawable.ic_arrow_right, Go.To(RoadmapActivity::class.java), iconAtEnd = true),
    ),
)

/** M / Pelan dan kemajuan disimpan. */
val roadmapSavedPage = FeaturePage(
    eyebrow = R.string.saved_plan_eyebrow, title = R.string.saved_plan_title, intro = R.string.saved_plan_intro,
    illustration = R.drawable.rimau_phone_laptop, activeTab = Tab.ROADMAP,
    details = listOf(
        Detail(R.string.saved_plan_branch_title, R.string.saved_plan_branch_body),
        Detail(R.string.saved_plan_week_title, R.string.saved_plan_week_body),
    ),
    actions = listOf(
        PageAction(R.string.saved_plan_open, R.drawable.ic_arrow_right, Go.To(RoadmapActivity::class.java), iconAtEnd = true),
        PageAction(R.string.saved_plan_profile, R.drawable.ic_arrow_right, Go.To(ProfileActivity::class.java), iconAtEnd = true),
    ),
)

class GeneratingRoadmapActivity : FeaturePageActivity(generatingPage)
class RoadmapVersionsActivity : FeaturePageActivity(versionsPage)
class RoadmapSavedActivity : FeaturePageActivity(roadmapSavedPage)
