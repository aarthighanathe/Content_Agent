import { GoogleGenerativeAI } from '@google/generative-ai';
import Groq from 'groq-sdk';
import { env } from '../config.js';
import { logger } from './logger.js';

// WHY exported here: agents/researcher.ts reads searchTavily's response shape
// directly — this type lets that file use the real shape instead of `any`.
export interface TavilySearchResult {
  url?: string;
  content?: string;
  title?: string;
  score?: number;
}

export interface TavilySearchResponse {
  results: TavilySearchResult[];
}

let genAI: GoogleGenerativeAI | null = null;
let groq: Groq | null = null;

function getGemini(): GoogleGenerativeAI {
  if (!genAI) {
    const key = env.GEMINI_API_KEY;
    if (!key) throw new Error('GEMINI_API_KEY not set');
    genAI = new GoogleGenerativeAI(key);
  }
  return genAI;
}

function getGroq(): Groq {
  if (!groq) {
    const key = env.GROQ_API_KEY;
    if (!key) throw new Error('GROQ_API_KEY not set');
    groq = new Groq({ apiKey: key });
  }
  return groq;
}

// WHY unknown + a local shape read, not a specific SDK error class: this function
// classifies errors from BOTH Gemini (@google/generative-ai, which embeds status
// codes in the message text, e.g. "[429 Too Many Requests]") and Groq
// (groq-sdk's APIError, which has a real numeric .status) — no single imported
// error class covers both, so a duck-typed read of optional .status/.message
// fields is the honest common denominator rather than a false-precision cast to
// either SDK's specific type.
function getErrorStatus(error: unknown): number | undefined {
  if (error && typeof error === 'object' && 'status' in error && typeof error.status === 'number') {
    return error.status;
  }
  return undefined;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
    return error.message;
  }
  return String(error);
}

function isRateLimitError(error: unknown): boolean {
  const message = getErrorMessage(error);
  return Boolean(
    getErrorStatus(error) === 429 ||
    message.includes('429') ||
    message.includes('quota') ||
    message.includes('RESOURCE_EXHAUSTED')
  );
}

function isAuthError(error: unknown): boolean {
  const status = getErrorStatus(error);
  const message = getErrorMessage(error);
  return Boolean(
    status === 400 ||
    status === 401 ||
    status === 403 ||
    message.includes('API key not valid') ||
    message.includes('API_KEY_INVALID') ||
    message.includes('invalid') ||
    message.includes('unauthorized')
  );
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

// Simple circuit breaker for Gemini to avoid hammering a failing service
let geminiFailCount = 0;
let geminiCircuitOpenUntil = 0;

function recordGeminiSuccess() {
  geminiFailCount = 0;
}

function recordGeminiFailure() {
  geminiFailCount++;
  if (geminiFailCount >= 5) {
    geminiCircuitOpenUntil = Date.now() + 60_000; // open for 1 minute
    geminiFailCount = 0;
    console.warn('[Circuit Breaker] Gemini circuit opened — routing to Groq for 60s');
  }
}

export interface GenerateOptions {
  /** Lower temperature (0.3-0.5) for structured output like HTML/JSON. Default 0.9. */
  temperature?: number;
  /** Hard timeout in ms. Default 90 000ms. */
  timeoutMs?: number;
}

export async function generateWithAI(
  prompt: string,
  systemPrompt?: string,
  options: GenerateOptions = {}
): Promise<string> {
  const { temperature = 0.9, timeoutMs = 90_000 } = options;
  const maxRetries = 3;
  const backoffs   = [1000, 2000, 4000];

  // Skip Gemini if circuit breaker is open
  if (Date.now() < geminiCircuitOpenUntil) {
    logger.warn('[Circuit Breaker] Gemini circuit open — routing directly to Groq');
    return generateWithGroq(prompt, systemPrompt, { temperature, timeoutMs });
  }

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const ai = getGemini();

      // Use systemInstruction when provided so the model receives hard rules
      // in the system role and the user prompt as the creative brief — this
      // prevents long system prompts from drowning out shorter user prompts.
      const model = ai.getGenerativeModel({
        model: 'gemini-2.0-flash',
        ...(systemPrompt ? { systemInstruction: systemPrompt } : {}),
        generationConfig: { temperature, topP: 0.95 },
      });

      // Race the API call against a hard timeout so a hanging request
      // doesn't leave the user staring at an infinite spinner. The
      // AbortController is what actually stops the outbound HTTP request on
      // timeout — without it, Promise.race only stops *waiting* for the
      // loser, it doesn't cancel it, so the request kept running in the
      // background under sustained provider slowness (compounding
      // socket/fd pressure across retries and concurrent jobs).
      const abortController = new AbortController();
      const geminiCall = model.generateContent(prompt, { signal: abortController.signal });
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => {
          abortController.abort();
          reject(new Error(`Gemini timed out after ${timeoutMs / 1000}s`));
        }, timeoutMs)
      );

      const result = await Promise.race([geminiCall, timeoutPromise]);
      const text = result.response.text();

      // Treat empty or near-empty responses as failures so retry/fallback fires
      if (!text || text.trim().length < 10) {
        throw new Error('Gemini returned empty response');
      }

      recordGeminiSuccess();
      return text;
    } catch (error: unknown) {
      if (isAuthError(error)) {
        console.error('Gemini auth/key error — check GEMINI_API_KEY in .env:', getErrorMessage(error));
        recordGeminiFailure();
        break; // no point retrying an invalid key
      }

      if (isRateLimitError(error)) {
        if (attempt < maxRetries - 1) {
          const wait = backoffs[attempt];
          logger.warn('Gemini rate limit — retrying', { attempt: attempt + 1, maxRetries, waitMs: wait });
          await sleep(wait);
          continue;
        }
        logger.warn('Gemini rate limit exhausted after retries, falling back to Groq');
        recordGeminiFailure();
        break;
      }

      logger.warn('Gemini error', { attempt: attempt + 1, maxRetries, error: getErrorMessage(error) });
      recordGeminiFailure();
      if (attempt < maxRetries - 1) {
        await sleep(backoffs[attempt]);
        continue;
      }
      break;
    }
  }

  // Groq fallback
  try {
    return await generateWithGroq(prompt, systemPrompt, { temperature, timeoutMs });
  } catch (groqError: unknown) {
    throw new Error(`All AI providers failed. Last error: ${getErrorMessage(groqError)}`, { cause: groqError });
  }
}

async function generateWithGroq(
  prompt: string,
  systemPrompt?: string,
  options: GenerateOptions = {}
): Promise<string> {
  const { temperature = 0.7, timeoutMs = 60_000 } = options;
  const client = getGroq();
  const maxRetries = 2;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const messages: Array<{ role: 'system' | 'user'; content: string }> = [];
      if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
      messages.push({ role: 'user', content: prompt });

      // See the matching comment in generateWithAI's Gemini call — the
      // AbortController is what actually cancels the outbound HTTP request
      // on timeout, not just the local wait for it.
      const abortController = new AbortController();
      const groqCall = client.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages,
        temperature,
        max_tokens: 8192,
      }, { signal: abortController.signal });

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => {
          abortController.abort();
          reject(new Error(`Groq timed out after ${timeoutMs / 1000}s`));
        }, timeoutMs)
      );

      const completion = await Promise.race([groqCall, timeoutPromise]);
      const text = completion.choices[0]?.message?.content || '';

      if (!text || text.trim().length < 10) {
        throw new Error('Groq returned empty response');
      }

      return text;
    } catch (err: unknown) {
      logger.warn('Groq error', { attempt: attempt + 1, maxRetries, error: getErrorMessage(err) });
      if (attempt < maxRetries - 1) {
        await sleep(2000 * (attempt + 1));
        continue;
      }
      throw err;
    }
  }

  throw new Error('Groq exhausted all retries');
}

export async function searchTavily(query: string): Promise<TavilySearchResponse> {
  const apiKey = env.TAVILY_API_KEY;
  if (!apiKey) {
    console.warn('TAVILY_API_KEY not set, skipping search');
    return { results: [] };
  }

  try {
    const response = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: apiKey,
        query,
        search_depth: 'basic',
        max_results: 5,
      }),
    });

    if (!response.ok) {
      console.warn('Tavily search failed:', response.status);
      return { results: [] };
    }

    // WHY a shape check here (not a cast): response.json() is typed
    // Promise<unknown> (Node's global fetch typings, not the DOM lib's looser
    // Promise<any>) — an honest boundary to an external API response, same class
    // as the LLM-response parsing this pass has been adding runtime checks to
    // throughout. A malformed/unexpected Tavily response degrades to the same
    // empty-results shape every other failure path in this function already uses.
    const data: unknown = await response.json();
    if (data && typeof data === 'object' && Array.isArray((data as { results?: unknown }).results)) {
      return data as TavilySearchResponse;
    }
    return { results: [] };
  } catch (error) {
    console.warn('Tavily search error:', error);
    return { results: [] };
  }
}
