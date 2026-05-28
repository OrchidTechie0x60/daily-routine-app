import type { CapacitorConfig } from "@capacitor/cli"

const config: CapacitorConfig = {
  appId: "com.dailyroutine.app",
  appName: "Daily Routine",
  webDir: "out",
  server: {
    androidScheme: "https",
  },
  plugins: {
    LocalNotifications: {
      smallIcon: "ic_stat_notify",
      iconColor: "#0a0a0a",
      sound: "default",
    },
  },
  android: {
    buildOptions: {
      keystorePath: undefined,
      releaseType: "APK",
    },
  },
}

export default config
