import java.util.Properties

plugins {
    alias(libs.plugins.android.application)
}

/*
 * Where the app finds EduLaunch. The defaults reach the backend running on this computer from the Android
 * emulator (10.0.2.2 is the computer). On a real phone, set the computer's network address in local.properties:
 *   edulaunch.supabaseUrl=http://192.168.1.10:54321
 *   edulaunch.gatewayUrl=http://192.168.1.10:4000
 *   edulaunch.webUrl=http://192.168.1.10:3000
 * The Supabase publishable key is public (the website sends it to every browser); it is read from the web
 * app's settings (apps/web/.env.local, made by `pnpm env:setup`) unless edulaunch.supabaseKey is set.
 */
val localSettings = Properties().apply {
    providers.fileContents(rootProject.layout.projectDirectory.file("local.properties")).asText.orNull?.let { load(it.reader()) }
}
val webEnv = providers.fileContents(rootProject.layout.projectDirectory.file("../web/.env.local")).asText.orNull.orEmpty()
fun webEnvValue(name: String): String? =
    webEnv.lineSequence().map { it.trim() }.firstOrNull { it.startsWith("$name=") }?.substringAfter("=")?.trim()?.trim('"')
fun setting(key: String, fallback: String): String = localSettings.getProperty("edulaunch.$key") ?: fallback
fun quoted(value: String) = "\"" + value.replace("\\", "\\\\").replace("\"", "\\\"") + "\""

android {
    namespace = "my.utem.ftmk.edulaunch"
    compileSdk {
        version = release(37)
    }

    defaultConfig {
        applicationId = "my.utem.ftmk.edulaunch"
        minSdk = 24
        targetSdk = 37
        versionCode = 1
        versionName = "1.0"

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"

        buildConfigField("String", "SUPABASE_URL", quoted(setting("supabaseUrl", "http://10.0.2.2:54321")))
        buildConfigField("String", "SUPABASE_KEY", quoted(setting("supabaseKey", webEnvValue("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY").orEmpty())))
        buildConfigField("String", "GATEWAY_URL", quoted(setting("gatewayUrl", "http://10.0.2.2:4000")))
        // E-mail links (password recovery) open the website, which has the "new password" page.
        buildConfigField("String", "WEB_URL", quoted(setting("webUrl", "http://127.0.0.1:3000")))
    }

    buildFeatures {
        buildConfig = true
    }

    // Grants the app's permissions when Android Studio installs it, so the debug build can reach the backend on
    // this computer without a prompt (Android 17 asks before an app uses the local network; src/debug/AndroidManifest.xml).
    installation {
        installOptions += "-g"
    }

    buildTypes {
        release {
            optimization {
                enable = false
            }
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_11
        targetCompatibility = JavaVersion.VERSION_11
    }
}

dependencies {
    implementation(libs.androidx.activity.ktx)
    implementation(libs.androidx.appcompat)
    implementation(libs.androidx.constraintlayout)
    implementation(libs.androidx.core.ktx)
    implementation(libs.material)
    implementation(libs.supabase.auth)
    implementation(libs.ktor.client.okhttp)
    testImplementation(libs.junit)
    androidTestImplementation(libs.androidx.espresso.core)
    androidTestImplementation(libs.androidx.junit)
}
