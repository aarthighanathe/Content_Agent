// Copies the esbuild SSR bundle into dist/ after tsc runs.
// WHY: src/generated is excluded from tsconfig (tsc must not try to compile or emit
// declarations for a prebuilt bundle), so tsc never copies it. Production runs
// `node dist/index.js`, which resolves '../generated/slideRenderer.js' inside dist/.
import { mkdir, copyFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const from = resolve(here, '../src/generated/slideRenderer.js');
const toDir = resolve(here, '../dist/generated');
const to = resolve(toDir, 'slideRenderer.js');

await mkdir(toDir, { recursive: true });
await copyFile(from, to);
console.log(`[copy-generated] ${from} -> ${to}`);
