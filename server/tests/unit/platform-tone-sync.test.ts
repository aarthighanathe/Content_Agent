/**
 * Cross-system platform / tone sync — regression guard.
 *
 * WHY this test exists: VALID_PLATFORMS / VALID_TONES in schemas/jobs.ts are the
 * request-validation source of truth, but the same literals are duplicated in
 * db/schemaEnums.ts (Postgres enums), client/src/types/job.ts (typed unions),
 * Create/platforms.ts, and ToneSelector.tsx. Drift historically caused create
 * to accept a tone Postgres then rejected (tone pgEnum lag) or left UI pills
 * that zod rejected (ToneSelector subset). Same discipline as
 * template-id-sync.test.ts for TemplateId ↔ VALID_TEMPLATE_IDS.
 *
 * WHY text-extraction for client files: server vitest is node-only (no JSX /
 * client path aliases) — reading sources as text matches template-id-sync.
 *
 * NOTE: paletteId sync is intentionally skipped — createJobSchema /
 * exportCarouselSsrSchema accept paletteId as z.string().max(50) with no
 * VALID_PALETTE_IDS mirror; palette catalogs live only under
 * client/src/lib/templates/*.ts.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const REPO_ROOT = resolve(import.meta.dirname, '../../..');

function readRepoFile(relativePath: string): string {
  return readFileSync(resolve(REPO_ROOT, relativePath), 'utf8');
}

function extractConstStringArray(src: string, exportName: string): string[] {
  const match = src.match(
    new RegExp(`export const ${exportName}\\s*=\\s*\\[([\\s\\S]*?)\\]\\s*as const`),
  );
  if (!match) {
    throw new Error(`Could not locate \`export const ${exportName} = [ ... ] as const\``);
  }
  return [...match[1].matchAll(/'([a-z0-9_]+)'/g)].map((m) => m[1]);
}

function extractPgEnumValues(src: string, enumName: string): string[] {
  const match = src.match(
    new RegExp(`export const ${enumName}\\s*=\\s*pgEnum\\('[^']+',\\s*\\[([\\s\\S]*?)\\]\\)`),
  );
  if (!match) {
    throw new Error(`Could not locate \`export const ${enumName} = pgEnum(...)\``);
  }
  return [...match[1].matchAll(/'([a-z0-9_]+)'/g)].map((m) => m[1]);
}

function extractCreatePlatformIds(): string[] {
  const src = readRepoFile('client/src/pages/Create/platforms.ts');
  const match = src.match(/export const platforms\s*=\s*\[([\s\S]*?)\];/);
  if (!match) throw new Error('Could not locate `export const platforms = [ ... ]`');
  return [...match[1].matchAll(/\bid:\s*'([a-z0-9_]+)'/g)].map((m) => m[1]);
}

function extractToneSelectorIds(): string[] {
  const src = readRepoFile('client/src/pages/Create/ToneSelector.tsx');
  const match = src.match(/const tones\s*=\s*\[([\s\S]*?)\];/);
  if (!match) throw new Error('Could not locate `const tones = [ ... ]` in ToneSelector.tsx');
  return [...match[1].matchAll(/\bid:\s*'([a-z0-9_]+)'/g)].map((m) => m[1]);
}

function expectSameSet(
  sourceOfTruth: ReadonlySet<string>,
  other: ReadonlySet<string>,
  otherLabel: string,
): void {
  const missing = [...sourceOfTruth].filter((id) => !other.has(id));
  const extra = [...other].filter((id) => !sourceOfTruth.has(id));
  expect(missing, `ids in schemas/jobs.ts but missing from ${otherLabel}`).toEqual([]);
  expect(extra, `ids in ${otherLabel} but not in schemas/jobs.ts (stale/leftover)`).toEqual([]);
}

describe('platform / tone — cross-system sync', () => {
  it('VALID_PLATFORMS matches schemaEnums, JOB_PLATFORMS, and Create/platforms.ts', async () => {
    const { VALID_PLATFORMS } = await import('../../src/schemas/jobs.js');
    const fromSchema = new Set(VALID_PLATFORMS as readonly string[]);
    const fromPg = new Set(
      extractPgEnumValues(readRepoFile('server/src/db/schemaEnums.ts'), 'platformEnum'),
    );
    const fromClientTypes = new Set(
      extractConstStringArray(readRepoFile('client/src/types/job.ts'), 'JOB_PLATFORMS'),
    );
    const fromCreateUi = new Set(extractCreatePlatformIds());

    expect(fromSchema.size, 'VALID_PLATFORMS should not be empty').toBeGreaterThan(0);
    expectSameSet(fromSchema, fromPg, 'schemaEnums.ts platformEnum');
    expectSameSet(fromSchema, fromClientTypes, 'client types JOB_PLATFORMS');
    expectSameSet(fromSchema, fromCreateUi, 'Create/platforms.ts');
  });

  it('VALID_TONES matches schemaEnums, JOB_TONES, and ToneSelector.tsx', async () => {
    const { VALID_TONES } = await import('../../src/schemas/jobs.js');
    const fromSchema = new Set(VALID_TONES as readonly string[]);
    const fromPg = new Set(
      extractPgEnumValues(readRepoFile('server/src/db/schemaEnums.ts'), 'toneEnum'),
    );
    const fromClientTypes = new Set(
      extractConstStringArray(readRepoFile('client/src/types/job.ts'), 'JOB_TONES'),
    );
    const fromToneUi = new Set(extractToneSelectorIds());

    expect(fromSchema.size, 'VALID_TONES should not be empty').toBeGreaterThan(0);
    expectSameSet(fromSchema, fromPg, 'schemaEnums.ts toneEnum');
    expectSameSet(fromSchema, fromClientTypes, 'client types JOB_TONES');
    expectSameSet(fromSchema, fromToneUi, 'Create/ToneSelector.tsx');
  });

  // WHY skipped: no server-side palette enum — only client template colorPalettes.
  it.skip('palette ids — no VALID_PALETTE_IDS on server (paletteId is z.string().max(50))', () => {
    expect(true).toBe(true);
  });
});
