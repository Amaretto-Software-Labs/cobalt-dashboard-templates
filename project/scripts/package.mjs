import { saveDiff } from './provenance.mjs';
import { readdir, readFile, writeFile, mkdir, lstat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve, relative, join } from 'node:path';
const root = process.cwd();
const files = [];
let total = 0;
async function add(path) {
  const stat = await lstat(path);
  if (stat.isSymbolicLink()) throw new Error('Symlinks cannot be published: ' + path);
  if (stat.isDirectory()) {
    for (const entry of await readdir(path)) {
      if (entry.startsWith('.') || entry === 'node_modules') throw new Error('Hidden files/dependencies cannot be published: ' + entry);
      await add(join(path, entry));
    }
    return;
  }
  const text = await readFile(path, 'utf8');
  if (Buffer.byteLength(text) > 1_000_000 || text.split('\n').length > 20_000) throw new Error('File exceeds import limit: ' + path);
  total += text.length;
  files.push({ path: relative(root, path).split('\\').join('/'), sha256: createHash('sha256').update(text).digest('hex') });
}
await saveDiff(root);
await mkdir('dist', { recursive: true });
await writeFile('dist/index.html', '<div id="root"></div>');
for (const file of ['dist/dashboard.js', 'dist/dashboard.css']) await lstat(file);
for (const path of ['provenance.json','template-base.json','changes.patch','package.json','package-lock.json','tsconfig.json','vite.config.ts','index.html','manifest.json','datasets.json','AGENTS.md','src','ui','sdk','scripts','dist']) await add(resolve(root, path));
if (files.length > 128 || total > 8_000_000) throw new Error('Project exceeds publication limits');
await mkdir('.cobalt', { recursive: true });
await writeFile('.cobalt/package.json', JSON.stringify({ version: 1, files: files.sort((a,b) => a.path.localeCompare(b.path)) }, null, 2));
console.log(`Packaged ${files.length} files (${total} characters). Import using dashboard_workspace.`);
