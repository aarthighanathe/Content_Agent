import { describe, it, expect } from 'vitest';
import { parseContentForPlatform } from '../../src/schemas/jobs.js';

describe('parseContentForPlatform', () => {
  it('accepts a minimal carousel slide array', () => {
    const result = parseContentForPlatform('instagram_carousel', [
      { headline: 'Hello', body: 'World' },
    ]);
    expect(result.ok).toBe(true);
  });

  it('rejects a non-array for carousel', () => {
    const result = parseContentForPlatform('instagram_carousel', { headline: 'nope' });
    expect(result.ok).toBe(false);
  });

  it('accepts linkedin shape', () => {
    const result = parseContentForPlatform('linkedin_post', {
      hook: 'Hook',
      body: 'Body text',
      cta: 'Follow',
    });
    expect(result.ok).toBe(true);
  });

  it('requires tweets[] for twitter', () => {
    const bad = parseContentForPlatform('twitter_thread', { body: 'x' });
    expect(bad.ok).toBe(false);
    const good = parseContentForPlatform('twitter_thread', {
      tweets: [{ text: 'First tweet' }],
    });
    expect(good.ok).toBe(true);
  });
});
