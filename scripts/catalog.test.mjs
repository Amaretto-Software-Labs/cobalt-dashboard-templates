import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const root = new URL("../", import.meta.url);
const catalog = JSON.parse(
  await readFile(new URL("catalog.json", root), "utf8"),
);
for (const template of catalog) {
  test(`${template.key} has an authoring prompt and both screenshot assets`, async () => {
    assert.ok(
      template.prompt?.trim().length > 40,
      "Provide a useful sample prompt",
    );
    for (const theme of ["dark", "light"]) {
      const path = `previews/${template.key}-${theme}.png`;
      assert.equal(template.preview[theme], path);
      const image = await readFile(new URL(path, root));
      assert.equal(image.subarray(0, 8).toString("hex"), "89504e470d0a1a0a");
      assert.equal(image.readUInt32BE(16), 1280);
      assert.equal(image.readUInt32BE(20), 800);
      assert.ok(image.length < 1024 * 1024, "Keep preview images below 1 MiB");
    }
  });
}
