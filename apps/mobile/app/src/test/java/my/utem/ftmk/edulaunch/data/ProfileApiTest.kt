package my.utem.ftmk.edulaunch.data

import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.buildJsonObject
import my.utem.ftmk.edulaunch.onboarding.EducationLevel
import my.utem.ftmk.edulaunch.onboarding.LevelChoice
import my.utem.ftmk.edulaunch.onboarding.Qualification
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class ProfileApiTest {
    @Test
    fun `reads the education level from GET me`() {
        val me = parseMe("""{"studentId":"8f0c2a4e-0000-4000-8000-000000000001","educationLevel":"form4_5","formYear":5,"higherQualification":null}""")
        assertEquals("form4_5", me.educationLevel)
    }

    @Test
    fun `a new student has no level yet`() {
        assertNull(parseMe("""{"studentId":"8f0c2a4e-0000-4000-8000-000000000001","educationLevel":null,"formYear":null}""").educationLevel)
    }

    @Test
    fun `the level body matches what the profile service expects`() {
        assertEquals(
            buildJsonObject {
                put("level", JsonPrimitive("form1_3"))
                put("formYear", JsonPrimitive(2))
                put("higherQualification", JsonNull)
            },
            LevelChoice(EducationLevel.FORM1_3, 2, null).toJson(),
        )
        assertEquals(
            Json.parseToJsonElement("""{"level":"after_preu","formYear":null,"higherQualification":"dvm"}"""),
            LevelChoice(EducationLevel.AFTER_PREU, null, Qualification.DVM).toJson(),
        )
    }
}
