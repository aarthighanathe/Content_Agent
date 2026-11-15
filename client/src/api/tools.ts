import type { PlatformContent } from '../types/job';
import type { IdeatedIdea } from '../store';
import type {
  AnalyzeCompetitorResponse,
  CompetitorAnalysisHistoryResponse,
} from '../types/social';
import type {
  ScheduledPostListResponse,
  CreateScheduledPostInput,
  CreateScheduledPostResponse,
} from '../types/scheduledPost';
import type { CollectionListResponse, CreateCollectionResponse } from '../types/collection';
import type { JobListResponse } from '../types/job';
import { api } from './client';

// WHY: extracted from api.ts: that file exceeded the 400-line cap (CLAUDE.md).
// Job CRUD stays in api.ts; content-tool / library / feed helpers live here and
// are re-exported from api.ts so existing `from '../api'` imports stay stable.

// ── Ideation ──────────────────────────────────────────────────────────────────
export async function generateIdeas(
  count = 10,
  focusTopic?: string,
  competitorAnalysisId?: string,
): Promise<{ ideas: IdeatedIdea[] }> {
  const response = await api.post('/content/ideate', { count, focusTopic, competitorAnalysisId });
  return response.data;
}

// I1: regenerate a single idea in place. excludeTitles should be the titles
// currently visible on screen so the model avoids near-duplicates.
export async function regenerateIdea(
  focusTopic?: string,
  excludeTitles?: string[],
  competitorAnalysisId?: string,
): Promise<IdeatedIdea> {
  const response = await api.post('/content/ideate/regenerate-one', { focusTopic, excludeTitles, competitorAnalysisId });
  return response.data;
}

// ── Hashtag Research ──────────────────────────────────────────────────────────
export async function researchHashtags(data: {
  topic: string;
  platform: string;
  content?: PlatformContent | PlatformContent[] | string;
}): Promise<{
  broad: string[];
  niche: string[];
  branded: string[];
  strategy: string;
  reachTier?: 'large' | 'medium' | 'niche';
}> {
  const response = await api.post('/content/hashtags', data);
  return response.data;
}

// ── Repurpose (URL → content job) ─────────────────────────────────────────────
export async function repurposeUrl(data: {
  url: string;
  platform: string;
  // WHY: optional, additive to `platform`: a single-URL, multi-platform
  // submission fetches/extracts the article once server-side and fans out
  // to one job per platform — see routes/content/repurpose.ts. Omitting it
  // keeps the original single-platform call shape unchanged.
  platforms?: string[];
  tone: string;
  targetAudience: string;
}): Promise<{ jobId: string; topic: string; jobs?: Array<{ jobId: string; platform: string }> }> {
  const response = await api.post('/content/repurpose', data);
  return response.data;
}

// WHY: separate function (not overloading repurposeUrl with an items array):
// batch repurpose is a different endpoint (/repurpose/batch) with a different
// request shape — keeping them separate prevents callers from accidentally
// merging the two result shapes.
export async function repurposeBatchUrls(items: Array<{
  url: string;
  platform: string;
  platforms?: string[];
  tone: string;
  targetAudience: string;
}>): Promise<{ jobs: Array<{ jobId: string; platform: string; topic: string }>; failedItems: Array<{ url: string; error: string }> }> {
  const response = await api.post('/content/repurpose/batch', { items });
  return response.data;
}

// ── Image Generation ──────────────────────────────────────────────────────────
export async function generateSlideImage(
  prompt: string,
  mode?: 'background' | 'full_slide',
  signal?: AbortSignal,
): Promise<{ image: string }> {
  const response = await api.post('/image/generate', { prompt, mode }, { signal });
  return response.data;
}

// ── Competitor Analysis ───────────────────────────────────────────────────────
export async function analyzeCompetitor(data: {
  handle: string;
  platform: 'linkedin' | 'twitter' | 'instagram';
  industry?: string;
}): Promise<AnalyzeCompetitorResponse> {
  const response = await api.post('/content/competitor', data);
  return response.data;
}

export async function getCompetitorHistory(): Promise<CompetitorAnalysisHistoryResponse> {
  const response = await api.get('/content/competitor/history');
  return response.data;
}

export async function deleteCompetitorAnalysis(id: string): Promise<{ success: boolean }> {
  const response = await api.delete(`/content/competitor/${id}`);
  return response.data;
}

// ── Onboarding ───────────────────────────────────────────────────────────────
export async function getOnboardingStatus(): Promise<{ completed: boolean }> {
  const response = await api.get('/users/onboarding');
  return response.data;
}

export async function completeOnboarding(data: { brandName?: string; preferredTone?: string }): Promise<void> {
  await api.post('/users/onboarding', data);
}

// NOTE: createCarouselRenderSession() was removed with the /render-slides SSE endpoint.
// Carousel PNGs are produced by POST /jobs/:id/export/carousel-png (see ExportModal).

// ── Scheduled Posts (server-synced Calendar) ─────────────────────────────────
// WHY: month YYYY-MM: GET /scheduled-posts defaults to the current UTC month
// when omitted and never returns all rows — Calendar must pass the visible
// month; Dashboard next-up should pass current (and optionally next) month.
export async function getScheduledPosts(month?: string): Promise<ScheduledPostListResponse> {
  const response = await api.get('/scheduled-posts', { params: month ? { month } : undefined });
  return response.data;
}

// WHY: one function for both create and move: the server upserts on jobId
// (unique constraint), so scheduling an already-scheduled job onto a new
// date is the same call as scheduling it for the first time.
export async function scheduleJob(data: CreateScheduledPostInput): Promise<CreateScheduledPostResponse> {
  const response = await api.post('/scheduled-posts', data);
  return response.data;
}

export async function unscheduleJob(jobId: string): Promise<void> {
  await api.delete(`/scheduled-posts/${jobId}`);
}

// ── Library tagging ───────────────────────────────────────────────────────────
// WHY: PATCH /:jobId/tag and the tag column on contentJobs already exist server-side
// (tagJobSchema: max 30 chars, trimmed). This is the only missing piece — nothing in
// the client ever called the endpoint before this change.
export async function tagJob(jobId: string, tag: string): Promise<{ success: boolean }> {
  const response = await api.patch(`/jobs/${jobId}/tag`, { tag });
  return response.data;
}

// WHY: no removeTag / clearTag: the server treats tag as a nullable string; sending an
// empty string '' would fail tagJobSchema's min(1). Instead, callers should PATCH with
// a whitespace-only value — the server trims it and the schema rejects it, so the
// correct idiom is to just not store a tag. If a "clear tag" affordance is ever
// needed, a dedicated PATCH /tag with null handling should be added server-side first.

// ── Library collections/folders ─────────────────────────────────────────────────
export async function getCollections(): Promise<CollectionListResponse> {
  const response = await api.get('/collections');
  return response.data;
}

export async function createCollection(name: string): Promise<CreateCollectionResponse> {
  const response = await api.post('/collections', { name });
  return response.data;
}

export async function deleteCollection(collectionId: string): Promise<{ success: boolean }> {
  const response = await api.delete(`/collections/${collectionId}`);
  return response.data;
}

// WHY: page/limit optional: server paginates (default page=1, limit=50, max 100)
// and returns { jobs, total, totalPages, page, limit }. Library still wants the
// full membership for client-side filter/sort — callers that need every row
// should page via this helper (see fetchAllCollectionJobPages).
export async function getCollectionJobs(
  collectionId: string,
  opts?: { page?: number; limit?: number },
): Promise<JobListResponse> {
  const response = await api.get<JobListResponse>(`/collections/${collectionId}/jobs`, {
    params: {
      page: opts?.page ?? 1,
      limit: opts?.limit ?? 50,
    },
  });
  const data = response.data;
  const jobs = data.jobs ?? [];
  return {
    jobs,
    total: data.total ?? jobs.length,
    page: data.page ?? 1,
    totalPages: data.totalPages ?? 1,
  };
}

export async function addJobToCollection(collectionId: string, jobId: string): Promise<{ success: boolean }> {
  const response = await api.post(`/collections/${collectionId}/jobs`, { jobId });
  return response.data;
}

export async function removeJobFromCollection(collectionId: string, jobId: string): Promise<{ success: boolean }> {
  const response = await api.delete(`/collections/${collectionId}/jobs/${jobId}`);
  return response.data;
}

// ── Feed Monitors (RSS/Atom monitoring) ──────────────────────────────────────
export interface FeedMonitor {
  id: string;
  userId: string;
  feedUrl: string;
  platform: string;
  tone: string;
  targetAudience: string;
  active: boolean;
  lastCheckedAt: string | null;
  lastItemGuid: string | null;
  lastError: string | null;
  createdAt: string;
}

export async function getFeedMonitors(): Promise<{ monitors: FeedMonitor[] }> {
  const response = await api.get('/feed-monitors');
  return response.data;
}

export async function createFeedMonitor(data: {
  feedUrl: string;
  platform: string;
  tone: string;
  targetAudience: string;
}): Promise<{ monitor: FeedMonitor }> {
  const response = await api.post('/feed-monitors', data);
  return response.data;
}

export async function toggleFeedMonitor(id: string, active: boolean): Promise<{ monitor: FeedMonitor }> {
  const response = await api.patch(`/feed-monitors/${id}`, { active });
  return response.data;
}

export async function deleteFeedMonitor(id: string): Promise<{ success: boolean }> {
  const response = await api.delete(`/feed-monitors/${id}`);
  return response.data;
}

export async function checkFeedMonitorNow(id: string): Promise<{ message: string }> {
  const response = await api.post(`/feed-monitors/${id}/check`);
  return response.data;
}
