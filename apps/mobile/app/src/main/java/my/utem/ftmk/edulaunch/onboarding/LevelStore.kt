package my.utem.ftmk.edulaunch.onboarding

import android.content.Context
import android.util.Log
import androidx.core.content.edit
import kotlinx.coroutines.CancellationException
import my.utem.ftmk.edulaunch.data.Me
import my.utem.ftmk.edulaunch.data.ProfileApi

/**
 * The student's education level, remembered on this phone so the home and academic screens can show the
 * right version straight away. The profile service is the real record: [fetch] reads it and updates this copy.
 */
object LevelStore {
    private const val FILE = "education_level"
    private const val TAG = "LevelStore"

    fun load(context: Context): LevelChoice? {
        val prefs = context.getSharedPreferences(FILE, Context.MODE_PRIVATE)
        val level = EducationLevel.entries.find { it.apiValue == prefs.getString("level", null) } ?: return null
        return LevelChoice(
            level = level,
            formYear = prefs.getInt("formYear", 0).takeIf { it != 0 },
            qualification = Qualification.entries.find { it.apiValue == prefs.getString("qualification", null) },
        )
    }

    fun save(context: Context, choice: LevelChoice) {
        context.getSharedPreferences(FILE, Context.MODE_PRIVATE).edit {
            putString("level", choice.level.apiValue)
            putInt("formYear", choice.formYear ?: 0)
            putString("qualification", choice.qualification?.apiValue)
        }
    }

    /** Forgets the level when the student signs out, so the next account starts clean. */
    fun clear(context: Context) {
        context.getSharedPreferences(FILE, Context.MODE_PRIVATE).edit { clear() }
    }

    /** Reads the level from the profile service and remembers it; null when it cannot be read or is not set. */
    suspend fun fetch(context: Context): LevelChoice? = try {
        ProfileApi.me().toLevelChoice()?.also { save(context, it) }
    } catch (e: CancellationException) {
        throw e
    } catch (e: Exception) {
        Log.w(TAG, "Could not read the education level", e)
        null
    }
}

/** The level in a profile response; the old "after_diploma" level is read as pre-U with a Diploma, as the service does. */
fun Me.toLevelChoice(): LevelChoice? {
    if (educationLevel == "after_diploma") return LevelChoice(EducationLevel.AFTER_PREU, null, Qualification.DIPLOMA)
    val level = EducationLevel.entries.find { it.apiValue == educationLevel } ?: return null
    return LevelChoice(
        level = level,
        formYear = formYear.takeIf { level.asksForm },
        qualification = Qualification.entries.find { it.apiValue == higherQualification }.takeIf { level.asksQualification },
    )
}

/** The level a qualification belongs to (a Diploma is in "after pre-U", a certificate in "after certificate"). */
val Qualification.level: EducationLevel get() = EducationLevel.entries.first { this in it.qualifications }
