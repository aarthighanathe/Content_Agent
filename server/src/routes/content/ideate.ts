import * as Sentry from '@sentry/node';
import { Router, Response } from 'express';
import { eq, and } from 'drizzle-orm';
import { AuthRequest } from '../../middleware/auth.js';
import { generateWithAI, searchTavily, type TavilySearchResult } from '../../lib/ai.js';
import { getUserProfile } from '../users.js';
import { db } from '../../db/index.js';
import { competitorAnalyses } from '../../db/schema.js';
import { isValidUUID } from '../../lib/uuid.js';
import { logger } from '../../lib/logger.js';
import {
  parseBody,
  ideateSchema,
  ideateResponseSchema,
  regenerateIdeaSchema,
  regenerateIdeaResponseSchema,
  competitorResponseSchema,
} from '../../schemas/index.js';
import { parseAIJson } from './shared.js';

const router = Router();

// SECURITY: same prompt-injection neutralization used elsewhere on untrusted
// web text before it reaches a Gemini prompt (competitor.ts's
// sanitizeSearchText, researcher.ts's overall pattern).
function sanitizeSearchText(value: string): string {
  return value
    .replace(/ignore\s+(?:previous|all|prior)\s+instructions?/gi, '[content removed]')
    .replace(/system\s*(?:prompt|instructions?)/gi, '[content removed]');
}

// I2: ground ideation in real Tavily search results instead of pure LLM
// guessing — same tolerant Promise.allSettled pattern as researcher.ts/
// competitor.ts. Returns both a prompt-ready text block AND the raw results
// (so the prompt can be told to cite a specific sourceUrl per idea for I3).
async function buildTrendContext(
  industry: string,
  focusTopic: string | undefined,
  brandName: string,
): Promise<{ text: string; results: TavilySearchResult[] }> {
  const queries = [
    `trending ${industry} content ideas 2026`,
    focusTopic ? `${focusTopic} trends and news` : `${industry} industry news and trends`,
    `${brandName !== 'your brand' ? brandName + ' ' : ''}${industry} audience interests`,
  ];

  const searchResults = await Promise.allSettled(queries.map((q) => searchTavily(q)));
  const allResults: TavilySearchResult[] = [];
  for (const outcome of searchResults) {
    if (outcome.status === 'fulfilled' && outcome.value?.results) {
      allResults.push(...outcome.value.results);
    } else if (outcome.status === 'rejected') {
      console.warn('[ideate] A parallel search failed (continuing):', outcome.reason);
    }
  }

  const text = allResults
    .slice(0, 8)
    .map((r) => {
      const title = r.title ? sanitizeSearchText(r.title) : '';
      const content = r.content ? sanitizeSearchText(r.content).slice(0, 300) : '';
      const url = r.url || '';
      return [title, content, url ? `(source: ${url})` : ''].filter(Boolean).join(' — ');
    })
    .filter((line) => line.length > 0)
    .join('\n')
    .slice(0, 3000);

  return { text, results: allResults };
}

// I5: loads a past competitor analysis's contentGaps/suggestedAngles for the
// requesting user (ownership-checked) — same loader pattern as
// routes/jobs/create.ts's loadOwnedCompetitorContext, duplicated rather than
// shared because that one lives under routes/jobs/ and importing across
// route-group boundaries for a two-query helper isn't worth the coupling.
async function loadCompetitorGapContext(analysisId: string, userId: string): Promise<string | null> {
  if (!db || !isValidUUID(userId)) return null;
  try {
    const row = await db.query.competitorAnalyses.findFirst({
      where: and(
        eq(competitorAnalyses.id, analysisId),
        eq(competitorAnalyses.userId, userId),
        eq(competitorAnalyses.deleted, 0),
      ),
    });
    if (!row) return null;
    const parsed = competitorResponseSchema.safeParse(row.analysis);
    if (!parsed.success) return null;

    const gaps = (parsed.data.contentGaps || [])
      .map((g) => [g.gap, g.opportunity].filter(Boolean).join(': '))
      .filter(Boolean);
    const angles = (parsed.data.suggestedAngles || [])
      .map((a) => [a.angle, a.rationale].filter(Boolean).join(': '))
      .filter(Boolean);
    const combined = [...gaps, ...angles].slice(0, 6).join('\n');
    return combined || null;
  } catch (err) {
    logger.warn('[ideate] Failed to load competitor analysis context (non-fatal)', {
      analysisId, error: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}

const IDEA_JSON_SHAPE = `{
      "title": "<specific topic title>",
      "platform": "<platform_id>",
      "angle": "<unique angle or hook>",
      "why": "<one sentence why this will perform well — must reference something concrete from the trend context below if any is provided, not generic reasoning>",
      "sourceUrl": "<the exact source URL from the trend context this idea was grounded in, or omit if none applies>",
      "prediction": { "tier": "high|medium|low", "topReason": "<one short phrase — the single biggest driver of this tier estimate>" }
    }`;

// POST /api/content/ideate — generate topic ideas based on user brand/industry
router.post('/ideate', async (req: AuthRequest, res: Response) => {
  try {
    const body = parseBody(ideateSchema, req.body, res);
    if (!body) return;
    const userId = req.dbUserId || req.userId || 'demo';
    const profile = await getUserProfile(userId);
    const { count, focusTopic, competitorAnalysisId } = body;

    const industry = profile.industry || 'content creation';
    const brandVoice = profile.brandVoice || 'professional';
    const brandName = profile.brandName || 'your brand';

    // I2: real trend grounding, parallel with I5's competitor-gap lookup
    // (independent data sources — no reason to serialize them).
    const [trendOutcome, competitorGapOutcome] = await Promise.allSettled([
      buildTrendContext(industry, focusTopic, brandName),
      competitorAnalysisId ? loadCompetitorGapContext(competitorAnalysisId, userId) : Promise.resolve(null),
    ]);
    const trendContext = trendOutcome.status === 'fulfilled' ? trendOutcome.value.text : '';
    const competitorGapContext = competitorGapOutcome.status === 'fulfilled' ? competitorGapOutcome.value : null;

    // SECURITY: focusTopic is free-form user input; wrap in XML delimiters rather than
    // splicing it into the instruction text directly, per the prompt-injection mitigation
    // used everywhere else user text reaches an LLM prompt in this codebase.
    const focusSection = focusTopic
      ? `\nThe user wants ideas focused specifically on this theme:\n<user_focus>${focusTopic}</user_focus>\n`
      : '';
    const trendSection = trendContext
      ? `\n<trend_context>Recent web search results — ground your ideas in these where relevant, and cite the matching source URL in "sourceUrl":\n${trendContext}</trend_context>\n`
      : '';
    // I5: competitor-gap mode blends (not replaces) brand-profile generation —
    // present as additional inspiration, not the sole basis for every idea.
    const competitorSection = competitorGapContext
      ? `\n<competitor_gaps>A past competitor analysis found these content gaps/angles — use them as inspiration for some (not necessarily all) of the ideas:\n${competitorGapContext}</competitor_gaps>\n`
      : '';

    const prompt = `You are a content strategist. Generate ${count} fresh, trending topic ideas.

<industry>${industry}</industry>
<brand_name>${brandName}</brand_name>
<brand_voice>${brandVoice}</brand_voice>
${focusSection}${trendSection}${competitorSection}
For each idea:
- Topic title: specific and scroll-stopping (not generic)
- Best platform: instagram_carousel, linkedin_post, twitter_thread, instagram_caption, or video_script
- Unique angle or hook that differentiates this idea
- One sentence explaining why it will perform well for this audience — ground this in the trend context above when one is provided (a real recent event/stat/trend), not generic reasoning
- A predicted performance tier (high/medium/low) with one short top reason

Return ONLY this JSON (no markdown, no extra text):
{
  "ideas": [
    ${IDEA_JSON_SHAPE}
  ]
}`;

    const result = await generateWithAI(prompt, 'You are a content strategist. Respond with valid JSON only.');

    const parsed = parseAIJson(ideateResponseSchema, result);
    if (!parsed) {
      res.status(500).json({ error: 'Failed to parse ideas', code: 'AI_PARSE_ERROR', retryable: true });
      return;
    }

    res.json({ ideas: parsed.ideas || [] });
  } catch (error: unknown) {
    console.error('Ideation failed:', error);
    Sentry.captureException(error, { tags: { route: 'POST /ideate' } });
    res.status(500).json({ error: 'Failed to generate ideas', code: 'SERVER_ERROR', retryable: true });
  }
});

// POST /api/content/ideate/regenerate-one — I1: replace a single dismissed/
// stale idea without regenerating the whole visible batch. excludeTitles
// (the titles still on screen) steers the model away from near-duplicates.
router.post('/ideate/regenerate-one', async (req: AuthRequest, res: Response) => {
  try {
    const body = parseBody(regenerateIdeaSchema, req.body, res);
    if (!body) return;
    const userId = req.dbUserId || req.userId || 'demo';
    const profile = await getUserProfile(userId);
    const { focusTopic, excludeTitles, competitorAnalysisId } = body;

    const industry = profile.industry || 'content creation';
    const brandVoice = profile.brandVoice || 'professional';
    const brandName = profile.brandName || 'your brand';

    const [trendOutcome, competitorGapOutcome] = await Promise.allSettled([
      buildTrendContext(industry, focusTopic, brandName),
      competitorAnalysisId ? loadCompetitorGapContext(competitorAnalysisId, userId) : Promise.resolve(null),
    ]);
    const trendContext = trendOutcome.status === 'fulfilled' ? trendOutcome.value.text : '';
    const competitorGapContext = competitorGapOutcome.status === 'fulfilled' ? competitorGapOutcome.value : null;

    const focusSection = focusTopic
      ? `\nThe user wants ideas focused specifically on this theme:\n<user_focus>${focusTopic}</user_focus>\n`
      : '';
    const trendSection = trendContext
      ? `\n<trend_context>Recent web search results — ground the idea in these where relevant, and cite the matching source URL in "sourceUrl":\n${trendContext}</trend_context>\n`
      : '';
    const competitorSection = competitorGapContext
      ? `\n<competitor_gaps>A past competitor analysis found these content gaps/angles — consider them as possible inspiration:\n${competitorGapContext}</competitor_gaps>\n`
      : '';
    // SECURITY: excludeTitles ultimately traces back to a prior LLM generation,
    // not raw keystrokes, but that generation could itself have been steered by
    // a crafted focusTopic — wrapped the same as every other text block reaching
    // this prompt rather than assuming it's safe because it's one hop removed.
    const excludeSection = excludeTitles && excludeTitles.length > 0
      ? `\n<avoid_duplicating>Do not repeat or closely resemble any of these existing ideas:\n${excludeTitles.map((t) => `- <existing_idea_title>${t}</existing_idea_title>`).join('\n')}</avoid_duplicating>\n`
      : '';

    const prompt = `You are a content strategist. Generate exactly ONE fresh, trending topic idea — distinct from any ideas listed below.

<industry>${industry}</industry>
<brand_name>${brandName}</brand_name>
<brand_voice>${brandVoice}</brand_voice>
${focusSection}${trendSection}${competitorSection}${excludeSection}
Return ONLY this JSON (no markdown, no extra text, no "ideas" wrapper — a single object):
${IDEA_JSON_SHAPE}`;

    const result = await generateWithAI(prompt, 'You are a content strategist. Respond with valid JSON only.');

    const parsed = parseAIJson(regenerateIdeaResponseSchema, result);
    if (!parsed) {
      res.status(500).json({ error: 'Failed to regenerate idea', code: 'AI_PARSE_ERROR', retryable: true });
      return;
    }

    res.json(parsed);
  } catch (error: unknown) {
    console.error('Idea regeneration failed:', error);
    Sentry.captureException(error, { tags: { route: 'POST /ideate/regenerate-one' } });
    res.status(500).json({ error: 'Failed to regenerate idea', code: 'SERVER_ERROR', retryable: true });
  }
});

export default router;
