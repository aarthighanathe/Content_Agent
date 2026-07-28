import axios from 'axios';
import type { ContentJob, JobListResponse, PlatformContent } from './types/job';
import type {
  Profile,
  SocialConnection,
  AnalyzeVoiceResponse,
  ExportDataResponse,
} from './types/api';
import type {
  TemplateListResponse,
  SaveTemplateInput,
  SaveTemplateResponse,
  RenameTemplateResponse,
} from './types/template';
import type {
  PostToSocialResponse,
  SchedulePostInput,
  SchedulePostResponse,
  AnalyzeCompetitorResponse,
} from './types/social';

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
}): Promise<{ jobId: string }> {
  const response = await api.post('/jobs/create', data);
  return response.data;
}

export interface GetJobsOptions {
  search?: string;
  platform?: string;
  sort?: 'date' | 'score' | 'platform';
}

export async function getJobs(page: number = 1, options?: GetJobsOptions): Promise<JobListResponse> {
  const params: Record<string, string | number> = { page };
  if (options?.search) params.search = options.search;
  if (options?.platform && options.platform !== 'all') params.platform = options.platform;
  if (options?.sort) params.sort = options.sort;
  const response = await api.get('/jobs', { params });
  return response.data;
}

export async function getJob(jobId: string): Promise<ContentJob> {
  const response = await api.get(`/jobs/${jobId}`);
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

// content is the platform-specific final output payload (see PlatformContent / carousel
// slide array) being saved back after inline editing in the Result view.
export async function updateJobContent(
  jobId: string,
  content: PlatformContent | PlatformContent[] | string,
): Promise<{ success: boolean }> {
  const response = await api.patch(`/jobs/${jobId}/content`, { content });
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
export async function generateIdeas(count = 10): Promise<{ ideas: Array<{ title: string; platform: string; angle: string; why: string }> }> {
  const response = await api.post('/content/ideate', { count });
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
  tone: string;
  targetAudience: string;
}): Promise<{ jobId: string; topic: string }> {
  const response = await api.post('/content/repurpose', data);
  return response.data;
}

// ── Templates ─────────────────────────────────────────────────────────────────
export async function getTemplates(): Promise<TemplateListResponse> {
  const response = await api.get('/templates');
  return response.data;
}

export async function saveTemplate(data: SaveTemplateInput): Promise<SaveTemplateResponse> {
  const response = await api.post('/templates', data);
  return response.data;
}

export async function deleteTemplate(id: string): Promise<void> {
  await api.delete(`/templates/${id}`);
}

export async function renameTemplate(id: string, name: string): Promise<RenameTemplateResponse> {
  const response = await api.patch(`/templates/${id}`, { name });
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

export { api, API_BASE };
