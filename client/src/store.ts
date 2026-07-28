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

export interface IdeatedIdea {
  title: string;
  platform: string;
  angle: string;
  why: string;
}

interface AppState {
  currentJob: CurrentJob | null;
  sseConnection: EventSource | null;
  userProfile: UserProfile;
  ideatedIdeas: IdeatedIdea[];

  setCurrentJob: (job: CurrentJob | null) => void;
  updateFromSSE: (data: SSEEvent) => void;
  connectToStream: (jobId: string, token?: string, onEvent?: (data: SSEEvent) => void, onError?: () => void) => void;
  disconnectStream: () => void;
  setUserProfile: (profile: Partial<UserProfile>) => void;
  setIdeatedIdeas: (ideas: IdeatedIdea[]) => void;
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
  ideatedIdeas: [],

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
      } catch (e) {
        console.error('SSE parse error:', e);
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

  setIdeatedIdeas: (ideas) => set({ ideatedIdeas: ideas }),
}));
