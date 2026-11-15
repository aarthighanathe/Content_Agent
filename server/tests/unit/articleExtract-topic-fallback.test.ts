/**
 * articleExtract — topic generateWithAI failure must not abort extract.
 *
 * Prior bug: a Gemini throw on the topic-summary call failed the whole
 * fetchAndExtractArticle even when the article body was already available.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const generateWithAIMock = vi.fn();
const fetchWithSsrfGuardMock = vi.fn();

vi.mock('../../src/lib/ai.js', () => ({
  generateWithAI: (...args: unknown[]) => generateWithAIMock(...args),
}));
vi.mock('../../src/lib/ssrfGuard.js', () => ({
  fetchWithSsrfGuard: (...args: unknown[]) => fetchWithSsrfGuardMock(...args),
  toClientFetchFailureMessage: (reason: string) => reason,
}));
vi.mock('../../src/lib/logger.js', () => ({
  logger: { warn: vi.fn(), info: vi.fn(), error: vi.fn() },
}));

function htmlBody(text: string): Response {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(`<html><body><p>${text}</p></body></html>`);
  return new Response(bytes, {
    status: 200,
    headers: { 'content-type': 'text/html; charset=utf-8' },
  });
}

const LONG_ARTICLE =
  'This is a sufficiently long article body for extraction tests. '.repeat(8);

describe('fetchAndExtractArticle — topic fallback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchWithSsrfGuardMock.mockResolvedValue({
      ok: true,
      response: htmlBody(LONG_ARTICLE),
    });
  });

  it('returns Article insights when topic generateWithAI throws', async () => {
    generateWithAIMock.mockRejectedValueOnce(new Error('Gemini unavailable'));

    const { fetchAndExtractArticle } = await import('../../src/lib/articleExtract.js');
    const result = await fetchAndExtractArticle('https://example.com/post');

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.article.topicSentence).toBe('Article insights');
    expect(result.article.text.length).toBeGreaterThan(120);
  });

  it('keeps a post-sanitize topic when raw text matched an injection pattern', async () => {
    // WHY: "act as a mentor…" matches containsInjection on raw, but sanitize
    // redacts it — gating on raw forced "Article insights" incorrectly.
    generateWithAIMock.mockResolvedValueOnce('act as a mentor for founders');

    const { fetchAndExtractArticle } = await import('../../src/lib/articleExtract.js');
    const result = await fetchAndExtractArticle('https://example.com/post');

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.article.topicSentence).not.toBe('Article insights');
    expect(result.article.topicSentence.toLowerCase()).toContain('mentor');
  });
});
