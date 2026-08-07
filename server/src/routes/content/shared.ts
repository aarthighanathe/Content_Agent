import type { MemoryJob, AssembledJob } from '../jobs/ownership.js';
import type { PipelineOutput } from '../../lib/pipeline.js';
import { stripScriptsAndEventHandlers } from '../../lib/carousel.js';

// WHY a shared helper, not inline casts at each call site: a job pulled from
// jobsMemory/jobStore is MemoryJob | AssembledJob | undefined — `outputs` only
// exists on the terminal PersistedJobResult/AssembledJob arms, and TS won't
// narrow a union through an `in` check cleanly here because PipelineJob's
// `[key: string]: unknown` index signature makes every property access
// resolve to `unknown` instead of narrowing per-arm. Reading through `unknown`
// first (not a direct union-to-object cast) is the honest way to say "this
// might not have outputs at runtime" without re-deriving the same cast logic
// at every call site. Canonical copy — routes/jobs/manage.ts imports this
// instead of declaring its own (previously duplicated verbatim in both files).
export function readOutputs(job: MemoryJob | AssembledJob | undefined): PipelineOutput[] {
  const raw = (job as unknown as { outputs?: unknown } | undefined)?.outputs;
  return Array.isArray(raw) ? (raw as PipelineOutput[]) : [];
}

// SECURITY: any route that persists user-edited content into finalOutput.content
// (inline slide-edit save, PATCH /:jobId/content) needs the same
// stripScriptsAndEventHandlers() defense-in-depth content.ts already applies to
// LLM/scraped HTML — content shapes differ per platform, so walk the structure
// recursively rather than only handling the top-level-string case.
export function sanitizeContentDeep<T>(value: T): T {
  if (typeof value === 'string') {
    return stripScriptsAndEventHandlers(value) as unknown as T;
  }
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeContentDeep(item)) as unknown as T;
  }
  if (value !== null && typeof value === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      result[key] = sanitizeContentDeep(val);
    }
    return result as T;
  }
  return value;
}

// WHY: parses raw LLM text output (which may include markdown fences or
// leading/trailing prose despite the prompt asking for JSON-only) through a
// Zod schema instead of a bare JSON.parse() + `any` — same untrusted-LLM-JSON
// boundary pattern as agents/critic.ts and agents/writer.ts (see
// schemas/contentResponses.ts's own WHY). Returns null on unparseable JSON so
// callers can 500 with their existing route-specific message.
export function parseAIJson<T>(schema: { parse: (v: unknown) => T }, raw: string): T | null {
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  try {
    const obj: unknown = JSON.parse(jsonMatch ? jsonMatch[0] : raw);
    return schema.parse(obj);
  } catch {
    return null;
  }
}

