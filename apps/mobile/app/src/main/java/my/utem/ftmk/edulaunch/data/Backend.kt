package my.utem.ftmk.edulaunch.data

import io.github.jan.supabase.SupabaseClient
import io.github.jan.supabase.auth.Auth
import io.github.jan.supabase.auth.auth
import io.github.jan.supabase.createSupabaseClient
import io.ktor.client.HttpClient
import io.ktor.client.engine.okhttp.OkHttp
import my.utem.ftmk.edulaunch.BuildConfig

/**
 * The two ways the app talks to EduLaunch, like the website:
 * Supabase Auth for accounts and the session, and the gateway (/api/...) for everything else.
 * The addresses come from app/build.gradle.kts (local.properties can override them).
 */
object Backend {
    /** Keeps the session on the phone and refreshes it before it expires. */
    val supabase: SupabaseClient by lazy {
        createSupabaseClient(BuildConfig.SUPABASE_URL, BuildConfig.SUPABASE_KEY) {
            install(Auth)
        }
    }

    val auth: Auth get() = supabase.auth

    /** Calls to the gateway, signed with the student's access token (see ProfileApi). */
    val http: HttpClient by lazy { HttpClient(OkHttp) }
}
