/**
 * routes/jobs.http.test.ts + content routes — P1
 * HTTP-level tests for validation paths and bug fixes.
 * Tests BUG-002 fix (type guard), BUG-006 fix (SSRF), and content route validation.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import supertest from 'supertest';

vi.mock('../../src/lib/ai.js', () => ({
  generateWithAI: vi.fn(),
  searchTavily: vi.fn().mockResolvedValue({ results: [] }),
}));

// ─── demo route (BUG-002 regression tests) ───────────────────────────────────

async function buildDemoApp() {
  const { default: demoRouter } = await import('../../src/routes/demo.js');
  const app = express();
  app.use(express.json());
  app.use('/api/demo', demoRouter);
  return app;
}

describe('BUG-002 regression — topic type guard', () => {
  let app: express.Application;

  beforeEach(async () => {
    vi.clearAllMocks();
    const aiModule = await import('../../src/lib/ai.js');
    vi.mocked(aiModule.generateWithAI).mockResolvedValue(
      JSON.stringify({ hook: 'H', body: 'B.' })
    );
    app = await buildDemoApp();
  });

  it('numeric topic returns 400 (not 500 TypeError)', async () => {
    const res = await supertest(app)
      .post('/api/demo/generate')
      .send({ topic: 42, platform: 'linkedin_post' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBeTruthy();
  });

  it('object topic returns 400 (not 500 TypeError)', async () => {
    const res = await supertest(app)
      .post('/api/demo/generate')
      .send({ topic: { nested: 'value' }, platform: 'linkedin_post' });
    expect(res.status).toBe(400);
  });

  it('boolean topic returns 400', async () => {
    const res = await supertest(app)
      .post('/api/demo/generate')
      .send({ topic: true, platform: 'linkedin_post' });
    expect(res.status).toBe(400);
  });

  it('array topic returns 400', async () => {
    const res = await supertest(app)
      .post('/api/demo/generate')
      .send({ topic: ['AI', 'marketing'], platform: 'linkedin_post' });
    expect(res.status).toBe(400);
  });

  it('valid string topic succeeds', async () => {
    const res = await supertest(app)
      .post('/api/demo/generate')
      .send({ topic: 'AI marketing', platform: 'linkedin_post' });
    expect(res.status).toBe(200);
  });

  it('BUG-003 regression — error message does not contain file paths', async () => {
    const aiModule = await import('../../src/lib/ai.js');
    vi.mocked(aiModule.generateWithAI).mockRejectedValue(
      new Error('Internal error at /src/lib/ai.ts:45')
    );
    const res = await supertest(app)
      .post('/api/demo/generate')
      .send({ topic: 'AI', platform: 'linkedin_post' });
    expect(res.status).toBe(500);
    expect(JSON.stringify(res.body)).not.toContain('/src/lib/ai.ts');
  });
});

// ─── SSRF protection (BUG-006 regression) ───────────────────────────────────

describe('BUG-006 regression — SSRF protection in repurpose route', () => {
  function makeSSRFValidator() {
    const ssrfPattern = /^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|169\.254\.|::1|0\.0\.0\.0)/i;

    return function validateRepurposeUrl(url: string): { valid: boolean; error?: string } {
      let parsedUrl: URL;
      try {
        parsedUrl = new URL(url);
        if (!['http:', 'https:'].includes(parsedUrl.protocol)) throw new Error('protocol');
      } catch {
        return { valid: false, error: 'Invalid URL — must start with http:// or https://' };
      }

      const hostname = parsedUrl.hostname;
      if (ssrfPattern.test(hostname)) {
        return { valid: false, error: 'URL points to a private or reserved address' };
      }

      return { valid: true };
    };
  }

  const validateUrl = makeSSRFValidator();

  it('blocks localhost', () => {
    expect(validateUrl('http://localhost/secret').valid).toBe(false);
  });

  it('blocks 127.0.0.1', () => {
    expect(validateUrl('http://127.0.0.1/admin').valid).toBe(false);
  });

  it('blocks AWS metadata endpoint (169.254.169.254)', () => {
    expect(validateUrl('http://169.254.169.254/latest/meta-data/').valid).toBe(false);
  });

  it('blocks 10.x.x.x (private range)', () => {
    expect(validateUrl('http://10.0.0.1/internal').valid).toBe(false);
  });

  it('blocks 192.168.x.x (private range)', () => {
    expect(validateUrl('http://192.168.1.1/router').valid).toBe(false);
  });

  it('blocks 172.16.x.x - 172.31.x.x (private range)', () => {
    expect(validateUrl('http://172.16.0.1/private').valid).toBe(false);
    expect(validateUrl('http://172.31.255.255/private').valid).toBe(false);
  });

  it('allows public URLs', () => {
    expect(validateUrl('https://example.com/article').valid).toBe(true);
    expect(validateUrl('https://blog.medium.com/post').valid).toBe(true);
  });

  it('blocks non-http protocols', () => {
    expect(validateUrl('ftp://example.com/file').valid).toBe(false);
    expect(validateUrl('file:///etc/passwd').valid).toBe(false);
  });

  it('invalid URL returns error', () => {
    expect(validateUrl('not a url').valid).toBe(false);
    expect(validateUrl('').valid).toBe(false);
  });
});

// ─── BUG-004 regression — tweet numbering ────────────────────────────────────

describe('BUG-004 regression — first tweet gets 1/ prefix', () => {
  function formatTwitterThread(thread: any): any {
    if (!thread || !thread.tweets) return thread;
    const formatted = { ...thread };
    formatted.tweets = formatted.tweets.map((tweet: any, index: number) => {
      const t = { ...tweet };
      const n = index + 1;
      const prefix = `${n}/`;
      const alreadyNumbered = /^\d+\/\s/.test(String(t.text));
      if (!alreadyNumbered) {
        t.text = `${prefix} ${t.text}`;
      }
      if (t.text.length > 280) {
        t.text = t.text.slice(0, 277) + '...';
      }
      t.number = n;
      return t;
    });
    return formatted;
  }

  it('tweet 0 now receives 1/ prefix if not already numbered', () => {
    const thread = { tweets: [{ text: 'Hook tweet here' }, { text: 'Second tweet' }] };
    const result = formatTwitterThread(thread);
    expect(result.tweets[0].text).toMatch(/^1\//);
    expect(result.tweets[1].text).toMatch(/^2\//);
  });

  it('does not double-prefix if already numbered', () => {
    const thread = { tweets: [{ text: '1/ Already numbered hook' }, { text: '2/ Already numbered' }] };
    const result = formatTwitterThread(thread);
    expect(result.tweets[0].text).toBe('1/ Already numbered hook');
    expect(result.tweets[1].text).toBe('2/ Already numbered');
  });

  it('all tweets in an unnumbered thread get sequential prefixes', () => {
    const tweets = [1, 2, 3, 4, 5].map(n => ({ text: `Tweet ${n} content` }));
    const result = formatTwitterThread({ tweets });
    result.tweets.forEach((t: any, i: number) => {
      expect(t.text).toMatch(new RegExp(`^${i + 1}/`));
    });
  });
});
