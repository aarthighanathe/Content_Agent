// Bundles the carousel slide renderer for server-side use.
//
// WHY a bundle instead of a plain import: the server has no React dependency and its
// tsconfig pins rootDir to ./src, so it cannot compile or import .tsx from client/.
// esbuild resolves the JSX, inlines the woff2 fonts as data URLs, and bundles React in,
// producing one self-contained .js the server imports like any other module.
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const entry = resolve(here, '../src/ssr/renderSlideHtml.tsx');
const outfile = resolve(here, '../../server/src/generated/slideRenderer.js');

const result = await build({
  entryPoints: [entry],
  outfile,
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node20',
  jsx: 'automatic',
  loader: { '.woff2': 'dataurl' },
  // WHY: without this, the bundled React runs its development build — roughly 3x slower
  // per render and noisy on stderr. The markup is identical either way.
  define: { 'process.env.NODE_ENV': '"production"' },
  // WHY: react-dom/server is CommonJS and calls require('util') internally. In an ESM
  // bundle `require` does not exist, so esbuild emits a stub that throws. Providing a
  // real createRequire lets those built-in lookups resolve.
  banner: {
    js: "import { createRequire as __ssrCreateRequire } from 'node:module';\n"
      + 'const require = __ssrCreateRequire(import.meta.url);',
  },
  legalComments: 'none',
  metafile: true,
});

const bytes = Object.values(result.metafile.outputs)[0]?.bytes ?? 0;
console.log(`[build-ssr] wrote ${outfile} (${(bytes / 1024).toFixed(0)} KB)`);
