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
}

export interface ProfileStats {
  totalPosts: number;
  avgScore: number;
  bestPlatform: string;
  platformBreakdown?: ProfilePlatformBreakdown[];
  quickTips?: string[];
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
  // WHY unknown[]: raw DB rows (contentJobs/templates) passed through as-is by the export
  // route — not remodeled into the client's ContentJob/Template shapes.
  contentJobs: unknown[];
  templates: unknown[];
  connectedSocialAccounts: ExportedSocialAccount[];
  onboarding: unknown | null;
}

export interface SocialConnection {
  platform: string;
  label: string;
  connected: boolean;
  displayName: string | null;
}

export interface Template {
  id: string;
  name: string;
  platform: string;
  topic?: string;
  hookStyle?: string;
  structure?: string;
  ctaPattern?: string;
  contentSample?: string | null;
  userId: string;
  createdAt: string;
  updatedAt: string;
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
