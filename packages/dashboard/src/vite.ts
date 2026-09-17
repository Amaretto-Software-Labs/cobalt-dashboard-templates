import { readFile } from "node:fs/promises";
import { relative, resolve } from "node:path";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { Plugin, ViteDevServer, PreviewServer } from "vite";
import { DashboardDevelopment, DashboardDevelopmentError } from "./development.js";

const prefix = "/__cobalt/dashboard/";

export function cobaltDashboard(): Plugin {
  let root: string;
  let development: DashboardDevelopment;
  let preview = false;

  async function middleware(req: IncomingMessage, res: ServerResponse, next: () => void) {
    try {
      const path = decodeURIComponent(new URL(req.url ?? "/", "http://localhost").pathname);
      if (path.split("/").some(part => part === ".cobalt")) { res.statusCode = 403; res.end(); return; }
      if (path === prefix + "client.js") {
        res.setHeader("Content-Type", "text/javascript");
        res.end(await readFile(new URL("./dev-client.js", import.meta.url), "utf8")); return;
      }
      if (path.startsWith(prefix)) {
        if (req.method !== "POST" || req.headers["x-cobalt-dashboard"] !== "1") {
          res.statusCode = 403; res.end(); return;
        }
        let text = "";
        for await (const chunk of req) {
          text += chunk.toString();
          if (text.length > 64_000) throw new DashboardDevelopmentError("Request is too large.", 413);
        }
        const body = JSON.parse(text || "{}");
        await development.synchronize();
        let result: unknown;
        switch (path.slice(prefix.length)) {
          case "dataset": result = await development.run(requireKey(body.key), body.params ?? {}); break;
          case "records": result = await development.request(`records/${encodeURIComponent(requireKey(body.collection))}`); break;
          case "action-grant": result = await development.request(`actions/${encodeURIComponent(requireKey(body.key))}/grants`, "POST", { input: body.input }); break;
          case "action-run": result = await development.request(`actions/${encodeURIComponent(requireKey(body.key))}/runs`, "POST", { grantId: body.grantId, idempotencyKey: body.idempotencyKey }); break;
          default: throw new DashboardDevelopmentError("Unknown dashboard operation.", 404);
        }
        res.setHeader("Content-Type", "application/json"); res.setHeader("Cache-Control", "no-store");
        res.end(JSON.stringify(result)); return;
      }
      if (preview && (path === "/" || path === "/index.html")) {
        // Serve the saved IIFE/CSS/HTML on the ordinary task preview port.
        // Synchronization verifies build.json before any live data can execute.
        const manifest = JSON.parse(await development.file("manifest.json"));
        const tree = manifest.sourceTree;
        const html = await development.file(tree.html);
        const css = (await Promise.all(tree.styles.map((p: string) => development.file(p)))).join("\n");
        const js = (await Promise.all(tree.scripts.map((p: string) => development.file(p)))).join("\n");
        const theme = await development.file("ui/preview-theme.css");
        res.setHeader("Content-Type", "text/html"); res.setHeader("Cache-Control", "no-store");
        res.end(`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${(theme + css).replaceAll("</style", "<\\/style")}</style></head><body>${html}<script type="module">import {installDevelopmentBridge} from '${prefix}client.js';installDevelopmentBridge();\n${js.replaceAll("</script", "<\\/script")}</script></body></html>`);
        return;
      }
      next();
    } catch (error) {
      res.statusCode = error instanceof DashboardDevelopmentError ? error.status : 400;
      res.setHeader("Content-Type", "application/json"); res.setHeader("Cache-Control", "no-store");
      res.end(JSON.stringify({ code: (error as DashboardDevelopmentError).code ?? "dashboard_development_error", message: (error as Error).message }));
    }
  }

  function configure(server: ViteDevServer | PreviewServer) {
    root = server.config.root;
    development = new DashboardDevelopment(root, preview);
    server.middlewares.use((req, res, next) => { void middleware(req, res, next); });
  }

  const isDatasetFile = (file: string) => {
    const path = relative(root, file).replaceAll("\\", "/");
    return ["datasets.json", "manifest.json", "source-bindings.json", ".cobalt/connection.json"].includes(path) || path.startsWith("datasets/");
  };
  return {
    name: "cobalt-dashboard",
    resolveId(id) { if (id === prefix + "client.js") return "\0cobalt-dashboard-dev-client"; },
    async load(id) { if (id === "\0cobalt-dashboard-dev-client") return readFile(new URL("./dev-client.js", import.meta.url), "utf8"); },
    config: () => ({ server: { cors: false, fs: { deny: [".env", ".env.*", "*.{crt,pem}", "**/.git/**", "**/.cobalt/**"] } }, preview: { cors: false } }),
    configureServer(server) {
      configure(server);
      server.watcher.add(["datasets", "datasets.json", "source-bindings.json", "manifest.json", ".cobalt/connection.json"].map(p => resolve(root, p)));
      let timer: ReturnType<typeof setTimeout>;
      const changed = (_event: string, file: string) => {
        if (!isDatasetFile(file)) return;
        clearTimeout(timer);
        timer = setTimeout(() => {
          // Hooks discard pending results immediately; their next request waits for synchronization.
          server.ws.send({ type: "custom", event: "cobalt:datasets", data: {} });
          void development.synchronize().catch(error => server.config.logger.error(`Dashboard sync: ${error.message}`));
        }, 100);
      };
      server.watcher.on("all", changed);
      server.httpServer?.once("close", () => { clearTimeout(timer); server.watcher.off("all", changed); });
    },
    configurePreviewServer(server) { preview = true; configure(server); },
    transformIndexHtml: {
      order: "pre",
      handler: (_html, context) => context.server ? [{ tag: "script", attrs: { type: "module" }, injectTo: "head-prepend",
        children: `import {installDevelopmentBridge} from '${prefix}client.js';import {createHotContext} from '/@vite/client';installDevelopmentBridge();createHotContext('/__cobalt/dashboard').on('cobalt:datasets',()=>window.dispatchEvent(new Event('cobalt:datasets')));` }] : [],
    },
    handleHotUpdate(context) { if (isDatasetFile(context.file)) return []; },
  };
}

function requireKey(value: unknown): string {
  if (typeof value !== "string" || !value.trim() || value.length > 64) throw new DashboardDevelopmentError("A bounded dataset, collection, or action key is required.", 400);
  return value;
}
