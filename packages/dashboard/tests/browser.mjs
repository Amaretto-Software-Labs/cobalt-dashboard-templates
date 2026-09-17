import assert from "node:assert/strict";
import { createServer } from "node:http";
import { mkdtemp, mkdir, cp, writeFile, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync, spawn } from "node:child_process";
import { chromium } from "@playwright/test";

const packageRoot = fileURLToPath(new URL("..", import.meta.url));
const temporary = await mkdtemp(join(tmpdir(), "cobalt-sdk-browser-"));
const project = join(temporary, "project");
const children = [];
let browser;
let syncs = 0;
let script;
// The browser test isolates the SDK's transport. PostgreSQL tests exercise the real dataset engine.
const backend = createServer(async (request, response) => {
  response.setHeader("Content-Type", "application/json");
  if (request.headers.authorization !== "Bearer server-only-test-credential") { response.writeHead(401).end("{}"); return; }
  let text = ""; for await (const chunk of request) text += chunk;
  if (request.url === "/draft") {
    const body = JSON.parse(text); syncs++;
    assert.equal(body.files["datasets.json"].includes("scriptFile"), true);
    script = body.files["datasets/main.js"];
    response.end("{}"); return;
  }
  if (request.url === "/datasets/main/runs") {
    response.end(JSON.stringify({ status: "completed", result: { count: Number(script.match(/count: (\d+)/)[1]) } })); return;
  }
  response.writeHead(404).end("{}");
});
async function start(command, args) {
  const child = spawn(command, args, { cwd: project, stdio: ["ignore", "pipe", "pipe"] });
  children.push(child);
  let output = "";
  child.stdout.on("data", data => { output += data; }); child.stderr.on("data", data => { output += data; });
  for (let attempt = 0; attempt < 100; attempt++) {
    const match = output.match(/http:\/\/127\.0\.0\.1:(\d+)/);
    if (match) return match[0];
    if (child.exitCode !== null) throw new Error(output);
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  throw new Error("Preview did not start: " + output);
}
try {
  await cp(new URL("../../../project", import.meta.url), project, {
    recursive: true, filter: path => !path.split("/").some(part => ["node_modules", "dist", ".cobalt"].includes(part)),
  });
  const [{ filename }] = JSON.parse(execFileSync("npm", ["pack", "--json", "--pack-destination", temporary], { cwd: packageRoot, encoding: "utf8" }));
  execFileSync("npm", ["install", "--ignore-scripts", "--save-exact", join(temporary, filename)], { cwd: project, stdio: "inherit" });
  await mkdir(join(project, ".cobalt"));
  await new Promise(resolve => backend.listen(0, "127.0.0.1", resolve));
  await writeFile(join(project, ".cobalt/connection.json"), JSON.stringify({ url: `http://127.0.0.1:${backend.address().port}/`, token: "server-only-test-credential" }));
  await writeFile(join(project, "src/App.tsx"), `import { useDataset } from '@cobalt-code/dashboard';
export default function App(){const {data,error}=useDataset<{count:number}>();return error?<p role="alert">{error}</p>:<p>Count: {data?.count??'loading'}</p>}`);
  const datasetPath = join(project, "datasets/main.js");
  await writeFile(datasetPath, "function main(){return {count: 1};}");
  const vite = join(project, "node_modules/vite/bin/vite.js");
  const devUrl = await start(process.execPath, [vite, "--host", "127.0.0.1", "--port", "0"]);
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("console", message => { if (message.type() === "error") console.error("Browser:", message.text()); });
  page.on("request", request => assert.equal(request.headers().authorization, undefined, "Credential leaked to browser"));
  await page.goto(devUrl);
  await page.getByText("Count: 1", { exact: true }).waitFor().catch(async error => {
    console.error("Page errors:", errors, "Rendered page:", await page.locator("body").innerText()); throw error;
  });
  await writeFile(datasetPath, "function main(){return {count: 2};}");
  await page.getByText("Count: 2", { exact: true }).waitFor();
  const definitions = await readFile(join(project, "datasets.json"), "utf8");
  await writeFile(join(project, "datasets.json"), "broken");
  // The fake API validates the same input shape needed for this transport test.
  // A local parse error must also block a run, before any backend request.
  await writeFile(join(project, "source-bindings.json"), "broken");
  await page.getByRole("alert").waitFor();
  await writeFile(join(project, "datasets.json"), definitions);
  await writeFile(join(project, "source-bindings.json"), "[]");
  await page.getByText("Count: 2", { exact: true }).waitFor();
  assert.equal((await page.request.get(devUrl + "/.cobalt/connection.json")).status(), 403);
  assert.equal((await page.request.post(devUrl + "/__cobalt/dashboard/dataset", { data: { key: "main" } })).status(), 403);
  execFileSync("npm", ["run", "build"], { cwd: project, stdio: "inherit" });
  const previewUrl = await start(process.execPath, [vite, "preview", "--host", "127.0.0.1", "--port", "0"]);
  await page.goto(previewUrl);
  await page.getByText("Count: 2", { exact: true }).waitFor();
  const publishedJs = await readFile(join(project, "dist/dashboard.js"), "utf8");
  assert.equal(publishedJs.includes("server-only-test-credential"), false);
  assert.equal(publishedJs.includes("/__cobalt/dashboard/"), false, "Development transport leaked into production bundle");
  await writeFile(datasetPath, "function main(){return {count: 3};}");
  await page.reload();
  await page.getByRole("alert").filter({ hasText: "Rebuild" }).waitFor();
  assert.deepEqual(errors, []);
  assert.ok(syncs >= 2);
  console.log("SDK browser checks passed: live preview, dataset edits, error recovery, credential isolation, and saved-build parity.");
} finally {
  await browser?.close();
  await Promise.all(children.map(child => new Promise(resolve => { if (child.exitCode !== null) resolve(); else { child.once("exit", resolve); child.kill("SIGTERM"); } })));
  await new Promise(resolve => backend.close(resolve));
  await rm(temporary, { recursive: true, force: true });
}
