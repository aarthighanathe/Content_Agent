// WHY Zustand (not React Query or Context): this store holds real-time state
// that changes rapidly during SSE streaming (progress %, stage name, agent logs).
// React Query is optimized for server-round-trips, not sub-second UI updates.
// Context re-renders the full tree on every update — Zustand is selector-based.
import { create } from 'zustand';
import type { SSEEvent } from './types/job';

interface AgentLog {
  agentName: string;
  action: string;
  inputSummary?: string;
  outputSummary?: string;
  durationMs?: number;
}

interface CurrentJob {
  jobId: string;
  status: string;
  progress: number;
  stage: string;
  message?: string;
  agentLogs: AgentLog[];
}

interface UserProfile {
  brandName: string;
  brandVoice: string;
  phrasesUse: string;
  phrasesAvoid: string;
  industry?: string;
}

// WHY prediction/sourceUrl are optional, not added to isIdeatedIdea's
// required-field checks below: existing localStorage data from before this
// change (I3/I4) has neither field — making them required would silently
// drop every previously-saved/ideated idea the next time the type guard
// runs. Old ideas without a tier/sourceUrl simply render without that extra
// UI, same "prefer optional" guidance the task itself calls for.
export interface IdeaPrediction {
  tier: 'high' | 'medium' | 'low';
  topReason: string;
}

export interface IdeatedIdea {
  title: string;
  platform: string;
  angle: string;
  why: string;
  sourceUrl?: string;
  prediction?: IdeaPrediction;
}

export type ThemeName =
  | 'aurora'
  | 'deep-marine'
  | 'obsidian-ember'
  | 'nightshade'
  | 'ink-verdigris'
  | 'carbon-signal';

const THEME_STORAGE_KEY = 'contentagent-theme';
const VALID_THEMES: readonly ThemeName[] = [
  'aurora',
  'deep-marine',
  'obsidian-ember',
  'nightshade',
  'ink-verdigris',
  'carbon-signal',
];

function readStoredTheme(): ThemeName {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored && (VALID_THEMES as readonly string[]).includes(stored)) {
      return stored as ThemeName;
    }
  } catch {
    // WHY: localStorage can throw in private-browsing/disabled-storage contexts — fall through to default
  }
  return 'aurora';
}

const IDEATED_IDEAS_STORAGE_KEY = 'contentagent-ideated-ideas';

// WHY persisted (unlike currentJob/sseConnection): the user asked for generated
// ideas to survive a hard refresh, not just in-app navigation — they should only
// change when "Suggest 10 topics" / "Regenerate ideas" is clicked again.
function isIdeatedIdea(value: unknown): value is IdeatedIdea {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.title === 'string' &&
    typeof v.platform === 'string' &&
    typeof v.angle === 'string' &&
    typeof v.why === 'string'
  );
}

function readStoredIdeas(): IdeatedIdea[] {
  try {
    const stored = localStorage.getItem(IDEATED_IDEAS_STORAGE_KEY);
    if (!stored) return [];
    const parsed: unknown = JSON.parse(stored);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isIdeatedIdea);
  } catch {
    // WHY: localStorage can throw in private-browsing/disabled-storage contexts,
    // and stored JSON could be corrupted/stale-shaped — fall back to empty either way
    return [];
  }
}

function writeStoredIdeas(ideas: IdeatedIdea[]): void {
  try {
    localStorage.setItem(IDEATED_IDEAS_STORAGE_KEY, JSON.stringify(ideas));
  } catch {
    // WHY: same private-browsing guard as theme storage — ideas still apply for this session
  }
}

const IDEAS_GENERATED_AT_STORAGE_KEY = 'contentagent-ideas-generated-at';

function readStoredGeneratedAt(): string | null {
  try {
    return localStorage.getItem(IDEAS_GENERATED_AT_STORAGE_KEY);
  } catch {
    return null;
  }
}

function writeStoredGeneratedAt(iso: string | null): void {
  try {
    if (iso) {
      localStorage.setItem(IDEAS_GENERATED_AT_STORAGE_KEY, iso);
    } else {
      localStorage.removeItem(IDEAS_GENERATED_AT_STORAGE_KEY);
    }
  } catch {
    // WHY: same private-browsing guard as theme storage
  }
}

const SAVED_IDEAS_STORAGE_KEY = 'contentagent-saved-ideas';

// WHY a separate list from ideatedIdeas: the generated batch is always fully replaced on
// regenerate, so anything worth keeping past the next click needs its own persisted list —
// bookmarking an idea shouldn't be undone by clicking "Regenerate ideas" later.
export interface SavedIdea extends IdeatedIdea {
  savedAt: string;
}

function isSavedIdea(value: unknown): value is SavedIdea {
  if (!isIdeatedIdea(value)) return false;
  return typeof (value as unknown as Record<string, unknown>).savedAt === 'string';
}

function readStoredSavedIdeas(): SavedIdea[] {
  try {
    const stored = localStorage.getItem(SAVED_IDEAS_STORAGE_KEY);
    if (!stored) return [];
    const parsed: unknown = JSON.parse(stored);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isSavedIdea);
  } catch {
    return [];
  }
}

function writeStoredSavedIdeas(ideas: SavedIdea[]): void {
  try {
    localStorage.setItem(SAVED_IDEAS_STORAGE_KEY, JSON.stringify(ideas));
  } catch {
    // WHY: same private-browsing guard as theme storage
  }
}

interface AppState {
  currentJob: CurrentJob | null;
  sseConnection: EventSource | null;
  userProfile: UserProfile;
  ideatedIdeas: IdeatedIdea[];
  ideasGeneratedAt: string | null;
  savedIdeas: SavedIdea[];
  themeName: ThemeName;

  setCurrentJob: (job: CurrentJob | null) => void;
  updateFromSSE: (data: SSEEvent) => void;
  connectToStream: (jobId: string, token?: string, onEvent?: (data: SSEEvent) => void, onError?: () => void) => void;
  disconnectStream: () => void;
  setUserProfile: (profile: Partial<UserProfile>) => void;
  setIdeatedIdeas: (ideas: IdeatedIdea[]) => void;
  saveIdea: (idea: IdeatedIdea) => void;
  unsaveIdea: (title: string) => void;
  setTheme: (theme: ThemeName) => void;
}

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

export const useAppStore = create<AppState>((set, get) => ({
  currentJob: null,
  sseConnection: null,
  // WHY brandVoice starts empty, not 'professional': Create.tsx's "brand voice
  // configured" banner checks `brandName || brandVoice` truthiness — a default of
  // 'professional' made that check always true, so the banner claimed a brand
  // voice was active for every brand-new user who'd never touched Brand Settings
  // (FUNCTIONAL_AUDIT_2026-07.md finding #8). The server's own fallback to
  // 'professional' during generation (writer.ts) is separate and unaffected —
  // this only changes what the UI displays, not what tone actually gets sent.
  userProfile: {
    brandName: '',
    brandVoice: '',
    phrasesUse: '',
    phrasesAvoid: '',
    industry: '',
  },
  ideatedIdeas: readStoredIdeas(),
  ideasGeneratedAt: readStoredGeneratedAt(),
  savedIdeas: readStoredSavedIdeas(),
  themeName: readStoredTheme(),

  setCurrentJob: (job) => set({ currentJob: job }),

  updateFromSSE: (data) => {
    const current = get().currentJob;

    // If currentJob isn't set yet (e.g. hard refresh), bootstrap it from the event
    if (!current) {
      if (data.type === 'progress' || data.type === 'state') {
        set({
          currentJob: {
            jobId: data.jobId || '',
            status: data.stage || 'pending',
            progress: data.progress ?? 0,
            stage: data.stage || 'pending',
            message: data.message || '',
            agentLogs: data.agent
              ? [{ agentName: data.agent, action: data.message || '', durationMs: data.durationMs }]
              : [],
          },
        });
      }
      return;
    }

    set({
      currentJob: {
        ...current,
        status: data.stage || current.status,
        progress: data.progress ?? current.progress,
        stage: data.stage || current.stage,
        message: data.message || current.message,
        agentLogs: data.agent
          ? [
              ...current.agentLogs,
              {
                agentName: data.agent,
                action: data.message || data.stage || '',
                durationMs: data.durationMs,
              },
            ]
          : current.agentLogs,
      },
    });
  },

  connectToStream: (jobId: string, token?: string, onEvent?: (data: SSEEvent) => void, onError?: () => void) => {
    const existing = get().sseConnection;
    if (existing) {
      existing.close();
    }

    // WHY ?token= query param: the EventSource API (SSE) does not support custom
    // request headers — Clerk JWTs can't be sent the normal way. The server verifies
    // the JWT from the query param instead. Short-lived tokens mitigate the exposure.
    const tokenParam = token ? `?token=${encodeURIComponent(token)}` : '';
    const url = `${API_BASE}/api/jobs/${jobId}/stream${tokenParam}`;
    const eventSource = new EventSource(url);

    eventSource.onmessage = (event) => {
      try {
        // WHY unknown then guard: JSON.parse's return type is implicitly `any`; treat the
        // wire payload as unknown and confirm it's a non-null object before trusting it as
        // an SSEEvent, since the server payload isn't compile-time checked from here.
        const parsed: unknown = JSON.parse(event.data);
        if (typeof parsed !== 'object' || parsed === null) return;
        const data = parsed as SSEEvent;
        get().updateFromSSE(data);
        onEvent?.(data);

        if (data.stage === 'done' || data.stage === 'failed' || data.type === 'state') {
          // Don't close — let the component handle it
        }
      } catch (_e) {
        // NOTE: SSE parse errors are logged server-side; no need for console.error in production
      }
    };

    // WHY onError callback, not just a console.warn: the browser's native EventSource
    // auto-retries the *same* URL/token forever — once the short-lived stream-token
    // expires (15 min), every retry 401s silently with no way to recover on its own.
    // onError lets the caller (useJobData.ts) fetch a fresh token and reopen the
    // connection instead of relying entirely on the separate REST-polling backstop
    // (FUNCTIONAL_AUDIT_2026-07.md finding #27).
    eventSource.onerror = () => {
      console.warn('SSE connection error, will retry...');
      onError?.();
    };

    set({
      sseConnection: eventSource,
      currentJob: {
        jobId,
        status: 'pending',
        progress: 0,
        stage: 'pending',
        agentLogs: [],
      },
    });
  },

  disconnectStream: () => {
    const connection = get().sseConnection;
    if (connection) {
      connection.close();
    }
    set({ sseConnection: null });
  },

  setUserProfile: (profile) => {
    set((state) => ({
      userProfile: { ...state.userProfile, ...profile },
    }));
  },

  setIdeatedIdeas: (ideas) => {
    const generatedAt = new Date().toISOString();
    writeStoredIdeas(ideas);
    writeStoredGeneratedAt(generatedAt);
    set({ ideatedIdeas: ideas, ideasGeneratedAt: generatedAt });
  },

  saveIdea: (idea) => {
    set((state) => {
      if (state.savedIdeas.some((s) => s.title === idea.title)) return state;
      const next = [{ ...idea, savedAt: new Date().toISOString() }, ...state.savedIdeas];
      writeStoredSavedIdeas(next);
      return { savedIdeas: next };
    });
  },

  unsaveIdea: (title) => {
    set((state) => {
      const next = state.savedIdeas.filter((s) => s.title !== title);
      writeStoredSavedIdeas(next);
      return { savedIdeas: next };
    });
  },

  setTheme: (theme) => {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // WHY: same private-browsing guard as readStoredTheme — theme still applies for this session
    }
    document.documentElement.setAttribute('data-theme', theme);
    set({ themeName: theme });
  },
}));
