import {
  cp,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const project = join(root, "project");
const require = createRequire(join(project, "package.json"));
const { chromium } = require("@playwright/test");
const { createServer } = await import(require.resolve("vite"));
const catalog = JSON.parse(await readFile(join(root, "catalog.json"), "utf8"));
const temporary = await mkdtemp(join(tmpdir(), "cobalt-template-previews-"));
const browser = await chromium.launch();
const excluded = new Set([
  "node_modules",
  "dist",
  ".library-dist",
  "test-results",
  "playwright-report",
  ".cobalt",
]);
await mkdir(join(root, "previews"), { recursive: true });
try {
  for (const template of catalog) {
    const destination = join(temporary, template.key);
    await cp(project, destination, {
      recursive: true,
      filter: (path) =>
        !path.split("/").some((segment) => excluded.has(segment)),
    });
    await cp(join(root, "templates", template.key), destination, {
      recursive: true,
    });
    await symlink(
      join(project, "node_modules"),
      join(destination, "node_modules"),
      "dir",
    );
    const server = await createServer({
      root: destination,
      configFile: join(destination, "vite.config.ts"),
      server: { host: "127.0.0.1", port: 0 },
      logLevel: "error",
    });
    try {
      await server.listen();
      const address = server.httpServer.address();
      const page = await browser.newPage({
        viewport: { width: 1280, height: 800 },
        deviceScaleFactor: 1,
        reducedMotion: "reduce",
        timezoneId: "UTC",
        locale: "en-US",
      });
      const errors = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await page.clock.setFixedTime(new Date("2026-09-18T10:00:00Z"));
      await page.goto(`http://127.0.0.1:${address.port}/?demo=1`, {
        waitUntil: "networkidle",
      });
      await page.locator("main.dashboard h1").waitFor();
      await page.locator("main.dashboard .panel").first().waitFor();
      await page.evaluate(() => document.fonts.ready);
      // Recharts finishes its initial JavaScript animation before capture.
      await page.waitForTimeout(1800);
      const preview = {};
      for (const theme of ["dark", "light"]) {
        await page.evaluate((theme) => {
          document.documentElement.dataset.colorScheme = theme;
          window.scrollTo(0, 0);
        }, theme);
        preview[theme] = `previews/${template.key}-${theme}.png`;
        await page.screenshot({
          path: join(root, preview[theme]),
          animations: "disabled",
        });
      }
      await page.close();
      if (errors.length)
        throw new Error(`${template.key}: ${errors.join("\n")}`);
      template.preview = preview;
      console.log(`Captured ${template.key} (dark and light)`);
    } finally {
      await server.close();
    }
  }
  await writeFile(
    join(root, "catalog.json"),
    JSON.stringify(catalog, null, 2) + "\n",
  );
} finally {
  await browser.close();
  await rm(temporary, { recursive: true, force: true });
}
