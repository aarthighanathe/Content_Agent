import { searchTavily, type TavilySearchResult } from '../lib/ai.js';
import { sseManager } from '../lib/sse.js';
import { ContentJob } from '../db/schema.js';

// WHY exported: writer.ts's WriterInput.researchReport reads this shape directly
// (trendingAngles/keyFacts/suggestedHashtags/competitorHooks) — exporting it lets
// writer.ts use the real type instead of a second, possibly-drifting copy of the
// same shape.
export interface ResearchResult {
  trendingAngles: string[];
  keyFacts: string[];
  suggestedHashtags: string[];
  competitorHooks: string[];
  sourceUrls: string[];
  rawResults: TavilySearchResult[];
}

export async function runResearcher(
  job: ContentJob,
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

  // WHY Promise.allSettled: running all 3 Tavily searches in parallel reduces latency from 6-9s (sequential) to ~2s.
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

  // Extract insights from search results
  const trendingAngles: string[] = [];
  const keyFacts: string[] = [];
  const suggestedHashtags: string[] = [];
  const competitorHooks: string[] = [];
  const sourceUrls: string[] = [];

  allResults.forEach((result) => {
    if (result.url) sourceUrls.push(result.url);
    if (result.content) {
      // Extract potential hooks (first sentences)
      const sentences = result.content.split('. ').slice(0, 2);
      if (sentences.length > 0) {
        competitorHooks.push(sentences[0]);
      }
      // Extract key facts
      const factSentences = result.content.split('. ').filter((s: string) =>
        s.match(/\d+%|\d+ (million|billion|thousand)|study|research|survey|report/i)
      );
      keyFacts.push(...factSentences.slice(0, 2));
    }
    if (result.title) {
      trendingAngles.push(result.title);
    }
  });

  // Generate hashtags based on topic
  const topicWords = job.topic.toLowerCase().split(/\s+/);
  topicWords.forEach((word: string) => {
    if (word.length > 3) {
      suggestedHashtags.push(`#${word}`);
    }
  });
  suggestedHashtags.push(`#${job.platform.replace('_', '')}`, '#contentcreator', '#socialmedia');

  return {
    trendingAngles: trendingAngles.slice(0, 5),
    keyFacts: keyFacts.slice(0, 5),
    suggestedHashtags: [...new Set(suggestedHashtags)].slice(0, 15),
    competitorHooks: competitorHooks.slice(0, 5),
    sourceUrls: [...new Set(sourceUrls)].slice(0, 5),
    rawResults: allResults,
  };
}
