import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { cobaltDashboard } from "@cobalt-code/dashboard/vite";
export default defineConfig(({ command }) => ({
  plugins: [react(), cobaltDashboard()],
  define:
    command === "build"
      ? { "process.env.NODE_ENV": JSON.stringify("production") }
      : {},
  build: {
    lib: {
      entry: "src/main.tsx",
      name: "CobaltDashboardApp",
      formats: ["iife"],
      fileName: () => "dashboard.js",
      cssFileName: "dashboard",
    },
    cssCodeSplit: false,
    assetsInlineLimit: Number.MAX_SAFE_INTEGER,
    sourcemap: false,
  },
}));
