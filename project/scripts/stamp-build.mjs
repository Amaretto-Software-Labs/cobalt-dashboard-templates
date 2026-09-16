import { readFile, readdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { sourceFiles } from "./provenance.mjs";
const hash = (value) => createHash("sha256").update(value).digest("hex");
const sourceHashes = Object.fromEntries(
  Object.entries(await sourceFiles(process.cwd())).map(([path, text]) => [
    path,
    hash(text),
  ]),
);
await writeFile("dist/index.html", '<div id="root"></div>');
const artifactHashes = {};
for (const name of await readdir("dist"))
  if (name !== "build.json")
    artifactHashes["dist/" + name] = hash(await readFile("dist/" + name));
await writeFile(
  "dist/build.json",
  JSON.stringify({ sourceHashes, artifactHashes }, null, 2),
);
