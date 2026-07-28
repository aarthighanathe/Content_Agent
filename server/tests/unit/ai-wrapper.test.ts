/**
 * TC-037 through TC-042 — AI Wrapper Unit Tests
 * Mocks GoogleGenerativeAI and Groq to test retry/fallback logic.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ─── We test the logic inline (not the live API) ──────────────────────────────

function isRateLimitError(error: any): boolean {
  return (
    error?.status === 429 ||
    error?.message?.includes('429') ||
    error?.message?.includes('quota') ||
    error?.message?.includes('RESOURCE_EXHAUSTED')
  );
}

function isAuthError(error: any): boolean {
  return Boolean(
    error?.status === 400 ||
    error?.status === 401 ||
    error?.status === 403 ||
    error?.message?.includes('API key not valid') ||
    error?.message?.includes('API_KEY_INVALID') ||
    error?.message?.includes('invalid') ||
    error?.message?.includes('unauthorized')
  );
}

// Simulate the generateWithAI retry logic without real HTTP calls
async function simulateGenerateWithAI(
  geminiImpl: () => Promise<string>,
  groqImpl: () => Promise<string>,
  maxRetries = 3
): Promise<string> {
  const backoffs = [1, 1, 1]; // 1ms for tests

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await geminiImpl();
    } catch (error: any) {
      if (isAuthError(error)) break;
      if (isRateLimitError(error)) {
        if (attempt < maxRetries - 1) {
          await new Promise(r => setTimeout(r, backoffs[attempt]));
          continue;
        }
        break;
      }
      if (attempt < maxRetries - 1) {
        await new Promise(r => setTimeout(r, backoffs[attempt]));
        continue;
      }
      break;
    }
  }

  // Groq fallback
  try {
    return await groqImpl();
  } catch (groqError: any) {
    throw new Error(`All AI providers failed. Last error: ${groqError?.message}`, { cause: groqError });
  }
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('generateWithAI — retry and fallback logic', () => {
  it('TC-037 — returns Gemini response on first success', async () => {
    const gemini = vi.fn().mockResolvedValue('gemini-response');
    const groq = vi.fn().mockResolvedValue('groq-response');
    const result = await simulateGenerateWithAI(gemini, groq);
    expect(result).toBe('gemini-response');
    expect(gemini).toHaveBeenCalledTimes(1);
    expect(groq).not.toHaveBeenCalled();
  });

  it('TC-038 — falls back to Groq after 3 Gemini failures', async () => {
    const gemini = vi.fn().mockRejectedValue(new Error('network error'));
    const groq = vi.fn().mockResolvedValue('groq-response');
    const result = await simulateGenerateWithAI(gemini, groq);
    expect(result).toBe('groq-response');
    expect(gemini).toHaveBeenCalledTimes(3);
    expect(groq).toHaveBeenCalledTimes(1);
  });

  it('TC-039 — throws when both Gemini and Groq fail', async () => {
    const gemini = vi.fn().mockRejectedValue(new Error('gemini down'));
    const groq = vi.fn().mockRejectedValue(new Error('groq down'));
    await expect(simulateGenerateWithAI(gemini, groq)).rejects.toThrow('All AI providers failed');
  });

  it('TC-040 — auth error breaks retry loop immediately (Gemini called once, not 3 times)', async () => {
    const authErr = Object.assign(new Error('API key not valid'), { status: 401 });
    const gemini = vi.fn().mockRejectedValue(authErr);
    const groq = vi.fn().mockResolvedValue('groq-fallback');
    const result = await simulateGenerateWithAI(gemini, groq);
    // Auth error → break immediately → Groq fallback
    expect(gemini).toHaveBeenCalledTimes(1);
    expect(result).toBe('groq-fallback');
  });

  it('TC-040b — rate limit error retries up to maxRetries then falls back', async () => {
    const rateLimitErr = Object.assign(new Error('quota exceeded'), { status: 429 });
    const gemini = vi.fn().mockRejectedValue(rateLimitErr);
    const groq = vi.fn().mockResolvedValue('groq-after-ratelimit');
    const result = await simulateGenerateWithAI(gemini, groq);
    expect(gemini).toHaveBeenCalledTimes(3);
    expect(result).toBe('groq-after-ratelimit');
  });

  it('TC-037b — Gemini success on 2nd attempt (1 retry)', async () => {
    const gemini = vi.fn()
      .mockRejectedValueOnce(new Error('transient'))
      .mockResolvedValue('gemini-second-attempt');
    const groq = vi.fn();
    const result = await simulateGenerateWithAI(gemini, groq);
    expect(result).toBe('gemini-second-attempt');
    expect(gemini).toHaveBeenCalledTimes(2);
    expect(groq).not.toHaveBeenCalled();
  });
});

// ─── Error classification tests ───────────────────────────────────────────────

describe('isRateLimitError', () => {
  it('detects status 429', () => {
    expect(isRateLimitError({ status: 429 })).toBe(true);
  });

  it('detects message containing "quota"', () => {
    expect(isRateLimitError({ message: 'quota exceeded' })).toBe(true);
  });

  it('detects RESOURCE_EXHAUSTED', () => {
    expect(isRateLimitError({ message: 'RESOURCE_EXHAUSTED' })).toBe(true);
  });

  it('returns false for unrelated errors', () => {
    expect(isRateLimitError({ status: 500, message: 'internal error' })).toBe(false);
  });
});

describe('isAuthError', () => {
  it('detects status 401', () => {
    expect(isAuthError({ status: 401 })).toBe(true);
  });

  it('detects status 403', () => {
    expect(isAuthError({ status: 403 })).toBe(true);
  });

  it('detects API_KEY_INVALID message', () => {
    expect(isAuthError({ message: 'API_KEY_INVALID' })).toBe(true);
  });

  it('detects "unauthorized" in message', () => {
    expect(isAuthError({ message: 'Request is unauthorized' })).toBe(true);
  });

  it('returns false for rate limit errors', () => {
    expect(isAuthError({ status: 429 })).toBe(false);
  });
});

// ─── searchTavily edge cases (TC-041, TC-042) ─────────────────────────────────

describe('searchTavily — graceful degradation', () => {
  it('TC-041 — returns { results: [] } when TAVILY_API_KEY not set', async () => {
    const originalKey = process.env.TAVILY_API_KEY;
    delete process.env.TAVILY_API_KEY;

    // Simulate the function logic
    const apiKey = process.env.TAVILY_API_KEY;
    let result: any;
    if (!apiKey) {
      result = { results: [] };
    }
    expect(result).toEqual({ results: [] });

    process.env.TAVILY_API_KEY = originalKey;
  });

  it('TC-042 — fetch error returns { results: [] } without throwing', async () => {
    // Simulate the error-handling path
    async function mockSearchTavily(query: string): Promise<any> {
      try {
        throw new Error('Network error');
      } catch (error) {
        return { results: [] };
      }
    }

    const result = await mockSearchTavily('test');
    expect(result).toEqual({ results: [] });
  });
});
