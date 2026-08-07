import axios from 'axios';
import type { ContentJob, JobListResponse, JobStatus, PlatformContent } from './types/job';
import type {
  Profile,
  SocialConnection,
  AnalyzeVoiceResponse,
  ExportDataResponse,
} from './types/api';
import type {
  PostToSocialResponse,
  SchedulePostInput,
  SchedulePostResponse,
  AnalyzeCompetitorResponse,
  CompetitorAnalysisHistoryResponse,
} from './types/social';
import type {
  ScheduledPostListResponse,
  CreateScheduledPostInput,
  CreateScheduledPostResponse,
} from './types/scheduledPost';
import type { CollectionListResponse, CreateCollectionResponse } from './types/collection';
import type { JobVersionListResponse } from './types/jobVersion';
import type { IdeatedIdea } from './store';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

// WHY minimal shape (not @clerk/clerk-js types): Clerk attaches itself to `window` at
// runtime; we only ever call this one method here, so a narrow structural type avoids
// `any` without pulling in the full SDK's global type augmentation.
interface ClerkWindow {
  Clerk?: {
    session?: {
      getToken?: () => Promise<string | null>;
    };
  };
}

function isClerkWindow(w: unknown): w is ClerkWindow {
  return typeof w === 'object' && w !== null;
}

const api = axios.create({
  baseURL: `${API_BASE}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// WHY interceptor: Clerk tokens expire and must be freshly fetched per request.
// Using an interceptor means no auth logic is scattered across individual API calls —
// every axios request through this instance automatically gets a valid Bearer token.
api.interceptors.request.use(async (config) => {
  try {
    const win: ClerkWindow = isClerkWindow(window) ? window : {};
    const token = await win.Clerk?.session?.getToken?.();
    if (token) {
      config.headers = config.headers ?? {};
      config.headers['Authorization'] = `Bearer ${token}`;
    }
  } catch {
    // Clerk not ready yet
  }
  return config;
});

// API functions
export async function createJob(data: {
  topic: string;
  platform: string;
  tone: string;
  targetAudience: string;
  // WHY optional (C3): only set when Create.tsx's location.state carries
  // CreateHandoff's competitorContext/competitorAnalysisId (Competitor.tsx's
  // "Create content →" CTAs) — see routes/jobs/create.ts's
  // loadOwnedCompetitorContext for how the server resolves these into
  // orchestrator prompt context.
  competitorContext?: string;
  competitorAnalysisId?: string;
  // WHY optional, carousel-only: the new template system's choice
  // (client/src/lib/templateSystem.ts) made on Create's AdvancedOptions panel.
  // Ignored server-side for every platform except instagram_carousel — see
  // routes/jobs/create.ts.
  templateId?: string;
  paletteId?: string;
}): Promise<{ jobId: string }> {
  const response = await api.post('/jobs/create', data);
  return response.data;
}

export interface GetJobsOptions {
  search?: string;
  platform?: string;
  sort?: 'date' | 'score' | 'platform';
  // WHY opt-out flag: the server returns per-platform pill counts on every list
  // fetch by default (a second grouped aggregate query). Calendar needs jobs +
  // totalPages but never renders the platform pills, so it opts out to drop those
  // aggregate queries (perf audit) — Library still uses them for its filter pills.
  counts?: boolean;
}

export async function getJobs(page: number = 1, options?: GetJobsOptions): Promise<JobListResponse> {
  const params: Record<string, string | number> = { page };
  if (options?.search) params.search = options.search;
  if (options?.platform && options.platform !== 'all') params.platform = options.platform;
  if (options?.sort) params.sort = options.sort;
  if (options?.counts === false) params.counts = 0;
  const response = await api.get('/jobs', { params });
  return response.data;
}

export async function getJob(jobId: string): Promise<ContentJob> {
  const response = await api.get(`/jobs/${jobId}`);
  return response.data;
}

// WHY separate from getJob: pollers only need the terminal/progress/score fields — this
// hits the server's slim GET /:jobId/status which omits the heavy `content` jsonb that
// makes the full job payload so expensive to fetch repeatedly (perf audit).
export async function getJobStatus(jobId: string): Promise<JobStatus> {
  const response = await api.get(`/jobs/${jobId}/status`);
  return response.data;
}

export async function deleteJob(jobId: string): Promise<void> {
  await api.delete(`/jobs/${jobId}`);
}

// NOTE: server route only returns { success: true } — it does not send the regenerated
// job back; callers must re-fetch via getJob() or rely on the SSE stream for progress.
export async function regenerateJob(jobId: string, feedback?: string): Promise<{ success: boolean }> {
  const response = await api.post(`/jobs/${jobId}/regenerate`, feedback ? { feedback } : {});
  return response.data;
}

// ── Version history ──────────────────────────────────────────────────────────
// WHY a snapshot is taken only on regenerate/restore, not every save: see
// server/src/db/schema.ts's jobOutputVersions WHY comment — this deliberately
// does not touch the shared persistJobToDB write path every job goes through.
export async function getJobVersions(jobId: string): Promise<JobVersionListResponse> {
  const response = await api.get(`/jobs/${jobId}/versions`);
  return response.data;
}

export async function restoreJobVersion(jobId: string, versionId: string): Promise<{ success: boolean }> {
  const response = await api.post(`/jobs/${jobId}/versions/${versionId}/restore`);
  return response.data;
}

// content is the platform-specific final output payload (see PlatformContent / carousel
// slide array) being saved back after inline editing in the Result view.
export async function updateJobContent(
  jobId: string,
  content: PlatformContent | PlatformContent[] | string,
): Promise<{ success: boolean }> {
  const response = await api.patch(`/jobs/${jobId}/content`, { content });
  return response.data;
}

// Switches a carousel job's template/palette after generation (Result page's
// in-preview template switcher — CAROUSEL_TEMPLATE_PLAN.md §2.3). Content is
// unchanged; only presentational metadata on the job row is updated.
export async function setCarouselTemplate(
  jobId: string,
  templateId: string,
  paletteId?: string,
): Promise<{ success: boolean; templateId: string; paletteId: string | null }> {
  const response = await api.patch(`/jobs/${jobId}/carousel-template`, { templateId, paletteId });
  return response.data;
}

export async function multiplyJob(jobId: string, targetPlatform: string): Promise<{ jobId: string }> {
  const response = await api.post(`/jobs/${jobId}/multiply`, { targetPlatform });
  return response.data;
}

export async function createBatchJobs(items: Array<{ topic: string; platform: string; tone: string; targetAudience: string }>): Promise<{ jobs: Array<{ jobId: string; topic: string; platform: string }> }> {
  const response = await api.post('/jobs/batch', { items });
  return response.data;
}

// WHY partial, not Record<string,string>: a brand-new user (or one who hasn't
// completed a job on a given platform yet) has no learned default for that
// platform — Create.tsx falls back to its static AUDIENCE_DEFAULTS map per
// platform, not just once for a totally-empty response.
export async function getAudienceDefaults(): Promise<{ audienceDefaults: Partial<Record<string, string>> }> {
  const response = await api.get('/jobs/audience-defaults');
  return response.data;
}

export async function updateBrandVoice(data: {
  brandName?: string;
  brandVoice?: string;
  phrasesUse?: string;
  phrasesAvoid?: string;
  industry?: string;
}): Promise<Profile> {
  const response = await api.post('/users/brand-voice', data);
  return response.data;
}

export async function getProfile(): Promise<Profile> {
  const response = await api.get('/users/me');
  return response.data;
}

export async function exportMyData(): Promise<ExportDataResponse> {
  const response = await api.get('/users/me/export');
  return response.data;
}

export async function deleteMyAccount(): Promise<void> {
  await api.delete('/users/me');
}

export async function analyzeVoice(samples: string): Promise<AnalyzeVoiceResponse> {
  const response = await api.post('/users/analyze-voice', { samples });
  return response.data;
}

export async function getStreamToken(jobId: string): Promise<{ token: string }> {
  const response = await api.post(`/jobs/${jobId}/stream-token`);
  return response.data;
}

export async function getSocialConnections(): Promise<{ connections: SocialConnection[] }> {
  const response = await api.get('/social/connections');
  return response.data;
}

export async function disconnectSocial(platform: string): Promise<void> {
  await api.delete(`/social/disconnect/${platform}`);
}

export async function postToSocial(
  platform: string,
  content: PlatformContent | PlatformContent[] | string,
  jobId?: string,
): Promise<PostToSocialResponse> {
  const response = await api.post('/social/post', { platform, content, jobId });
  return response.data;
}

export async function schedulePost(data: SchedulePostInput): Promise<SchedulePostResponse> {
  const response = await api.post('/social/schedule', data);
  return response.data;
}

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
  // WHY optional, additive to `platform`: a single-URL, multi-platform
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

// WHY separate function (not overloading repurposeUrl with an items array):
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
export async function generateSlideImage(prompt: string, mode?: 'background' | 'full_slide'): Promise<{ image: string }> {
  const response = await api.post('/image/generate', { prompt, mode });
  return response.data;
}

// ── Competitor Analysis ───────────────────────────────────────────────────────
export async function analyzeCompetitor(data: { handle: string; industry?: string }): Promise<AnalyzeCompetitorResponse> {
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
// WHY month optional: Calendar.tsx fetches one visible month at a time;
// Dashboard's NextScheduledCard omits it to search across all of the user's
// scheduled posts for the nearest future date.
export async function getScheduledPosts(month?: string): Promise<ScheduledPostListResponse> {
  const response = await api.get('/scheduled-posts', { params: month ? { month } : undefined });
  return response.data;
}

// WHY one function for both create and move: the server upserts on jobId
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

// WHY no removeTag / clearTag: the server treats tag as a nullable string; sending an
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

export async function getCollectionJobs(collectionId: string): Promise<JobListResponse> {
  const response = await api.get(`/collections/${collectionId}/jobs`);
  // WHY normalizing here, not a new response type: the server returns only
  // { jobs } (a collection has no pagination — see routes/collections.ts),
  // while JobListResponse also carries total/page/totalPages. Reusing
  // JobListResponse lets ContentTab.tsx render collection jobs with zero
  // changes to its props; the extra fields are simply computed client-side.
  const jobs = response.data.jobs || [];
  return { jobs, total: jobs.length, page: 1, totalPages: 1 };
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

export { api, API_BASE };

