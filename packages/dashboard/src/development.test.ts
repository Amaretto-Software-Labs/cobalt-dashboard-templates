import { afterEach, expect, test } from "vitest";
import { mkdtemp, mkdir, writeFile, rm, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createServer } from "node:http";
import { DashboardDevelopment } from "./development.js";

const cleanup: (() => Promise<void>)[] = [];
afterEach(async () => { for (const close of cleanup.splice(0).reverse()) await close(); });

async function fixture() {
  const root = await mkdtemp(join(tmpdir(), "dashboard-sdk-"));
  cleanup.push(() => rm(root, { force: true, recursive: true }));
  await mkdir(join(root, ".cobalt")); await mkdir(join(root, "datasets"));
  await writeFile(join(root, "datasets.json"), JSON.stringify([{ key: "metrics", scriptFile: "datasets/metrics.js" }]));
  await writeFile(join(root, "datasets/metrics.js"), "function main(){return {count:1};}");
  await writeFile(join(root, "manifest.json"), "{}"); await writeFile(join(root, "source-bindings.json"), "[]");
  const state = { scripts: [] as string[], calls: [] as string[], failSync: false, runs: 0 };
  const server = createServer(async (request, response) => {
    state.calls.push(request.url!);
    if (request.headers.authorization !== "Bearer private-task-credential") { response.writeHead(401).end(); return; }
    let text = ""; for await (const chunk of request) text += chunk;
    const body = text ? JSON.parse(text) : {};
    response.setHeader("Content-Type", "application/json");
    if (request.url === "/draft") {
      state.scripts.push(body.files["datasets/metrics.js"]);
      if (state.failSync) { response.statusCode = 400; response.end(JSON.stringify({ detail: "Source binding invalid", code: "dashboard_sync_failed" })); return; }
      await new Promise(resolve => setTimeout(resolve, 15));
      response.end("{}"); return;
    }
    if (request.url === "/datasets/metrics/runs") { state.runs++; response.end(JSON.stringify({ id: String(state.runs), status: "completed", result: { script: state.scripts.at(-1) } })); return; }
    response.statusCode = 404; response.end("{}");
  });
  await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
  cleanup.push(() => new Promise<void>(resolve => server.close(() => resolve())));
  const address = server.address() as { port: number };
  await writeFile(join(root, ".cobalt/connection.json"), JSON.stringify({ url: `http://127.0.0.1:${address.port}/`, token: "private-task-credential" }));
  return { root, state, adapter: new DashboardDevelopment(root) };
}

test("concurrent requests sync once and run current files without client revision IDs", async () => {
  const { root, state, adapter } = await fixture();
  await Promise.all([adapter.run("metrics"), adapter.run("metrics")]);
  expect(state.scripts).toHaveLength(1); expect(state.runs).toBe(2);
  expect(state.calls[0]).toBe("/draft");
  const changed = "function main(){return {count:2};}";
  await writeFile(join(root, "datasets/metrics.js"), changed);
  expect(await adapter.run("metrics")).toEqual({ script: changed });
  expect(state.scripts).toHaveLength(2);
});

test("failed synchronization prevents stale runs and repairing files clears the failure", async () => {
  const { root, state, adapter } = await fixture();
  await adapter.run("metrics");
  state.failSync = true;
  await writeFile(join(root, "datasets/metrics.js"), "broken");
  await expect(adapter.run("metrics")).rejects.toThrow("Source binding invalid");
  expect(state.runs).toBe(1);
  state.failSync = false;
  await writeFile(join(root, "datasets/metrics.js"), "function main(){return {count:1};}");
  await adapter.run("metrics");
  expect(state.scripts).toHaveLength(3); expect(state.runs).toBe(2);
});

test("missing credentials and source symlinks fail before any execution", async () => {
  const { root, state, adapter } = await fixture();
  await rm(join(root, ".cobalt/connection.json"));
  await expect(adapter.run("metrics")).rejects.toThrow("checkout");
  expect(state.calls).toHaveLength(0);
  await symlink(join(root, "manifest.json"), join(root, "datasets/linked.js"));
  await expect(adapter.file("datasets/linked.js")).rejects.toThrow("symlinks");
});
