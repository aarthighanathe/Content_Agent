import { searchTavily, type TavilySearchResult } from '../lib/ai.js';
import { sseManager } from '../lib/sse.js';
import type { RuntimeJob } from '../lib/pipelineTypes.js';
import { sanitizeSearchText } from '../lib/sanitizeSearchText.js';

import type { ResearchResult } from './agentTypes.js';

// WHY: re-exported so existing `from './researcher.js'` imports keep working; the
// definition lives in agentTypes.ts to avoid a cycle with pipelineTypes.ts.
export type { ResearchResult };

export async function runResearcher(
  job: RuntimeJob,
  searchQueries: string[]
): Promise<ResearchResult> {
  sseManager.sendEvent(job.id, {
    type: 'progress',
    stage: 'researching',
    progress: 40,
    agent: 'researcher',
    message: 'Searching the web for trends and insights...',
  });

  const allResults: TavilySearchResult[] = [];

  // WHY: Promise.allSettled: running all 3 Tavily searches in parallel reduces latency from 6-9s (sequential) to ~2s.
  // Partial failures are swallowed so one bad query doesn't abort the whole research stage.
  const searchResults = await Promise.allSettled(
    searchQueries.slice(0, 3).map((q) => searchTavily(q)),
  );
  for (const outcome of searchResults) {
    if (outcome.status === 'fulfilled' && outcome.value?.results) {
      allResults.push(...outcome.value.results);
    } else if (outcome.status === 'rejected') {
      console.warn('[researcher] A parallel search failed (continuing):', outcome.reason);
    }
  }

  const trendingAngles: string[] = [];
  const keyFacts: string[] = [];
  const suggestedHashtags: string[] = [];
  const competitorHooks: string[] = [];
  const sourceUrls: string[] = [];

  // SECURITY: Tavily results are untrusted web text — sanitize before they flow
  // into trendingAngles/keyFacts/competitorHooks (later JSON.stringified into
  // the writer prompt). Same neutralization as competitor.ts / ideate.ts.
  // NOTE: sentence-split + keyword heuristics are deliberately cheap — they
  // only color the writer prompt, never score or surface directly to users.
  allResults.forEach((result) => {
    if (result.url) sourceUrls.push(result.url);
    if (result.content) {
      const content = sanitizeSearchText(result.content);
      // NOTE: first sentence ≈ competitor hook seed for the writer.
      const sentences = content.split('. ').slice(0, 2);
      if (sentences.length > 0) {
        competitorHooks.push(sentences[0]);
      }
      const factSentences = content.split('. ').filter((s: string) =>
        s.match(/\d+%|\d+ (million|billion|thousand)|study|research|survey|report/i)
      );
      keyFacts.push(...factSentences.slice(0, 2));
    }
    if (result.title) {
      trendingAngles.push(sanitizeSearchText(result.title));
    }
  });

  const topicWords = job.topic.toLowerCase().split(/\s+/);
  topicWords.forEach((word: string) => {
    if (word.length > 3) {
      suggestedHashtags.push(`#${word}`);
    }
  });
  suggestedHashtags.push(`#${job.platform.replace('_', '')}`, '#contentcreator', '#socialmedia');

  const slicedAngles = trendingAngles.slice(0, 5);
  const slicedFacts = keyFacts.slice(0, 5);
  // WHY: (M4): empty/failed Tavily used to continue silently — users saw a normal
  // "research done" progress story with zero sources. Warn via SSE; pipeline
  // still continues with topic-only writing (product decision: don't fail the job).
  if (slicedFacts.length === 0 && slicedAngles.length === 0) {
    sseManager.sendEvent(job.id, {
      type: 'progress',
      stage: 'researching',
      progress: 40,
      agent: 'researcher',
      message: 'Research returned no sources — continuing with topic only',
    });
  }

  return {
    trendingAngles: slicedAngles,
    keyFacts: slicedFacts,
    suggestedHashtags: [...new Set(suggestedHashtags)].slice(0, 15),
    competitorHooks: competitorHooks.slice(0, 5),
    sourceUrls: [...new Set(sourceUrls)].slice(0, 5),
    // SECURITY: omit unsanitized Tavily payloads from persisted/API research —
    // clients only need angles/facts/hashtags/hooks/urls (no rawResults consumers).
    rawResults: [],
  };
}
