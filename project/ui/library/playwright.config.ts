import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./browser",
  use: {
    baseURL: "http://127.0.0.1:7344",
    viewport: { width: 1600, height: 1100 },
  },
  webServer: {
    command: "npm run library -- --port 7344",
    cwd: new URL("../..", import.meta.url).pathname,
    url: "http://127.0.0.1:7344",
    reuseExistingServer: !process.env.CI,
  },
});
