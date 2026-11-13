import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.cedricdelabi.tourneo.v2",
  appName: "Tourneo V2",
  webDir: "public",

  server: {
    url: "https://tourneo-v2-test-tourneo.vercel.app",
    cleartext: false,
  },
};

export default config;