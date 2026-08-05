export interface ApiError {
  error: string;
  code: string;
  retryable: boolean;
  details?: Record<string, unknown>;
}

export interface ApiSuccess<T = unknown> {
  success: true;
  data: T;
}

export interface ContentDna {
  avgSentenceWords?: number;
  hookPattern?: string;
  emojiFrequency?: string;
  ctaStyle?: string;
  structuralSignature?: string;
  vocabularyLevel?: string;
  writingPersonality?: string;
}

export interface ProfilePlatformBreakdown {
  platform: string;
  avgScore: number;
  count: number;
}

// Critic agent's 5 scoring dimensions (0-20 each, see server/src/agents/critic.ts).
export interface DimensionAverages {
  hookStrength: number;
  platformCompliance: number;
  brandVoiceMatch: number;
  valueDelivery: number;
  ctaClarity: number;
}

// One completed job's dimension scores, chronologically ordered — powers the
// quality trend line chart. `date` is the job's createdAt (ISO string).
export interface DimensionTrendPoint extends DimensionAverages {
  date: string;
  jobId: string;
}

// PerformancePredictor's tier is qualitative (no fabricated reach/saves/shares
// numbers — see server/src/agents/performancePredictor.ts) — this is a count
// distribution across the user's completed jobs' most recent prediction.
export interface PredictionTierCounts {
  high: number;
  medium: number;
  low: number;
}

export interface ProfileStats {
  totalPosts: number;
  avgScore: number;
  mostUsedPlatform: string;
  platformBreakdown?: ProfilePlatformBreakdown[];
  quickTips?: string[];
  // null when the user has no completed jobs with critic scores yet (empty state).
  dimensionAverages?: DimensionAverages | null;
  dimensionTrend?: DimensionTrendPoint[];
  predictionTierCounts?: PredictionTierCounts;
  // Most recent prediction's one-sentence "biggest factor" — null until the
  // user has at least one job created after the prediction-persistence feature
  // shipped (2026-08-04); all pre-existing jobs have zero prediction rows.
  latestPredictionTopReason?: string | null;
}

export interface Profile {
  brandName?: string;
  brandVoice?: string;
  phrasesUse?: string;
  phrasesAvoid?: string;
  industry?: string;
  contentDna?: ContentDna;
  // GET /users/me computes these from the user's job history (see routes/users.ts).
  stats?: ProfileStats;
}

export interface AnalyzeVoiceResponse {
  contentDna: ContentDna;
}

// GET /users/me/export — full account data dump (right-to-export)
export interface ExportedUser {
  id: string;
  email: string;
  brandName: string | null;
  brandVoice: string | null;
  phrasesUse: string | null;
  phrasesAvoid: string | null;
  createdAt: string;
}

export interface ExportedSocialAccount {
  id: string;
  platform: string;
  displayName: string | null;
  createdAt: string;
}

export interface ExportDataResponse {
  exportedAt: string;
  user: ExportedUser | null;
  // WHY unknown[]: raw DB rows (contentJobs) passed through as-is by the export
  // route — not remodeled into the client's ContentJob shape.
  contentJobs: unknown[];
  connectedSocialAccounts: ExportedSocialAccount[];
  onboarding: unknown | null;
}

export interface SocialConnection {
  platform: string;
  label: string;
  connected: boolean;
  displayName: string | null;
}

export interface SSEProgress {
  type: 'progress' | 'connected' | 'slide_ready';
  stage?: string;
  progress?: number;
  agent?: string;
  message?: string;
  durationMs?: number;
  slideIndex?: number;
  dataUrl?: string;
  theme?: string;
  jobId?: string;
  data?: { jobId: string };
}
