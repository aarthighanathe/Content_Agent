export interface JobOutput {
  agentName: string;
  outputType: 'research' | 'draft' | 'critique' | 'final' | 'prediction';
  content: unknown;
  qualityScore?: number;
  partial?: boolean;
}

export interface JobLog {
  agentName: string;
  action: string;
  inputSummary?: string;
  outputSummary?: string;
  // WHY optional: SSE-sourced logs (useJobData.ts's mergeSSEIntoJobData, store.ts's
  // updateFromSSE) don't always carry a duration — e.g. an in-progress agent step reports
  // durationMs only once it completes. Matches store.ts's own AgentLog shape.
  durationMs?: number;
}

// WHY this shape (not the old dimensions[]/flat-score-fields version): matches the actual
// server output from agents/critic.ts's CriticResult — { approved, totalScore, scores: {...},
// feedback } — which is what's actually stored in JobOutput.content for outputType:'critique'
// and read by InsightsSidebar.tsx / StatusDisplay.tsx. The previous shape here didn't match
// any real payload and every consumer bypassed it via `any`.
export interface CriticScores {
  hookStrength: number;
  platformCompliance: number;
  brandVoiceMatch: number;
  valueDelivery: number;
  ctaClarity: number;
}

export interface CriticResult {
  approved: boolean;
  totalScore: number;
  scores: CriticScores;
  feedback: string;
}

export interface ContentJob {
  id: string;
  userId: string;
  topic: string;
  platform: string;
  tone: string;
  targetAudience: string;
  brandVoice: string;
  status: string;
  stage?: string;
  progress?: number;
  message?: string;
  retryCount: number;
  deleted: number;
  createdAt: string;
  updatedAt: string;
  outputs: JobOutput[];
  logs: JobLog[];
  agentLogs?: JobLog[];
  criticResult: CriticResult | null;
  tag?: string;
  error?: string;
  // WHY optional: only set on jobs created via Content Multiplication (routes/jobs/manage.ts)
  sourceJobId?: string;
  sourcePlatform?: string;
}

// WHY one loose interface instead of a strict discriminated union: real SSE payloads from
// sseManager.sendEvent() (server/src/lib/sse.ts) vary their present fields by event type
// ('progress' | 'connected' | 'slide_ready' | 'state') and the two consumers (store.ts's
// updateFromSSE, useJobData.ts's mergeSSEIntoJobData) read fields defensively with `??`/`||`
// fallbacks rather than switching on `type` — matching that at the type level with optional
// fields (all consumer reads already null-check) is truer to actual usage than forcing a
// union callers would immediately have to widen back out of.
export interface SSEEvent {
  type?: 'progress' | 'connected' | 'slide_ready' | 'state';
  stage?: string;
  progress?: number;
  agent?: string;
  message?: string;
  durationMs?: number;
  slideIndex?: number;
  dataUrl?: string;
  theme?: string;
  jobId?: string;
  outputs?: JobOutput[];
  logs?: JobLog[];
  data?: { jobId: string };
}

export interface JobListResponse {
  jobs: ContentJob[];
  total: number;
  page: number;
  totalPages: number;
  // WHY server-computed, not derived from `jobs`: `jobs` is just the current page
  // (and may be platform-filtered), so a client-side tally would only ever show a
  // nonzero count for whichever platform is currently selected. This reflects the
  // true per-platform count across the user's whole library (still respecting an
  // active search, but not the platform filter itself) — see GET /jobs.
  platformCounts?: Record<string, number>;
}

export interface PlatformContent {
  headline?: string;
  body?: string;
  hook?: string;
  // WHY hookAlt/tweetOneAlt: the writer agent generates an A/B alternate hook for
  // LinkedIn/Twitter content (see LinkedInContent.tsx / TwitterContent.tsx's A/B toggle) —
  // not present on carousel slides or Instagram captions.
  hookAlt?: string;
  tweetOneAlt?: string;
  cta?: string;
  caption?: string;
  hashtags?: string[];
  // WHY optional _key: assigned client-side only, during TwitterContent.tsx's edit-mode
  // draft (a stable React key for a tweet being edited, since tw.text mutates per keystroke
  // and can't be used as the key itself) — never present on server-sourced content.
  tweets?: { number: number; text: string; _key?: string }[];
  slideNumber?: number;
}

// WHY separate from PlatformContent: video script output (agents/writer.ts's video-script
// platform) has a structurally distinct shape — nested hook/cta objects with duration/visual
// metadata and a segments array — not a variant of the flat hook/body/cta/caption shape the
// other platforms share. Mirrors the fields VideoScriptContent.tsx actually reads.
export interface VideoScriptSegment {
  number?: number;
  duration?: string;
  script?: string;
  broll?: string;
  caption?: string;
}

export interface VideoScriptHookOrCta {
  text?: string;
  duration?: string;
  visual?: string;
}

export interface VideoScriptContentData {
  hook: VideoScriptHookOrCta;
  segments: VideoScriptSegment[];
  cta: VideoScriptHookOrCta;
  speakerNotes?: string;
  hashtags?: string[];
  totalDuration?: string;
}

export interface CreateJobInput {
  topic: string;
  platform: string;
  tone: string;
  targetAudience: string;
}

export interface BatchJobInput {
  items: CreateJobInput[];
  tone?: string;
  targetAudience?: string;
}
