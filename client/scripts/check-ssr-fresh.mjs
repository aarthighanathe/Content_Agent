#!/usr/bin/env node
// DEPLOY-001: fail if carousel SSR sources are newer than the committed bundle.
// WHY: a stale server/src/generated/slideRenderer.js makes PNG export silently
// diverge from the live IGSlide preview (known historical class of bug).
// `npm run build:ssr` regenerates the bundle; this check catches a forgotten rebuild.
import { readdirSync, statSync, existsSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const clientSrc = resolve(here, '../src');
const bundlePath = resolve(here, '../../server/src/generated/slideRenderer.js');

if (!existsSync(bundlePath)) {
  console.error(`[check-ssr] missing bundle: ${bundlePath}`);
  console.error('Run: npm run build:ssr');
  process.exit(1);
}

const bundleMtime = statSync(bundlePath).mtimeMs;

/** Recursively collect files under dir matching predicate. */
function walk(dir, pred, out = []) {
  for (const name of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, name.name);
    if (name.isDirectory()) {
      walk(full, pred, out);
    } else if (pred(full)) {
      out.push(full);
    }
  }
  return out;
}

const sourceRoots = [
  resolve(clientSrc, 'ssr'),
  resolve(clientSrc, 'pages/Result/components/content/carousel/igslide'),
  resolve(clientSrc, 'lib/colorSystem.ts'),
  resolve(clientSrc, 'lib/templateSystem.ts'),
  resolve(clientSrc, 'lib/templateData.ts'),
  resolve(clientSrc, 'lib/templates'),
];

const sources = [];
for (const root of sourceRoots) {
  if (!existsSync(root)) continue;
  const st = statSync(root);
  if (st.isFile()) {
    sources.push(root);
    continue;
  }
  walk(root, (f) => /\.(tsx?|jsx?|css)$/.test(f), sources);
}

const stale = sources.filter((f) => statSync(f).mtimeMs > bundleMtime);
if (stale.length > 0) {
  console.error('[check-ssr] slideRenderer.js is older than these sources:');
  for (const f of stale.slice(0, 20)) {
    console.error(`  - ${f}`);
  }
  if (stale.length > 20) console.error(`  … and ${stale.length - 20} more`);
  console.error('Run: cd client && npm run build:ssr');
  process.exit(1);
}

console.log(`[check-ssr] OK — bundle newer than ${sources.length} source files`);
