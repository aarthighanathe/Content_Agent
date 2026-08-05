/**
 * lib/ai.ts — AbortController-on-timeout regression test.
 *
 * Prior bug: generateWithAI's Gemini and Groq call paths raced the SDK call
 * against a timeout Promise via Promise.race(), but never wired an
 * AbortController into the SDK call itself. Promise.race only stops the
 * caller from *waiting* on the loser — it doesn't cancel the underlying
 * outbound HTTP request, which kept running in the background. Under
 * sustained provider slowness, this compounded across the retry loop (up to
 * 3 Gemini attempts + 2 Groq attempts) and BullMQ's concurrency of 2,
 * leaking sockets/file descriptors instead of actually stopping the wasted
 * work at the intended timeout boundary.
 *
 * This suite imports and calls the REAL generateWithAI() (mocking only the
 * two SDK constructors), so it fails if the abort wiring regresses — not
 * just a local transcription of the retry logic.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/config.js', () => ({
  env: {
    GEMINI_API_KEY: 'test-gemini-key',
    GROQ_API_KEY: 'test-groq-key',
    NODE_ENV: 'test',
  },
}));
vi.mock('../../src/lib/logger.js', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

const generateContentMock = vi.fn();
const groqCreateMock = vi.fn();

vi.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: vi.fn().mockImplementation(function GoogleGenerativeAIMock(this: any) {
    this.getGenerativeModel = vi.fn().mockReturnValue({
      generateContent: generateContentMock,
    });
  }),
}));

vi.mock('groq-sdk', () => ({
  default: vi.fn().mockImplementation(function GroqMock(this: any) {
    this.chat = { completions: { create: groqCreateMock } };
  }),
}));

// A promise that never resolves/rejects on its own — simulates a hung SDK
// call whose only way out is the timeout branch's abort().
function neverSettles<T>(onAbort?: (reason: unknown) => void, signal?: AbortSignal): Promise<T> {
  return new Promise((_resolve, reject) => {
    signal?.addEventListener('abort', () => {
      onAbort?.(signal.reason);
      reject(Object.assign(new Error('The operation was aborted'), { name: 'AbortError' }));
    });
  });
}

describe('generateWithAI — AbortController wired into timeout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  it('Gemini: aborts the in-flight request when the call exceeds timeoutMs', async () => {
    let capturedSignal: AbortSignal | undefined;
    generateContentMock.mockImplementation((_prompt: string, opts: { signal?: AbortSignal }) => {
      capturedSignal = opts?.signal;
      return neverSettles(undefined, opts?.signal);
    });

    const { generateWithAI } = await import('../../src/lib/ai.js');

    await expect(
      generateWithAI('test prompt', undefined, { timeoutMs: 20 }),
    ).rejects.toThrow();

    // The signal actually passed into the SDK call must be the one that got aborted —
    // proves the fix threads AbortController.signal into generateContent(), not just
    // rejecting a local timeout promise alongside an uncancelled request.
    expect(capturedSignal).toBeDefined();
    expect(capturedSignal?.aborted).toBe(true);
  }, 10_000);

  it('Groq: aborts the in-flight request when the call exceeds timeoutMs', async () => {
    let capturedSignal: AbortSignal | undefined;
    // Force the Gemini path to fail fast (auth error breaks the retry loop
    // immediately) so the test reaches the Groq fallback quickly.
    generateContentMock.mockRejectedValue(Object.assign(new Error('API key not valid'), { status: 401 }));
    groqCreateMock.mockImplementation((_body: unknown, opts: { signal?: AbortSignal }) => {
      capturedSignal = opts?.signal;
      return neverSettles(undefined, opts?.signal);
    });

    const { generateWithAI } = await import('../../src/lib/ai.js');

    await expect(
      generateWithAI('test prompt', undefined, { timeoutMs: 20 }),
    ).rejects.toThrow('All AI providers failed');

    expect(capturedSignal).toBeDefined();
    expect(capturedSignal?.aborted).toBe(true);
  }, 10_000);

  it('Gemini: does NOT abort when the call completes before the timeout', async () => {
    let capturedSignal: AbortSignal | undefined;
    generateContentMock.mockImplementation((_prompt: string, opts: { signal?: AbortSignal }) => {
      capturedSignal = opts?.signal;
      return Promise.resolve({ response: { text: () => 'a real generated response' } });
    });

    const { generateWithAI } = await import('../../src/lib/ai.js');
    const result = await generateWithAI('test prompt', undefined, { timeoutMs: 5000 });

    expect(result).toBe('a real generated response');
    expect(capturedSignal?.aborted).toBe(false);
  });
});
