import { createHash } from "node:crypto";
import { readFile, readdir, realpath, lstat } from "node:fs/promises";
import { resolve, relative } from "node:path";

type Connection = { url: string; token: string };
export class DashboardDevelopmentError extends Error {
  constructor(message: string, public readonly status = 500, public readonly code = "dashboard_development_error") {
    super(message);
  }
}

/** Node-only adapter. Credentials never enter Vite's browser module graph. */
export class DashboardDevelopment {
  private queue: Promise<void> = Promise.resolve();
  private synchronizedHash?: string;
  private credential?: string;

  constructor(readonly root: string, readonly built = false) {}

  async file(path: string) {
    const root = await realpath(this.root);
    const absolute = resolve(root, path);
    const actual = await realpath(absolute);
    if (actual !== absolute || relative(root, actual).startsWith(".."))
      throw new DashboardDevelopmentError(`Dashboard source cannot traverse directories or use symlinks: ${path}`, 400);
    const stat = await lstat(actual);
    if (!stat.isFile() || stat.size > 1_000_000)
      throw new DashboardDevelopmentError(`Dashboard file exceeds its size limit: ${path}`, 400);
    return new TextDecoder("utf-8", { fatal: true }).decode(await readFile(actual));
  }

  private async connection(): Promise<Connection> {
    let connection: Connection;
    try { connection = JSON.parse(await this.file(".cobalt/connection.json")); }
    catch { throw new DashboardDevelopmentError("Run dashboard_workspace checkout in this task to connect the dashboard preview to Cobalt.", 401); }
    const url = new URL(connection.url);
    if (!connection.token || url.username || url.password ||
      !(url.protocol === "https:" || url.protocol === "http:" && ["localhost", "127.0.0.1", "host.docker.internal"].includes(url.hostname)))
      throw new DashboardDevelopmentError("Invalid Cobalt editing connection. Run dashboard_workspace checkout again.", 401);
    if (this.credential !== connection.token) {
      this.synchronizedHash = undefined;
      this.credential = connection.token;
    }
    return connection;
  }

  async request(path: string, method = "GET", body?: unknown) {
    const connection = await this.connection();
    const response = await fetch(new URL(path, connection.url), {
      method, headers: { Authorization: `Bearer ${connection.token}`, "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body), redirect: "error",
      signal: AbortSignal.timeout(45_000),
    });
    const result = await response.json() as Record<string, any>;
    if (!response.ok) throw new DashboardDevelopmentError(
      result.detail ?? result.errorMessage ?? result.title ?? "Cobalt rejected the dashboard request.",
      response.status, result.code ?? result.errorCode ?? "dashboard_request_failed",
    );
    return result;
  }

  private async snapshot() {
    if (this.built) {
      const stamp = JSON.parse(await this.file("dist/build.json"));
      for (const [path, hash] of Object.entries({ ...stamp.sourceHashes, ...stamp.artifactHashes })) {
        if (digest(await this.file(path)) !== hash)
          throw new DashboardDevelopmentError("Source or build output changed. Rebuild before previewing the saved build.", 409);
      }
    }
    const files: Record<string, string> = {
      "datasets.json": await this.file("datasets.json"),
      "manifest.json": await this.file("manifest.json"),
    };
    if (!Array.isArray(JSON.parse(files["datasets.json"]))) throw new DashboardDevelopmentError("datasets.json must be an array.", 400);
    const visit = async (directory: string) => {
      for (const entry of await readdir(resolve(this.root, directory), { withFileTypes: true })) {
        const path = `${directory}/${entry.name}`;
        if (entry.isSymbolicLink()) throw new DashboardDevelopmentError(`Dataset symlink is not allowed: ${path}`, 400);
        if (entry.isDirectory()) await visit(path);
        else {
          if (entry.name.startsWith(".")) throw new DashboardDevelopmentError("Hidden dataset files cannot be synchronized.", 400);
          files[path] = await this.file(path);
        }
        if (Object.keys(files).length > 40) throw new DashboardDevelopmentError("Too many dataset files (maximum 38 scripts).", 400);
      }
    };
    await visit("datasets");
    const sourceBindings = JSON.parse(await this.file("source-bindings.json"));
    return { files: Object.fromEntries(Object.entries(files).sort(([a], [b]) => a.localeCompare(b))), sourceBindings };
  }

  synchronize() {
    const next = this.queue.catch(() => {}).then(async () => {
      // Observe the credential before comparing hashes: a renewed session needs its own draft.
      await this.connection();
      let snapshot = await this.snapshot();
      let stable = false;
      for (let attempt = 0; attempt < 3; attempt++) {
        const second = await this.snapshot();
        if (JSON.stringify(snapshot) === JSON.stringify(second)) { stable = true; break; }
        snapshot = second;
      }
      if (!stable) throw new DashboardDevelopmentError("Dataset files are still changing. Retry after saving them.", 409);
      const hash = digest(JSON.stringify(snapshot));
      if (hash === this.synchronizedHash) return;
      await this.request("draft", "PUT", snapshot);
      this.synchronizedHash = hash;
    });
    this.queue = next.catch(error => { this.synchronizedHash = undefined; throw error; });
    return this.queue;
  }

  async run(key: string, parameters: Record<string, unknown> = {}) {
    await this.synchronize();
    let run = await this.request(`datasets/${encodeURIComponent(key)}/runs`, "POST", { params: parameters });
    const deadline = Date.now() + 120_000;
    while (run.status === "queued" || run.status === "running") {
      if (Date.now() > deadline) {
        await this.request(`runs/${run.id}/cancel`, "POST");
        throw new DashboardDevelopmentError("Dataset execution timed out.", 504, "dashboard_run_timeout");
      }
      await new Promise(resolve => setTimeout(resolve, Math.min(2000, Math.max(100, run.pollAfterMilliseconds ?? 1000))));
      run = await this.request(`runs/${run.id}`);
    }
    if (run.status !== "completed") throw new DashboardDevelopmentError(run.errorMessage ?? "Dataset execution failed.", 422, run.errorCode);
    return run.result;
  }
}

function digest(value: string) { return createHash("sha256").update(value).digest("hex"); }
