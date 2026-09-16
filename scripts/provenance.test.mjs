import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { git } from "../project/scripts/provenance.mjs";
const root = fileURLToPath(new URL("..", import.meta.url));
test("saved customization diff rebases onto a new SHA and preserves conflicts separately", async () => {
  const temp = await mkdtemp(join(tmpdir(), "cobalt-rebase-test-"));
  try {
    const repo = join(temp, "templates");
    execFileSync("git", ["clone", "--quiet", root, repo]);
    const original =
      Array.from({ length: 20 }, (_, i) => "Line " + i).join("\n") + "\n";
    await writeFile(join(repo, "project/ui/rebase-proof.txt"), original);
    git(repo, "add", ".");
    git(repo, "commit", "-qm", "Baseline fixture");
    const baseSha = git(repo, "rev-parse", "HEAD").trim();
    const old = join(temp, "dashboard");
    execFileSync(process.execPath, [
      join(repo, "scripts/create.mjs"),
      "kanban",
      old,
    ]);
    await writeFile(
      join(old, "ui/rebase-proof.txt"),
      original.replace("Line 0\n", "User customization\n"),
    );
    await writeFile(
      join(repo, "project/ui/rebase-proof.txt"),
      original.replace("Line 19\n", "Upstream improvement\n"),
    );
    git(repo, "add", ".");
    git(repo, "commit", "-qm", "Nonconflicting upstream change");
    const nextSha = git(repo, "rev-parse", "HEAD").trim();
    const env = {
      ...process.env,
      GIT_CONFIG_COUNT: "1",
      GIT_CONFIG_KEY_0: `url.${repo}.insteadOf`,
      GIT_CONFIG_VALUE_0:
        "https://github.com/Amaretto-Software-Labs/cobalt-dashboard-templates.git",
    };
    const rebased = join(temp, "rebased");
    const result = spawnSync(
      process.execPath,
      ["scripts/rebase-template.mjs", nextSha, rebased],
      { cwd: old, env, encoding: "utf8" },
    );
    assert.equal(result.status, 0, result.stderr + "\n" + result.stdout);
    const merged = await readFile(join(rebased, "ui/rebase-proof.txt"), "utf8");
    assert.match(merged, /User customization/);
    assert.match(merged, /Upstream improvement/);
    const provenance = JSON.parse(
      await readFile(join(rebased, "provenance.json"), "utf8"),
    );
    assert.equal(provenance.startingSha, nextSha);
    assert.equal(provenance.initialSha, baseSha);
    const patch = await readFile(join(rebased, "changes.patch"), "utf8");
    assert.match(patch, /\+User customization/);
    assert.doesNotMatch(patch, /\+Upstream improvement/);
    assert.equal(
      await readFile(join(old, "ui/rebase-proof.txt"), "utf8"),
      original.replace("Line 0\n", "User customization\n"),
    );
    await writeFile(
      join(repo, "project/ui/rebase-proof.txt"),
      original.replace("Line 0\n", "Conflicting upstream change\n"),
    );
    git(repo, "add", ".");
    git(repo, "commit", "-qm", "Conflicting upstream change");
    const conflictSha = git(repo, "rev-parse", "HEAD").trim();
    const conflict = join(temp, "conflict");
    const failed = spawnSync(
      process.execPath,
      ["scripts/rebase-template.mjs", conflictSha, conflict],
      { cwd: old, env, encoding: "utf8" },
    );
    assert.equal(failed.status, 2, failed.stderr + "\n" + failed.stdout);
    assert.match(
      await readFile(join(conflict, "ui/rebase-proof.txt"), "utf8"),
      /<<<<<<< HEAD/,
    );
    assert.equal(
      await readFile(join(old, "ui/rebase-proof.txt"), "utf8"),
      original.replace("Line 0\n", "User customization\n"),
    );
  } finally {
    await rm(temp, { recursive: true, force: true });
  }
});
