import type { MemoryJob } from './jobStore.js';
import type { AssembledJob } from './jobAssemble.js';
import type { PipelineOutput } from './pipeline.js';
import { stripScriptsAndEventHandlers } from './carousel.js';

// WHY: extracted from routes/content/shared.ts so workers (publishWorker) and
// routes share one helper without workers importing routes/*.

// WHY: MemoryJob is PipelineJob | PersistedJobResult; AssembledJob always has
// outputs. Without PipelineJob's old `[key: string]: unknown` index signature,
// `'outputs' in job` narrows to the terminal arms — no cast needed.
export function readOutputs(job: MemoryJob | AssembledJob | undefined): PipelineOutput[] {
  if (!job || !('outputs' in job) || !Array.isArray(job.outputs)) return [];
  return job.outputs;
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

// WHY: greedy `/\{[\s\S]*\}/` matched from the first `{` to the last `}` in the
// whole string, so trailing prose / a second object corrupted JSON.parse.
// Walk braces while respecting strings and escapes; same for `[...]` arrays.
// WHY: exported — agents/routes that need parse-then-safeParse (or array/object
// dual shapes) reuse this instead of reintroducing the greedy regex locally.
// WHY: on JSON.parse failure of a balanced span (e.g. decoy `{0-20}`), resume
// after that span and try the next candidate — first-span-only left later
// valid JSON unreachable.
function findNextBalancedSpan(
  raw: string,
  searchFrom: number,
): { start: number; end: number; text: string } | null {
  let from = searchFrom;
  while (from < raw.length) {
    const startObj = raw.indexOf('{', from);
    const startArr = raw.indexOf('[', from);
    if (startObj === -1 && startArr === -1) return null;

    let start: number;
    let open: '{' | '[' = '{';
    let close: '}' | ']' = '}';
    if (startObj === -1 || (startArr !== -1 && startArr < startObj)) {
      start = startArr;
      open = '[';
      close = ']';
    } else {
      start = startObj;
    }

    let depth = 0;
    let inString = false;
    let escaped = false;
    let closed = false;
    let end = -1;
    for (let i = start; i < raw.length; i++) {
      const ch = raw[i];
      if (escaped) {
        escaped = false;
        continue;
      }
      if (inString) {
        if (ch === '\\') {
          escaped = true;
          continue;
        }
        if (ch === '"') inString = false;
        continue;
      }
      if (ch === '"') {
        inString = true;
        continue;
      }
      if (ch === open) {
        depth += 1;
        continue;
      }
      if (ch === close) {
        depth -= 1;
        if (depth === 0) {
          closed = true;
          end = i;
          break;
        }
      }
    }
    if (closed && end >= 0) {
      return { start, end, text: raw.slice(start, end + 1) };
    }
    // NOTE: unbalanced opener — skip it and keep scanning for a later span.
    from = start + 1;
  }
  return null;
}

// WHY: `{}` / `[]` JSON.parse successfully, so a leading LLM "example" decoy
// would otherwise win and hide a later real payload.
function isEmptyJsonContainer(value: unknown): boolean {
  if (Array.isArray(value)) return value.length === 0;
  if (value !== null && typeof value === 'object') {
    return Object.keys(value as Record<string, unknown>).length === 0;
  }
  return false;
}

function hasNonWhitespaceAfter(raw: string, from: number): boolean {
  for (let i = from; i < raw.length; i++) {
    const ch = raw[i];
    if (ch !== undefined && !/\s/.test(ch)) return true;
  }
  return false;
}

export function extractBalancedJson(raw: string): string | null {
  let searchFrom = 0;
  while (searchFrom < raw.length) {
    const span = findNextBalancedSpan(raw, searchFrom);
    if (!span) return null;
    try {
      const value: unknown = JSON.parse(span.text);
      // WHY: skip hollow decoys when later text may hold the real JSON.
      if (isEmptyJsonContainer(value) && hasNonWhitespaceAfter(raw, span.end + 1)) {
        searchFrom = span.end + 1;
        continue;
      }
      return span.text;
    } catch {
      searchFrom = span.end + 1;
    }
  }
  return null;
}

// WHY: LLMs often emit raw newlines/tabs inside JSON string values (esp. multi-
// sentence critic feedback) — JSON.parse rejects those; escape in-string only.
export function sanitizeAiJson(s: string): string {
  let out = '';
  let inString = false;
  let escaped = false;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (escaped) { out += ch; escaped = false; continue; }
    if (ch === '\\' && inString) { out += ch; escaped = true; continue; }
    if (ch === '"') { out += ch; inString = !inString; continue; }
    if (inString) {
      if (ch === '\n') { out += '\\n'; continue; }
      if (ch === '\r') { out += '\\r'; continue; }
      if (ch === '\t') { out += '\\t'; continue; }
    }
    out += ch;
  }
  return out;
}

// WHY: writer/critic need every parseable span (not only extractBalancedJson's
// first non-empty) so schema-success hollow shapes can be skipped for a later
// complete candidate instead of falling through to FALLBACK / throw.
export function* walkBalancedJsonCandidates(
  raw: string,
  opts?: { sanitize?: (text: string) => string },
): Generator<{ text: string; value: unknown }> {
  let searchFrom = 0;
  while (searchFrom < raw.length) {
    const span = findNextBalancedSpan(raw, searchFrom);
    if (!span) return;
    const toParse = opts?.sanitize ? opts.sanitize(span.text) : span.text;
    try {
      yield { text: span.text, value: JSON.parse(toParse) as unknown };
    } catch {
      // NOTE: decoy / non-JSON balanced span — resume after it.
    }
    searchFrom = span.end + 1;
  }
}

// WHY: Zod 4.6+ SafeParseError makes `data` optional — requiring `data: T` on
// every branch rejected real ZodObject schemas after the audit bump.
type ParseSchema<T> = {
  parse: (v: unknown) => T;
  safeParse?: (
    v: unknown,
  ) => { success: true; data: T } | { success: false; data?: unknown; error?: unknown };
};

function trySchemaParse<T>(schema: ParseSchema<T>, obj: unknown): T | null {
  if (typeof schema.safeParse === 'function') {
    const result = schema.safeParse(obj);
    return result.success ? result.data : null;
  }
  try {
    return schema.parse(obj);
  } catch {
    return null;
  }
}

export type ParseAIJsonOptions<T> = {
  // WHY: optional/.catch schemas accept hollow shapes — callers (e.g. Content
  // DNA) pass a completeness predicate so we keep walking until a real hit.
  accept?: (parsed: T, rawObj: unknown) => boolean;
  // WHY: same in-string newline/tab escape as writer/critic walks (sanitizeAiJson).
  sanitize?: (text: string) => string;
};

// WHY: parses raw LLM text output (which may include markdown fences or
// leading/trailing prose despite the prompt asking for JSON-only) through a
// Zod schema instead of a bare JSON.parse() + `any` — same untrusted-LLM-JSON
// boundary pattern as agents/critic.ts and agents/writer.ts (see
// schemas/contentResponses.ts's own WHY). Returns null on unparseable JSON so
// callers can 500 with their existing route-specific message.
// WHY: walk every balanced candidate (not only the first) so a leading decoy
// span that JSON.parses but fails the schema (or yields a hollow catch shape)
// does not hide a later valid one.
export function parseAIJson<T>(
  schema: ParseSchema<T>,
  raw: string,
  opts?: ParseAIJsonOptions<T>,
): T | null {
  const sanitize = opts?.sanitize;
  let searchFrom = 0;
  while (searchFrom < raw.length) {
    const span = findNextBalancedSpan(raw, searchFrom);
    if (!span) break;
    let obj: unknown;
    try {
      obj = JSON.parse(sanitize ? sanitize(span.text) : span.text);
    } catch {
      searchFrom = span.end + 1;
      continue;
    }
    const parsed = trySchemaParse(schema, obj);
    if (parsed === null) {
      searchFrom = span.end + 1;
      continue;
    }
    // WHY: optional/.catch schemas accept `{}`/`[]`; keep scanning when hollow.
    if (isEmptyJsonContainer(parsed) && hasNonWhitespaceAfter(raw, span.end + 1)) {
      searchFrom = span.end + 1;
      continue;
    }
    if (opts?.accept && !opts.accept(parsed, obj)) {
      searchFrom = span.end + 1;
      continue;
    }
    return parsed;
  }
  try {
    const obj: unknown = JSON.parse(sanitize ? sanitize(raw) : raw);
    const parsed = trySchemaParse(schema, obj);
    if (parsed === null) return null;
    if (opts?.accept && !opts.accept(parsed, obj)) return null;
    return parsed;
  } catch {
    return null;
  }
}
