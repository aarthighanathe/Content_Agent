/**
 * agents/critic.ts — buildContentSummary per-platform branch tests (real module).
 *
 * WHY this suite exists: each of the 5 format branches (carousel, twitter,
 * instagram_caption, video_script, linkedin/default) truncates/labels content
 * differently before it's spliced into the critic's scoring prompt — none of
 * these string-shaping branches were asserted anywhere. A regression here
 * degrades what the critic LLM actually sees for that platform, silently
 * lowering real quality scores in a way that fails "softly" and is hard to
 * notice without a direct test.
 */
import { describe, it, expect, vi } from 'vitest';

// WHY mocked: critic.ts imports lib/ai.ts (for generateWithAI), which
// validates the full env schema at module load — none of that is exercised
// by buildContentSummary's own pure string-formatting logic.
vi.mock('../../src/config.js', () => ({
  env: { GEMINI_API_KEY: 'test-key', GROQ_API_KEY: 'test-key', NODE_ENV: 'test' },
}));
vi.mock('../../src/lib/sse.js', () => ({ sseManager: { sendEvent: vi.fn() } }));

const { buildContentSummary } = await import('../../src/agents/critic.js');

describe('buildContentSummary (real module)', () => {
  it('carousel (array content): labels each slide by type/index and truncates headline/body', () => {
    const slides = [
      { type: 'cover', headline: 'A'.repeat(200), body: 'B'.repeat(200) },
      { type: 'content', headline: 'Second slide', body: 'Second body' },
    ];
    const summary = buildContentSummary(slides, 'instagram_carousel');

    expect(summary).toContain('[COVER 1]');
    expect(summary).toContain('[CONTENT 2]');
    // Headline truncated to 120 chars, body to 150.
    const firstLine = summary.split('\n')[0];
    expect(firstLine).toContain('A'.repeat(120));
    expect(firstLine).not.toContain('A'.repeat(121));
  });

  it('carousel content caps at 8 slides even if more are provided', () => {
    const slides = Array.from({ length: 10 }, (_, i) => ({ type: 'content', headline: `Slide ${i}`, body: 'b' }));
    const summary = buildContentSummary(slides, 'instagram_carousel');
    expect(summary.split('\n')).toHaveLength(8);
  });

  it('twitter_thread: formats each tweet with its number and truncates text to 280 chars', () => {
    const content = { tweets: [{ number: 1, text: 'T'.repeat(300) }, { number: 2, text: 'short' }] };
    const summary = buildContentSummary(content, 'twitter_thread');

    expect(summary).toContain('Tweet 1: ' + 'T'.repeat(280));
    expect(summary).toContain('Tweet 2: short');
  });

  it('twitter_thread with a non-array tweets field falls through to the LinkedIn/default branch', () => {
    const content = { tweets: 'not-an-array', hook: 'H', body: 'B', cta: 'C' };
    const summary = buildContentSummary(content, 'twitter_thread');
    expect(summary).toContain('Hook: H');
  });

  it('instagram_caption: includes caption (truncated to 300) and up to 10 hashtags', () => {
    const content = { caption: 'C'.repeat(400), hashtags: Array.from({ length: 15 }, (_, i) => `#tag${i}`) };
    const summary = buildContentSummary(content, 'instagram_caption');

    expect(summary).toContain('Caption: ' + 'C'.repeat(300));
    const hashtagLine = summary.split('\n')[1];
    // WHY slice(9): "Hashtags: #tag0 #tag1 ..." — drop the "Hashtags:" label
    // token itself before counting the actual hashtag entries.
    expect(hashtagLine.replace('Hashtags: ', '').split(' ')).toHaveLength(10);
  });

  it('video_script: includes a JSON-stringified hook and up to 3 segment scripts truncated to 100 chars', () => {
    const content = {
      hook: { text: 'Hook text', duration: '0-3s' },
      segments: [
        { script: 'S'.repeat(150) },
        { script: 'second segment' },
        { script: 'third segment' },
        { script: 'fourth segment (should be dropped)' },
      ],
    };
    const summary = buildContentSummary(content, 'video_script');

    expect(summary).toContain(JSON.stringify(content.hook));
    expect(summary).toContain('S'.repeat(100));
    expect(summary).not.toContain('fourth segment');
  });

  it('linkedin_post (and any other platform): includes hook/body/cta each truncated to their own limit', () => {
    const content = { hook: 'H'.repeat(200), body: 'B'.repeat(400), cta: 'C'.repeat(150) };
    const summary = buildContentSummary(content, 'linkedin_post');

    expect(summary).toContain('Hook: ' + 'H'.repeat(150));
    expect(summary).toContain('Body: ' + 'B'.repeat(300));
    expect(summary).toContain('CTA: ' + 'C'.repeat(100));
  });

  it('an unrecognized platform falls back to the LinkedIn/default hook-body-cta shape', () => {
    const content = { hook: 'H', body: 'B', cta: 'C' };
    const summary = buildContentSummary(content, 'some_future_platform');
    expect(summary).toBe('Hook: H\nBody: B\nCTA: C');
  });

  it('null/non-object content degrades to empty-string fields rather than throwing', () => {
    expect(() => buildContentSummary(null, 'linkedin_post')).not.toThrow();
    expect(buildContentSummary(null, 'linkedin_post')).toBe('Hook: \nBody: \nCTA: ');
  });
});
