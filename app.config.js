const baseConfig = require("./app.json");

const variant = process.env.APP_VARIANT;
const isDev = variant === "development" || variant === "dev";

const expo = {
  ...baseConfig.expo,
  name: isDev ? "Pit Stop Dev" : baseConfig.expo.name,
  slug: isDev ? "pit-stop-dev" : baseConfig.expo.slug,
  scheme: isDev ? "pitstop-dev" : baseConfig.expo.scheme,
  icon: isDev ? "./assets/appIcons/appstore-dev.png" : baseConfig.expo.icon,
  ios: {
    ...baseConfig.expo.ios,
    bundleIdentifier: isDev ? "com.edzy.pitstop.dev" : "com.edzy.pitstop",
    icon: isDev ? "./assets/appIcons/appstore-dev.png" : baseConfig.expo.ios?.icon,
  },
  android: {
    ...baseConfig.expo.android,
    package: isDev ? "com.edzy.pitstop.dev" : baseConfig.expo.android.package,
    icon: isDev ? "./assets/appIcons/playstore-dev.png" : baseConfig.expo.android.icon,
  },
};

module.exports = { expo };
