package my.utem.ftmk.edulaunch.data

import io.ktor.client.request.accept
import io.ktor.client.request.bearerAuth
import io.ktor.client.request.request
import io.ktor.client.request.setBody
import io.ktor.client.statement.bodyAsText
import io.ktor.http.ContentType
import io.ktor.http.HttpMethod
import io.ktor.http.content.TextContent
import io.ktor.http.isSuccess
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.contentOrNull
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import kotlinx.serialization.json.put
import my.utem.ftmk.edulaunch.BuildConfig
import my.utem.ftmk.edulaunch.onboarding.LevelChoice

/** The gateway refused or failed a request ([status] 401 = not signed in, 503 = a service is down). */
class ApiException(val status: Int, path: String) : Exception("Gateway answered $status for $path")

/** The student's profile, as `GET /api/profile/me` returns it (the parts the app uses so far). */
data class Me(val educationLevel: String?)

/** The profile service, through the gateway, as the signed-in student (like apps/web/lib/profile/api.ts). */
object ProfileApi {
    /** Also creates the profile on the first call after sign-up. */
    suspend fun me(): Me = parseMe(call(HttpMethod.Get, "/me"))

    suspend fun setEducationLevel(choice: LevelChoice) {
        call(HttpMethod.Patch, "/me/education-level", choice.toJson())
    }

    private suspend fun call(method: HttpMethod, path: String, body: JsonObject? = null): String {
        val token = Backend.auth.currentAccessTokenOrNull() ?: throw ApiException(401, path)
        val response = Backend.http.request("${BuildConfig.GATEWAY_URL}/api/profile$path") {
            this.method = method
            bearerAuth(token)
            accept(ContentType.Application.Json)
            if (body != null) setBody(TextContent(body.toString(), ContentType.Application.Json))
        }
        if (!response.status.isSuccess()) throw ApiException(response.status.value, path)
        return response.bodyAsText()
    }
}

fun parseMe(json: String): Me =
    Me(educationLevel = Json.parseToJsonElement(json).jsonObject["educationLevel"]?.jsonPrimitive?.contentOrNull)

/** The body of `PATCH /api/profile/me/education-level` (LevelBody in services/profile). */
fun LevelChoice.toJson(): JsonObject = buildJsonObject {
    put("level", level.apiValue)
    put("formYear", formYear)
    put("higherQualification", qualification?.apiValue)
}
