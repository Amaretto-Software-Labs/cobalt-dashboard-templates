import { saveDiff, sourceFiles } from "./provenance.mjs";
import { readdir, readFile, writeFile, mkdir, lstat } from "node:fs/promises";
import { createHash } from "node:crypto";
import { resolve, relative, join } from "node:path";
const root = process.cwd();
const files = [];
let total = 0;
async function add(path) {
  const stat = await lstat(path);
  if (stat.isSymbolicLink())
    throw new Error("Symlinks cannot be published: " + path);
  if (stat.isDirectory()) {
    for (const entry of await readdir(path)) {
      if (entry.startsWith(".") || entry === "node_modules")
        throw new Error(
          "Hidden files/dependencies cannot be published: " + entry,
        );
      await add(join(path, entry));
    }
    return;
  }
  const text = await readFile(path, "utf8");
  if (Buffer.byteLength(text) > 1_000_000 || text.split("\n").length > 20_000)
    throw new Error("File exceeds import limit: " + path);
  total += text.length;
  files.push({
    path: relative(root, path).split("\\").join("/"),
    sha256: createHash("sha256").update(text).digest("hex"),
  });
}
const build = JSON.parse(await readFile("dist/build.json", "utf8"));
const current = await sourceFiles(root);
if (
  Object.keys(build.sourceHashes).length !== Object.keys(current).length ||
  Object.entries(current).some(
    ([path, text]) =>
      build.sourceHashes[path] !==
      createHash("sha256").update(text).digest("hex"),
  )
)
  throw new Error(
    "Source changed after build. Run npm run build again before packaging.",
  );
for (const [path, sha] of Object.entries(build.artifactHashes))
  if (
    createHash("sha256")
      .update(await readFile(path))
      .digest("hex") !== sha
  )
    throw new Error("Build output changed. Rebuild before packaging.");
await saveDiff(root);
await mkdir("dist", { recursive: true });
for (const file of ["dist/dashboard.js", "dist/dashboard.css"])
  await lstat(file);
for (const path of [
  "provenance.json",
  "template-base.json",
  "changes.patch",
  "package.json",
  "package-lock.json",
  "tsconfig.json",
  "vite.config.ts",
  "index.html",
  "manifest.json",
  "datasets.json",
  "source-bindings.json",
  "datasets",
  "AGENTS.md",
  "src",
  "ui",
  "scripts",
  "dist",
])
  await add(resolve(root, path));
if (files.length > 128 || total > 8_000_000)
  throw new Error("Project exceeds publication limits");
await mkdir(".cobalt", { recursive: true });
await writeFile(
  ".cobalt/package.json",
  JSON.stringify(
    { version: 1, files: files.sort((a, b) => a.path.localeCompare(b.path)) },
    null,
    2,
  ),
);
console.log(
  `Packaged ${files.length} files (${total} characters). Import using dashboard_workspace.`,
);
