import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
const product = process.argv[2];
if (!product) throw new Error('Usage: node scripts/sync-ui.mjs /path/to/cobalt-code');
await writeFile(new URL('../project/ui/cobalt-controls.css', import.meta.url), await readFile(resolve(product, 'packages/cobalt-app-ui/src/styles.css')));
const theme = await readFile(resolve(product, 'apps/cobaltcode/src/styles/theme.css'), 'utf8');
await writeFile(new URL('../project/ui/preview-theme.css', import.meta.url), theme.slice(theme.indexOf(':root {')));
