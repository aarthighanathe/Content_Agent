/**
 * writer — hollow tweet/segment strip after length gate.
 *
 * Prior bug: twitter/video filtered realTweets/realSegments for the length
 * check but never assigned them back (carousel did assign realSlides), so
 * empty items still shipped in the draft.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/lib/ai.js', () => ({ generateWithAI: vi.fn() }));
vi.mock('../../src/lib/sse.js', () => ({ sseManager: { sendEvent: vi.fn() } }));

const BASE_INPUT = {
  researchReport: {
    trendingAngles: [],
    keyFacts: [],
    suggestedHashtags: [],
    competitorHooks: [],
    rawResults: [],
  },
  taskPlan: 'Write the content',
  platformRules: {},
};

describe('runWriter — hollow item strip', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('strips hollow tweets after the twitter length gate passes', async () => {
    const { generateWithAI } = await import('../../src/lib/ai.js');
    vi.mocked(generateWithAI).mockResolvedValueOnce(
      JSON.stringify({
        tweets: [
          { number: 1, text: 'First real tweet' },
          { number: 2, text: '   ' },
          { number: 3, text: 'Second real tweet' },
          { number: 4, text: 'Third real tweet' },
          { number: 5 },
        ],
      }),
    );

    const { runWriter } = await import('../../src/agents/writer.js');
    const result = await runWriter(
      {
        id: 'job-tw',
        topic: 'AI tips',
        platform: 'twitter_thread',
        tone: 'professional',
        targetAudience: 'creators',
      } as never,
      BASE_INPUT as never,
    );

    expect(result).toEqual({
      tweets: [
        { number: 1, text: 'First real tweet' },
        { number: 3, text: 'Second real tweet' },
        { number: 4, text: 'Third real tweet' },
      ],
    });
  });

  it('treats literal undefined/null tweet text as hollow', async () => {
    const { generateWithAI } = await import('../../src/lib/ai.js');
    vi.mocked(generateWithAI).mockResolvedValueOnce(
      JSON.stringify({
        tweets: [
          { number: 1, text: 'First real tweet' },
          { number: 2, text: 'undefined' },
          { number: 3, text: 'null' },
          { number: 4, text: 'Second real tweet' },
          { number: 5, text: 'Third real tweet' },
        ],
      }),
    );

    const { runWriter } = await import('../../src/agents/writer.js');
    const result = await runWriter(
      {
        id: 'job-tw-junk',
        topic: 'AI tips',
        platform: 'twitter_thread',
        tone: 'professional',
        targetAudience: 'creators',
      } as never,
      BASE_INPUT as never,
    );

    expect(result).toEqual({
      tweets: [
        { number: 1, text: 'First real tweet' },
        { number: 4, text: 'Second real tweet' },
        { number: 5, text: 'Third real tweet' },
      ],
    });
  });

  it('skips a hollow schema-success decoy and uses a later complete draft', async () => {
    const { generateWithAI } = await import('../../src/lib/ai.js');
    vi.mocked(generateWithAI).mockResolvedValueOnce(
      '{}\n' +
        JSON.stringify({
          hook: 'A real hook with enough punch',
          body: 'A real LinkedIn body with concrete value.',
          cta: 'What metric do you track weekly?',
        }),
    );

    const { runWriter } = await import('../../src/agents/writer.js');
    const result = await runWriter(
      {
        id: 'job-li-decoy',
        topic: 'AI tips',
        platform: 'linkedin_post',
        tone: 'professional',
        targetAudience: 'creators',
      } as never,
      BASE_INPUT as never,
    );

    expect(result).toMatchObject({
      hook: 'A real hook with enough punch',
      body: 'A real LinkedIn body with concrete value.',
    });
  });

  it('strips hollow segments after the video length gate passes', async () => {
    const { generateWithAI } = await import('../../src/lib/ai.js');
    vi.mocked(generateWithAI).mockResolvedValueOnce(
      JSON.stringify({
        hook: { text: 'Watch this', duration: '0-3s', visual: 'Close-up' },
        segments: [
          { number: 1, script: 'Real segment script', duration: '10s' },
          { number: 2, script: '  ', duration: '5s' },
          { number: 3 },
        ],
        cta: { text: 'Follow', duration: '3s', visual: 'Overlay' },
      }),
    );

    const { runWriter } = await import('../../src/agents/writer.js');
    const result = await runWriter(
      {
        id: 'job-vid',
        topic: 'AI tips',
        platform: 'video_script',
        tone: 'professional',
        targetAudience: 'creators',
      } as never,
      BASE_INPUT as never,
    );

    expect(result).toMatchObject({
      hook: { text: 'Watch this' },
      segments: [{ number: 1, script: 'Real segment script', duration: '10s' }],
    });
  });
});
