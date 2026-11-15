/**
 * isMeaningfulContentDna — hollow DNA must not persist.
 */
import { describe, it, expect } from 'vitest';
import {
  contentDnaSchema,
  isMeaningfulContentDna,
} from '../../src/schemas/agentResponses.js';
import { parseAIJson } from '../../src/lib/contentHelpers.js';

describe('isMeaningfulContentDna', () => {
  it('rejects empty object and all-empty catch defaults', () => {
    expect(isMeaningfulContentDna({})).toBe(false);
    const parsed = contentDnaSchema.parse({});
    expect(isMeaningfulContentDna(parsed)).toBe(false);
  });

  it('accepts a DNA with at least one real string field', () => {
    expect(
      isMeaningfulContentDna({
        hookPattern: 'Question hook',
      }),
    ).toBe(true);
  });

  it('walks past hollow {} to a later meaningful DNA via parseAIJson accept', () => {
    const raw =
      '{}\n{"hookPattern":"Bold claim","avgSentenceWords":12,"keyPhrasePatterns":["here\'s the thing"]}';
    const dna = parseAIJson(contentDnaSchema, raw, {
      accept: (parsed) => isMeaningfulContentDna(parsed),
    });
    expect(dna).toMatchObject({
      hookPattern: 'Bold claim',
      avgSentenceWords: 12,
    });
  });
});
