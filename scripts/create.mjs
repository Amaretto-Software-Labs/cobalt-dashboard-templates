import { execFileSync } from "node:child_process";
import { sourceFiles } from "../project/scripts/provenance.mjs";
import { cp, mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
const repository = fileURLToPath(new URL("..", import.meta.url));
if (
  execFileSync("git", ["status", "--porcelain"], {
    cwd: repository,
    encoding: "utf8",
  }).trim()
)
  throw new Error(
    "Check out a clean template commit before scaffolding so the starting SHA identifies the exact source.",
  );
const [key, destination] = process.argv.slice(2);
const catalog = JSON.parse(
  await readFile(resolve(repository, "catalog.json"), "utf8"),
);
if (!catalog.some((template) => template.key === key) || !destination)
  throw new Error(
    "Usage: node scripts/create.mjs <template-key> <destination>",
  );
const target = resolve(destination);
await mkdir(target, { recursive: true });
if ((await readdir(target)).some((file) => file !== ".cobalt"))
  throw new Error(
    "Destination must be empty except for .cobalt checkout context.",
  );
await cp(resolve(repository, "project"), target, {
  recursive: true,
  filter: (path) =>
    !path
      .split("/")
      .some((segment) => ["node_modules", "dist", ".cobalt"].includes(segment)),
});
await cp(resolve(repository, "templates", key), target, { recursive: true });
const startingSha = execFileSync("git", ["rev-parse", "HEAD"], {
  cwd: repository,
  encoding: "utf8",
}).trim();
await writeFile(
  resolve(target, "template-base.json"),
  JSON.stringify({ startingSha, files: await sourceFiles(target) }),
);
await writeFile(
  resolve(target, "provenance.json"),
  JSON.stringify(
    {
      repository:
        "https://github.com/Amaretto-Software-Labs/cobalt-dashboard-templates.git",
      templateKey: key,
      startingSha,
      initialSha: startingSha,
      rebases: [],
    },
    null,
    2,
  ),
);
console.log(`Created ${key} in ${target}. Read AGENTS.md, then npm ci.`);
