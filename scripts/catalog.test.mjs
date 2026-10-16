import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { createParser } from '@openuidev/lang-core';
const root = new URL('../', import.meta.url);
const catalog = JSON.parse(await readFile(new URL('catalog.json', root), 'utf8'));
const schema = JSON.parse(await readFile(new URL('catalog.schema.json', root), 'utf8'));
assert.equal(new Set(catalog.map(item => item.key)).size, catalog.length);
for (const template of catalog) test(`${template.key}: bounded canonical OpenUI source and honest setup`, async () => {
  assert.match(template.key, /^[a-z0-9-]+$/);
  assert.equal(template.version, 3);
  assert.ok(template.prompt.length > 40);
  const bytes = await readFile(new URL(`templates/${template.key}/source.json`, root));
  assert.ok(bytes.length < 512 * 1024);
  const files = JSON.parse(bytes);
  assert.ok(Object.keys(files).length <= 32);
  for (const [path, text] of Object.entries(files)) {
    assert.match(path, /^(dashboard\.json|view\.openui|datasets\.json|source-bindings\.json|datasets\/[a-z0-9-]+\.js)$/);
    assert.equal(typeof text, 'string');
  }
  const manifest = JSON.parse(files['dashboard.json']);
  assert.equal(manifest.format, 'cobalt.openui');
  const datasets = JSON.parse(files['datasets.json']);
  const result = createParser(schema, 'Dashboard').parse(files['view.openui']);
  assert.ok(result.root);
  assert.deepEqual(result.meta.errors, []);
  assert.deepEqual(result.meta.unresolved, []);
  assert.deepEqual(result.meta.orphaned, []);
  assert.equal(result.meta.incomplete, false);
  assert.equal(result.queryStatements.length + result.mutationStatements.length, 0);
  if (template.key !== 'blank') {
    assert.match(files['datasets/main.js'], /throw new Error/);
    assert.ok(template.requiredSources.length > 0);
    assert.deepEqual(JSON.parse(files['source-bindings.json']), []);
  }
  if (process.env.COBALT_OPENUI_VALIDATOR) {
    const datasetFields = Object.fromEntries(datasets.map(item => [item.key, Object.fromEntries(Object.entries(item.outputSchema.properties.rows.items.properties).map(([key, value]) => [key, value.type]))]));
    const validation = spawnSync(process.execPath, [process.env.COBALT_OPENUI_VALIDATOR], { input: JSON.stringify({ source: files['view.openui'], datasetKeys: datasets.map(item => item.key), datasetFields }), encoding: 'utf8', timeout: 15000 });
    assert.equal(validation.status, 0, validation.stderr);
    assert.equal(JSON.parse(validation.stdout).valid, true);
  }
});
