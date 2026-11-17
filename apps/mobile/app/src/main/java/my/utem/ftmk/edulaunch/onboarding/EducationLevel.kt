package my.utem.ftmk.edulaunch.onboarding

import androidx.annotation.StringRes
import my.utem.ftmk.edulaunch.R

/**
 * A qualification after SPM. [apiValue] is what the profile service stores
 * (packages/contracts/src/grade-scales.ts, HigherQualifications).
 */
enum class Qualification(val apiValue: String, @get:StringRes val label: Int) {
    CERTIFICATE("certificate", R.string.qualification_certificate),
    SVM("svm", R.string.qualification_svm),
    SKM("skm", R.string.qualification_skm),
    STPM("stpm", R.string.qualification_stpm),
    MATRICULATION("matriculation", R.string.qualification_matriculation),
    FOUNDATION("foundation", R.string.qualification_foundation),
    A_LEVEL("a_level", R.string.qualification_a_level),
    DIPLOMA("diploma", R.string.qualification_diploma),
    DVM("dvm", R.string.qualification_dvm),
    DKM("dkm", R.string.qualification_dkm),
}

/**
 * The five education levels, in the order of the onboarding cards (apps/web/lib/profile/levels.ts).
 * Form 1–3 and Form 4–5 also ask which form; the two levels after SPM ask which qualification.
 */
enum class EducationLevel(
    val apiValue: String,
    @get:StringRes val title: Int,
    @get:StringRes val body: Int,
    val forms: List<Int> = emptyList(),
    val qualifications: List<Qualification> = emptyList(),
) {
    FORM1_3("form1_3", R.string.level_form1_3_title, R.string.level_form1_3_body, forms = listOf(1, 2, 3)),
    FORM4_5("form4_5", R.string.level_form4_5_title, R.string.level_form4_5_body, forms = listOf(4, 5)),
    AFTER_SPM("after_spm", R.string.level_after_spm_title, R.string.level_after_spm_body),
    AFTER_CERTIFICATE(
        "after_certificate", R.string.level_after_certificate_title, R.string.level_after_certificate_body,
        qualifications = listOf(Qualification.CERTIFICATE, Qualification.SVM, Qualification.SKM),
    ),
    AFTER_PREU(
        "after_preu", R.string.level_after_preu_title, R.string.level_after_preu_body,
        qualifications = listOf(
            Qualification.STPM, Qualification.MATRICULATION, Qualification.FOUNDATION, Qualification.A_LEVEL,
            Qualification.DIPLOMA, Qualification.DVM, Qualification.DKM,
        ),
    ),
    ;

    val asksForm: Boolean get() = forms.isNotEmpty()
    val asksQualification: Boolean get() = qualifications.isNotEmpty()
}

/** What the student picked; sent as-is to PATCH /api/profile/me/education-level in Stage B. */
data class LevelChoice(val level: EducationLevel, val formYear: Int?, val qualification: Qualification?)

enum class LevelProblem { LEVEL_REQUIRED, FORM_REQUIRED, QUALIFICATION_REQUIRED }

/** The same rules as the web's parseLevelChoice; the profile service checks them again. */
fun checkLevelChoice(level: EducationLevel?, formYear: Int?, qualification: Qualification?): LevelProblem? = when {
    level == null -> LevelProblem.LEVEL_REQUIRED
    level.asksForm && formYear !in level.forms -> LevelProblem.FORM_REQUIRED
    level.asksQualification && qualification !in level.qualifications -> LevelProblem.QUALIFICATION_REQUIRED
    else -> null
}
