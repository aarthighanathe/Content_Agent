/**
 * parseAIJson / extractBalancedJson — balanced-brace extraction regression.
 *
 * Prior bug: greedy `/\{[\s\S]*\}/` took from the first `{` to the last `}` in
 * the whole string, so trailing prose or a second object corrupted JSON.parse
 * and returned null for otherwise-valid LLM responses.
 *
 * Follow-up: a leading balanced decoy like `{0-20}` is not valid JSON — must
 * resume after that span and try the next candidate.
 *
 * Residual: empty `{}` / `[]` JSON.parses successfully and optional/.catch
 * schemas accept hollow shapes — must skip when later non-whitespace remains.
 */
import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import {
  extractBalancedJson,
  parseAIJson,
  sanitizeAiJson,
} from '../../src/lib/contentHelpers.js';
import {
  writerCarouselResponseSchema,
  writerLinkedInResponseSchema,
} from '../../src/schemas/agentResponses.js';

const ideaSchema = z.object({
  title: z.string(),
  score: z.number(),
});

describe('parseAIJson — balanced brace extraction', () => {
  it('parses a plain JSON object', () => {
    const result = parseAIJson(ideaSchema, '{"title":"A","score":1}');
    expect(result).toEqual({ title: 'A', score: 1 });
  });

  it('ignores trailing prose after the first balanced object', () => {
    const raw = 'Here you go:\n{"title":"A","score":1}\nThanks! { not json }';
    const result = parseAIJson(ideaSchema, raw);
    expect(result).toEqual({ title: 'A', score: 1 });
  });

  it('skips a leading decoy brace span and parses later JSON', () => {
    const raw = '{0-20}\n{"title":"A","score":1}';
    expect(extractBalancedJson(raw)).toBe('{"title":"A","score":1}');
    expect(parseAIJson(ideaSchema, raw)).toEqual({ title: 'A', score: 1 });
  });

  it('handles braces inside JSON strings without truncating early', () => {
    const raw = '{"title":"Use {curly} wisely","score":2} trailing { junk }';
    const result = parseAIJson(ideaSchema, raw);
    expect(result).toEqual({ title: 'Use {curly} wisely', score: 2 });
  });

  it('handles escaped quotes inside strings', () => {
    const raw = '{"title":"Say \\"hi\\"","score":3}';
    const result = parseAIJson(ideaSchema, raw);
    expect(result).toEqual({ title: 'Say "hi"', score: 3 });
  });

  it('parses a leading JSON array when that is the first structure', () => {
    const arrSchema = z.array(z.object({ id: z.number() }));
    const raw = 'Result: [{"id":1},{"id":2}] and more {ignored}';
    const result = parseAIJson(arrSchema, raw);
    expect(result).toEqual([{ id: 1 }, { id: 2 }]);
  });

  it('returns null on unparseable input', () => {
    expect(parseAIJson(ideaSchema, 'not json at all')).toBeNull();
  });

  it('returns null when schema validation fails for every candidate', () => {
    expect(parseAIJson(ideaSchema, '{"title":1,"score":"x"}')).toBeNull();
  });

  it('skips empty {} decoy and parses later carousel array', () => {
    const raw = 'Example: {}\n[{"headline":"H","body":"B"}]';
    expect(extractBalancedJson(raw)).toBe('[{"headline":"H","body":"B"}]');
    const result = parseAIJson(writerCarouselResponseSchema, raw);
    expect(result).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ headline: 'H', body: 'B' }),
      ]),
    );
    expect(Array.isArray(result) && result.length).toBeGreaterThan(0);
  });

  it('skips empty {} decoy and parses later LinkedIn object', () => {
    const raw = 'note {} then {"hook":"Real hook","body":"Real body here"}';
    expect(extractBalancedJson(raw)).toBe(
      '{"hook":"Real hook","body":"Real body here"}',
    );
    const result = parseAIJson(writerLinkedInResponseSchema, raw);
    expect(result).toEqual(
      expect.objectContaining({
        hook: 'Real hook',
        body: 'Real body here',
      }),
    );
  });

  it('accept predicate skips hollow schema-success and takes later candidate', () => {
    const raw =
      '{"hook":"","body":""}\n{"hook":"Real hook","body":"Real body here"}';
    const result = parseAIJson(writerLinkedInResponseSchema, raw, {
      accept: (parsed) => {
        const hook = typeof parsed.hook === 'string' ? parsed.hook.trim() : '';
        const body = typeof parsed.body === 'string' ? parsed.body.trim() : '';
        return hook.length > 0 && body.length > 0;
      },
    });
    expect(result).toEqual(
      expect.objectContaining({
        hook: 'Real hook',
        body: 'Real body here',
      }),
    );
  });

  it('sanitize hook recovers JSON with raw newlines inside strings', () => {
    const raw = '{"hook":"line one\nline two","body":"Real body here"}';
    expect(parseAIJson(writerLinkedInResponseSchema, raw)).toBeNull();
    const result = parseAIJson(writerLinkedInResponseSchema, raw, {
      sanitize: sanitizeAiJson,
    });
    expect(result).toEqual(
      expect.objectContaining({
        hook: 'line one\nline two',
        body: 'Real body here',
      }),
    );
  });
});

describe('sanitizeAiJson', () => {
  it('escapes raw newlines/tabs inside strings so JSON.parse succeeds', () => {
    const raw = '{"feedback":"First.\nSecond.\tThird."}';
    expect(() => JSON.parse(raw)).toThrow();
    const sanitized = sanitizeAiJson(raw);
    expect(JSON.parse(sanitized)).toEqual({ feedback: 'First.\nSecond.\tThird.' });
  });
});
