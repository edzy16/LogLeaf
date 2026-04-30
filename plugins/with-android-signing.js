const { withAppBuildGradle } = require('@expo/config-plugins');

// Empty-string fallbacks (`?: ''`) keep Gradle's configure phase safe when these
// env vars are absent (e.g., local `expo run:android` debug builds, where Gradle
// still evaluates all signingConfigs). The CI workflow validates these secrets
// in a prior decode step before invoking Gradle, so release builds never reach
// the signer with empty creds in practice; missing creds at signing time would
// fail loudly with a KeystoreException.
const RELEASE_SIGNING_BLOCK = `        release {
            storeFile file('release.keystore')
            storePassword = (System.getenv('ANDROID_KEYSTORE_PASSWORD') ?: '').trim()
            keyAlias = (System.getenv('ANDROID_KEY_ALIAS') ?: '').trim()
            keyPassword = (System.getenv('ANDROID_KEY_PASSWORD') ?: '').trim()
        }
`;

function injectReleaseSigning(contents) {
  if (contents.includes("storeFile file('release.keystore')")) {
    return contents;
  }

  const debugBlockEnd = /(signingConfigs\s*\{\s*debug\s*\{[^{}]*\}\s*\n)/;
  if (!debugBlockEnd.test(contents)) {
    throw new Error(
      "with-android-signing: could not locate signingConfigs.debug block in app/build.gradle. The Expo template may have changed — update the regex in plugins/with-android-signing.js."
    );
  }
  contents = contents.replace(debugBlockEnd, `$1${RELEASE_SIGNING_BLOCK}`);

  const releaseBuildType = /(buildTypes\s*\{[\s\S]*?release\s*\{[^{}]*?)signingConfig signingConfigs\.debug/;
  if (!releaseBuildType.test(contents)) {
    throw new Error(
      "with-android-signing: could not locate release buildType signingConfig assignment. The Expo template may have changed — update the regex in plugins/with-android-signing.js."
    );
  }
  contents = contents.replace(releaseBuildType, '$1signingConfig signingConfigs.release');

  return contents;
}

const withAndroidSigning = (config) => {
  return withAppBuildGradle(config, (cfg) => {
    cfg.modResults.contents = injectReleaseSigning(cfg.modResults.contents);
    return cfg;
  });
};

module.exports = withAndroidSigning;
