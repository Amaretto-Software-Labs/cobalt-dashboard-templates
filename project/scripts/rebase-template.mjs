// Build a three-way merge from immutable template baseline, saved customizations, and the new template.
// Never overwrite the current project. Conflicts remain in a separate workspace for normal agent resolution.
import {
  mkdtemp,
  readFile,
  writeFile,
  rm,
  readdir,
  cp,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { execFileSync } from "node:child_process";
import { git, sourceFiles, writeTree, saveDiff } from "./provenance.mjs";
const root = process.cwd();
const [sha, destinationArg] = process.argv.slice(2);
if (!sha || !/^[a-f0-9]{40}$/.test(sha) || !destinationArg)
  throw new Error(
    "Usage: npm run template:rebase -- <new-template-commit-sha> <empty-destination>",
  );
const destination = resolve(destinationArg);
if (destination === root)
  throw new Error(
    "Choose a separate destination; the original project is preserved.",
  );
const prior = JSON.parse(await readFile(join(root, "provenance.json"), "utf8"));
if (
  prior.repository !==
  "https://github.com/Amaretto-Software-Labs/cobalt-dashboard-templates.git"
)
  throw new Error("Unexpected template repository");
const baseline = JSON.parse(
  await readFile(join(root, "template-base.json"), "utf8"),
);
if (baseline.startingSha !== prior.startingSha)
  throw new Error("Template baseline mismatch");
const temp = await mkdtemp(join(tmpdir(), "cobalt-template-rebase-"));
try {
  const repo = join(temp, "templates");
  execFileSync(
    "git",
    ["clone", "--quiet", "--no-checkout", prior.repository, repo],
    { stdio: "inherit" },
  );
  git(repo, "checkout", "--detach", sha);
  execFileSync(
    process.execPath,
    [join(repo, "scripts/create.mjs"), prior.templateKey, destination],
    { stdio: "inherit" },
  );
  const nextBaseline = JSON.parse(
    await readFile(join(destination, "template-base.json"), "utf8"),
  );
  const next = JSON.parse(
    await readFile(join(destination, "provenance.json"), "utf8"),
  );
  // Synthetic local commits preserve exact old blobs, so git can perform a real three-way merge.
  git(destination, "init", "-q");
  for (const path of Object.keys(nextBaseline.files))
    await rm(join(destination, path), { force: true });
  await writeTree(destination, baseline.files);
  git(destination, "add", ...Object.keys(baseline.files));
  git(destination, "commit", "-qm", "Previous template " + prior.startingSha);
  const base = git(destination, "rev-parse", "HEAD").trim();
  for (const path of Object.keys(baseline.files))
    await rm(join(destination, path), { force: true });
  await writeTree(destination, await sourceFiles(root));
  git(
    destination,
    "add",
    "-A",
    "--",
    ".",
    ":!template-base.json",
    ":!provenance.json",
    ":!changes.patch",
  );
  git(
    destination,
    "commit",
    "--allow-empty",
    "-qm",
    "Dashboard customizations",
  );
  const customization = git(destination, "rev-parse", "HEAD").trim();
  git(destination, "checkout", "--detach", base);
  for (const path of Object.keys(baseline.files))
    await rm(join(destination, path), { force: true });
  await writeTree(destination, nextBaseline.files);
  git(
    destination,
    "add",
    "-A",
    "--",
    ".",
    ":!template-base.json",
    ":!provenance.json",
    ":!changes.patch",
  );
  git(destination, "commit", "--allow-empty", "-qm", "Updated template " + sha);
  let conflict = false;
  try {
    if (git(destination, "diff", base, customization).trim())
      git(destination, "cherry-pick", customization);
  } catch {
    conflict = true;
  }
  await writeFile(
    join(destination, "template-base.json"),
    JSON.stringify(nextBaseline),
  );
  await writeFile(
    join(destination, "provenance.json"),
    JSON.stringify(
      {
        ...next,
        initialSha: prior.initialSha ?? prior.startingSha,
        rebases: [
          ...(prior.rebases ?? []),
          { from: prior.startingSha, to: sha },
        ],
      },
      null,
      2,
    ),
  );
  // Preserve task version binding in the new workspace; the agent must copy resolved source back to the original import path.
  if (conflict) {
    console.error(
      "Conflicts are preserved in " +
        destination +
        ". Resolve with git, then build and test. The original project is untouched.",
    );
    process.exitCode = 2;
  } else {
    await saveDiff(destination);
    console.log(
      "Rebased project: " +
        destination +
        ". Review changes, npm ci, test and build before copying it back to the dashboard checkout and importing.",
    );
  }
} finally {
  await rm(temp, { recursive: true, force: true });
}
