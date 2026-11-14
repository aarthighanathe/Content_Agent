import type {
  ContentJob,
  CreateJobInput,
  JobListResponse,
  JobStatus,
  PlatformContent,
} from './types/job';
import type {
  Profile,
  SocialConnection,
  AnalyzeVoiceResponse,
  ExportDataResponse,
} from './types/api';
import type {
  PostToSocialResponse,
} from './types/social';
import type { JobVersionListResponse } from './types/jobVersion';
import { api, API_BASE } from './api/client';
import {
  generateIdeas,
  regenerateIdea,
  researchHashtags,
  repurposeUrl,
  repurposeBatchUrls,
  generateSlideImage,
  analyzeCompetitor,
  getCompetitorHistory,
  deleteCompetitorAnalysis,
  getOnboardingStatus,
  completeOnboarding,
  getScheduledPosts,
  scheduleJob,
  unscheduleJob,
  tagJob,
  getCollections,
  createCollection,
  deleteCollection,
  getCollectionJobs,
  addJobToCollection,
  removeJobFromCollection,
  getFeedMonitors,
  createFeedMonitor,
  toggleFeedMonitor,
  deleteFeedMonitor,
  checkFeedMonitorNow,
  type FeedMonitor,
} from './api/tools';

export async function createJob(data: CreateJobInput): Promise<{ jobId: string }> {
  const response = await api.post('/jobs/create', data);
  return response.data;
}

export interface GetJobsOptions {
  search?: string;
  platform?: string;
  sort?: 'date' | 'score' | 'platform';
  // WHY: opt-out flag: the server returns per-platform pill counts on every list
  // fetch by default (a second grouped aggregate query). Calendar needs jobs +
  // totalPages but never renders the platform pills, so it opts out to drop those
  // aggregate queries — Library still uses them for its filter pills.
  counts?: boolean;
  // WHY: optional: Library tag pills used to filter only the current page client-side.
  tag?: string;
}

export async function getJobs(page: number = 1, options?: GetJobsOptions): Promise<JobListResponse> {
  const params: Record<string, string | number> = { page };
  if (options?.search) params.search = options.search;
  if (options?.platform && options.platform !== 'all') params.platform = options.platform;
  if (options?.sort) params.sort = options.sort;
  if (options?.counts === false) params.counts = 0;
  if (options?.tag) params.tag = options.tag;
  const response = await api.get('/jobs', { params });
  return response.data;
}

export async function getJob(jobId: string): Promise<ContentJob> {
  const response = await api.get(`/jobs/${jobId}`);
  return response.data;
}

// WHY: separate from getJob: pollers only need the terminal/progress/score fields — this
// hits the server's slim GET /:jobId/status which omits the heavy `content` jsonb that
// makes the full job payload expensive on a tight poll interval.
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

// WHY: a snapshot is taken only on regenerate/restore, not every save: see
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

// FLOW: Result inline edits PATCH the stored final output payload (PlatformContent shape).
export async function updateJobContent(
  jobId: string,
  content: PlatformContent | PlatformContent[] | string,
): Promise<{ success: boolean }> {
  const response = await api.patch(`/jobs/${jobId}/content`, { content });
  return response.data;
}

// WHY: separate from content PATCH: template/palette are presentation-only job metadata.
export async function setCarouselTemplate(
  jobId: string,
  templateId: string,
  paletteId?: string,
): Promise<{ success: boolean; templateId: string; paletteId: string | null }> {
  const response = await api.patch(`/jobs/${jobId}/carousel-template`, { templateId, paletteId });
  return response.data;
}

export async function multiplyJob(
  jobId: string,
  targetPlatform: string,
): Promise<{ jobId: string; reused?: boolean }> {
  const response = await api.post(`/jobs/${jobId}/multiply`, { targetPlatform });
  return response.data;
}

export interface RelatedJobVariant {
  jobId: string;
  platform: string;
  status: string;
  sourceJobId: string | null;
  isCurrent: boolean;
  isRoot: boolean;
}

export async function getRelatedJobs(jobId: string): Promise<{
  rootJobId: string;
  currentJobId: string;
  variants: RelatedJobVariant[];
}> {
  const response = await api.get(`/jobs/${jobId}/related`);
  return response.data;
}

export async function createBatchJobs(
  items: Array<{ topic: string; platform: string; tone: string; targetAudience: string }>,
  opts?: { templateId?: string; paletteId?: string },
): Promise<{
  jobs: Array<{ jobId: string; topic: string; platform: string }>;
  // WHY: present even on a fully-successful batch: the server always returns
  // this key (possibly empty) rather than omitting it, so callers don't need
  // an `in`/`??` check to safely read .length.
  failedItems: Array<{ index: number; topic: string; error: string }>;
}> {
  const response = await api.post('/jobs/batch', { items, ...opts });
  return response.data;
}

// WHY: partial, not Record<string,string>: a brand-new user (or one who hasn't
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

export async function getSocialConnections(): Promise<{
  connections: SocialConnection[];
  oauthConfigured?: { linkedin: boolean; twitter: boolean };
}> {
  const response = await api.get('/social/connections');
  return response.data;
}

export async function disconnectSocial(platform: string): Promise<void> {
  await api.delete(`/social/disconnect/${platform}`);
}

/** Start LinkedIn/Twitter OAuth — returns provider authorize URL (cookie set server-side). */
export async function startSocialConnect(platform: string): Promise<{ authorizeUrl: string }> {
  const response = await api.get<{ authorizeUrl: string }>(`/social/connect/${platform}`);
  return response.data;
}

export async function postToSocial(
  platform: string,
  content: PlatformContent | PlatformContent[] | string,
  jobId?: string,
): Promise<PostToSocialResponse> {
  const response = await api.post('/social/post', { platform, content, jobId });
  return response.data;
}

export {
  generateIdeas,
  regenerateIdea,
  researchHashtags,
  repurposeUrl,
  repurposeBatchUrls,
  generateSlideImage,
  analyzeCompetitor,
  getCompetitorHistory,
  deleteCompetitorAnalysis,
  getOnboardingStatus,
  completeOnboarding,
  getScheduledPosts,
  scheduleJob,
  unscheduleJob,
  tagJob,
  getCollections,
  createCollection,
  deleteCollection,
  getCollectionJobs,
  addJobToCollection,
  removeJobFromCollection,
  getFeedMonitors,
  createFeedMonitor,
  toggleFeedMonitor,
  deleteFeedMonitor,
  checkFeedMonitorNow,
};
export type { FeedMonitor };
export { api, API_BASE };
