import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.cedricdelabi.tourneo",
  appName: "Tourneo",
  webDir: "public",

  server: {
    url: "https://tourneo-app.vercel.app",
    cleartext: false,
  },
};

export default config;