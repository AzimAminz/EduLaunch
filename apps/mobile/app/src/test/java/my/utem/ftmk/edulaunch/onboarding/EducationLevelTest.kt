package my.utem.ftmk.edulaunch.onboarding

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class EducationLevelTest {
    @Test
    fun `a level must be chosen`() {
        assertEquals(LevelProblem.LEVEL_REQUIRED, checkLevelChoice(null, null, null))
    }

    @Test
    fun `form levels need one of their own forms`() {
        assertEquals(LevelProblem.FORM_REQUIRED, checkLevelChoice(EducationLevel.FORM1_3, null, null))
        assertEquals(LevelProblem.FORM_REQUIRED, checkLevelChoice(EducationLevel.FORM1_3, 4, null))
        assertNull(checkLevelChoice(EducationLevel.FORM1_3, 3, null))
        assertEquals(LevelProblem.FORM_REQUIRED, checkLevelChoice(EducationLevel.FORM4_5, 3, null))
        assertNull(checkLevelChoice(EducationLevel.FORM4_5, 5, null))
    }

    @Test
    fun `after SPM needs nothing more`() {
        assertNull(checkLevelChoice(EducationLevel.AFTER_SPM, null, null))
    }

    @Test
    fun `levels after SPM need a qualification of their own stage`() {
        assertEquals(LevelProblem.QUALIFICATION_REQUIRED, checkLevelChoice(EducationLevel.AFTER_CERTIFICATE, null, null))
        assertEquals(LevelProblem.QUALIFICATION_REQUIRED, checkLevelChoice(EducationLevel.AFTER_CERTIFICATE, null, Qualification.STPM))
        assertNull(checkLevelChoice(EducationLevel.AFTER_CERTIFICATE, null, Qualification.SVM))
        assertEquals(LevelProblem.QUALIFICATION_REQUIRED, checkLevelChoice(EducationLevel.AFTER_PREU, null, Qualification.SKM))
        assertNull(checkLevelChoice(EducationLevel.AFTER_PREU, null, Qualification.DKM))
    }

    @Test
    fun `values match what the profile service accepts`() {
        assertEquals(listOf("form1_3", "form4_5", "after_spm", "after_certificate", "after_preu"), EducationLevel.entries.map { it.apiValue })
        assertEquals(
            listOf("certificate", "svm", "skm", "stpm", "matriculation", "foundation", "a_level", "diploma", "dvm", "dkm"),
            Qualification.entries.map { it.apiValue },
        )
    }
}
