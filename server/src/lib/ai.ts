import { GoogleGenerativeAI } from '@google/generative-ai';
import Groq from 'groq-sdk';
import { env } from '../config.js';
import { logger } from './logger.js';

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

function isRateLimitError(error: any): boolean {
  return Boolean(
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
      // doesn't leave the user staring at an infinite spinner
      const geminiCall = model.generateContent(prompt);
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`Gemini timed out after ${timeoutMs / 1000}s`)), timeoutMs)
      );

      const result = await Promise.race([geminiCall, timeoutPromise]);
      const text = result.response.text();

      // Treat empty or near-empty responses as failures so retry/fallback fires
      if (!text || text.trim().length < 10) {
        throw new Error('Gemini returned empty response');
      }

      recordGeminiSuccess();
      return text;
    } catch (error: any) {
      if (isAuthError(error)) {
        console.error('Gemini auth/key error — check GEMINI_API_KEY in .env:', error?.message);
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

      logger.warn('Gemini error', { attempt: attempt + 1, maxRetries, error: error?.message });
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
  } catch (groqError: any) {
    throw new Error(`All AI providers failed. Last error: ${groqError?.message}`, { cause: groqError });
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

      const groqCall = client.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages,
        temperature,
        max_tokens: 8192,
      });

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`Groq timed out after ${timeoutMs / 1000}s`)), timeoutMs)
      );

      const completion = await Promise.race([groqCall, timeoutPromise]);
      const text = completion.choices[0]?.message?.content || '';

      if (!text || text.trim().length < 10) {
        throw new Error('Groq returned empty response');
      }

      return text;
    } catch (err: any) {
      logger.warn('Groq error', { attempt: attempt + 1, maxRetries, error: err?.message });
      if (attempt < maxRetries - 1) {
        await sleep(2000 * (attempt + 1));
        continue;
      }
      throw err;
    }
  }

  throw new Error('Groq exhausted all retries');
}

export async function searchTavily(query: string): Promise<any> {
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

    return await response.json();
  } catch (error) {
    console.warn('Tavily search error:', error);
    return { results: [] };
  }
}
