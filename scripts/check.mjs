import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
const root = fileURLToPath(new URL("..", import.meta.url));
const project = join(root, "project");
execFileSync("npm", ["ci", "--ignore-scripts"], {
  cwd: project,
  stdio: "inherit",
});
execFileSync("npm", ["run", "library:build"], {
  cwd: project,
  stdio: "inherit",
});
execFileSync(
  process.execPath,
  ["--test", join(root, "scripts/provenance.test.mjs")],
  { stdio: "inherit" },
);
const templates = JSON.parse(
  await readFile(join(root, "catalog.json"), "utf8"),
);
const temporary = await mkdtemp(join(tmpdir(), "cobalt-templates-check-"));
try {
  const sdk = join(root, "packages/dashboard");
  execFileSync("npm", ["ci", "--ignore-scripts"], {
    cwd: sdk,
    stdio: "inherit",
  });
  execFileSync("npm", ["test"], { cwd: sdk, stdio: "inherit" });
  const [{ filename }] = JSON.parse(
    execFileSync("npm", ["pack", "--json", "--pack-destination", temporary], {
      cwd: sdk,
      encoding: "utf8",
    }),
  );
  for (const { key } of templates) {
    const destination = join(temporary, key);
    execFileSync(
      process.execPath,
      [join(root, "scripts/create.mjs"), key, destination],
      { stdio: "inherit" },
    );
    for (const args of [
      ["ci", "--ignore-scripts"],
      // Test the package being authored, installed from its real npm artifact.
      [
        "install",
        "--ignore-scripts",
        "--save-exact",
        join(temporary, filename),
      ],
      ["test"],
      ["run", "build"],
      ["run", "package"],
    ])
      execFileSync("npm", args, { cwd: destination, stdio: "inherit" });
    const javascript = await readFile(
      join(destination, "dist/dashboard.js"),
      "utf8",
    );
    assert.doesNotMatch(
      javascript,
      /Illustrative record for the component library|cobalt-react-library-decisions|Ship dashboard preview/,
      `${key}: library fixtures must not ship in dashboard JavaScript`,
    );
  }
} finally {
  await rm(temporary, { recursive: true, force: true });
}
