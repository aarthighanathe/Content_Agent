/**
 * Cross-system TemplateId sync — regression guard.
 *
 * WHY this test exists: three separate places must list the exact same 10
 * carousel template ids — client/src/lib/templateSystem.ts's `TemplateId`
 * union (the source of truth), server/src/schemas/jobs.ts's
 * VALID_TEMPLATE_IDS (mirrored server-side since the server can't import
 * client TypeScript), and client/src/pages/Result/.../igslide/templates/
 * registry.ts's TEMPLATE_COMPONENTS map. Nothing enforced these three stay in
 * sync — someone adding a template to templateSystem.ts but forgetting
 * VALID_TEMPLATE_IDS would have createJobSchema silently reject the new
 * template's id at job-creation time; forgetting registry.ts leaves
 * IGSlide.tsx with no component to resolve. This test also checks the
 * prebuilt SSR bundle (server/src/generated/slideRenderer.js) actually
 * contains every current template id as a literal string — CLAUDE.md §11a
 * documents a real production bug (2026-08-06) where a stale bundle after a
 * template source change made the PNG export silently ignore a new template
 * while the live preview looked correct.
 *
 * WHY text-extraction, not importing client/*.tsx: this test suite runs
 * under the server's vitest config (node environment, no JSX/React DOM
 * transform, no path alias to the client package) — reading the source files
 * as text and extracting the id lists with a targeted regex avoids pulling
 * client build tooling into the server test run, while still failing loudly
 * (with a clear diff) if any of the three drifts from the others.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const REPO_ROOT = resolve(import.meta.dirname, '../../..');

function extractTemplateIdUnion(): string[] {
  const src = readFileSync(resolve(REPO_ROOT, 'client/src/lib/templateSystem.ts'), 'utf8');
  const match = src.match(/export type TemplateId =\s*([\s\S]*?);/);
  if (!match) throw new Error('Could not locate `export type TemplateId = ...` in templateSystem.ts');
  return [...match[1].matchAll(/'([a-z0-9-]+)'/g)].map((m) => m[1]);
}

function extractRegistryKeys(): string[] {
  const src = readFileSync(
    resolve(REPO_ROOT, 'client/src/pages/Result/components/content/carousel/igslide/templates/registry.ts'),
    'utf8',
  );
  const match = src.match(/TEMPLATE_COMPONENTS[^{]*\{([\s\S]*?)\n\};/);
  if (!match) throw new Error('Could not locate `TEMPLATE_COMPONENTS = { ... }` in registry.ts');
  return [...match[1].matchAll(/'([a-z0-9-]+)':/g)].map((m) => m[1]);
}

function readSsrBundle(): string {
  return readFileSync(resolve(REPO_ROOT, 'server/src/generated/slideRenderer.js'), 'utf8');
}

describe('carousel TemplateId — three-way cross-system sync', () => {
  it('templateSystem.ts, schemas/jobs.ts, and registry.ts list the exact same set of template ids', async () => {
    const { VALID_TEMPLATE_IDS } = await import('../../src/schemas/jobs.js');

    const fromTemplateSystem = new Set(extractTemplateIdUnion());
    const fromSchema = new Set(VALID_TEMPLATE_IDS as readonly string[]);
    const fromRegistry = new Set(extractRegistryKeys());

    const missingFromSchema = [...fromTemplateSystem].filter((id) => !fromSchema.has(id));
    const missingFromRegistry = [...fromTemplateSystem].filter((id) => !fromRegistry.has(id));
    const extraInSchema = [...fromSchema].filter((id) => !fromTemplateSystem.has(id));
    const extraInRegistry = [...fromRegistry].filter((id) => !fromTemplateSystem.has(id));

    expect(fromTemplateSystem.size, 'templateSystem.ts TemplateId union should not be empty — check the extraction regex').toBeGreaterThan(0);
    expect(missingFromSchema, 'ids in templateSystem.ts but missing from schemas/jobs.ts VALID_TEMPLATE_IDS').toEqual([]);
    expect(missingFromRegistry, 'ids in templateSystem.ts but missing from registry.ts TEMPLATE_COMPONENTS').toEqual([]);
    expect(extraInSchema, 'ids in schemas/jobs.ts VALID_TEMPLATE_IDS but not in templateSystem.ts (stale/leftover)').toEqual([]);
    expect(extraInRegistry, 'ids in registry.ts TEMPLATE_COMPONENTS but not in templateSystem.ts (stale/leftover)').toEqual([]);
  });

  it('the prebuilt SSR bundle (slideRenderer.js) contains every current template id as a literal string', () => {
    const templateIds = extractTemplateIdUnion();
    const bundle = readSsrBundle();

    const missingFromBundle = templateIds.filter((id) => !bundle.includes(`'${id}'`) && !bundle.includes(`"${id}"`));

    // WHY this specific assertion catches the documented 2026-08-06 bug: a
    // template added to templateSystem.ts/registry.ts without running
    // `npm run build:ssr` leaves its id absent from the bundle text — the PNG
    // export would then silently fall through to a default/blank render for
    // that template while the live preview (which imports the source
    // directly, not the bundle) looks correct.
    expect(missingFromBundle, 'template ids missing from the SSR bundle — run `npm run build:ssr` in client/').toEqual([]);
  });
});
