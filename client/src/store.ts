// WHY: Zustand (not React Query or Context): this store holds real-time state
// that changes rapidly during SSE streaming (progress %, stage name, agent logs).
// React Query is optimized for server-round-trips, not sub-second UI updates.
// Context re-renders the full tree on every update — Zustand is selector-based.
import { create } from 'zustand';
import type { SSEEvent } from './types/job';
import { migrateLegacyKey, userScopedKey } from './lib/userScopedStorage';

// WHY: prediction/sourceUrl stay optional in the type guard: older localStorage rows lack
// them — requiring the fields would discard every saved idea on the next read.
export interface IdeaPrediction {
  tier: 'high' | 'medium' | 'low';
  topReason: string;
}

export interface IdeatedIdea {
  // WHY: optional: ideas persisted before ids existed get one assigned on read
  id?: string;
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
  return 'nightshade';
}

const IDEATED_IDEAS_STORAGE_KEY = 'contentagent-ideated-ideas';

// WHY: stable ids: Ideate's regenerate/dismiss used array indices, which race when
// two operations overlap; ids survive reordering.
function newIdeaId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `idea-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function withIdeaIds<T extends IdeatedIdea>(ideas: T[]): T[] {
  return ideas.map((idea) => (idea.id ? idea : { ...idea, id: newIdeaId() }));
}

// SECURITY: all persisted idea keys are per-user so a second account on the same
// browser never sees the previous account's ideas.
function ideasKey(userId: string | null): string {
  return userScopedKey(IDEATED_IDEAS_STORAGE_KEY, userId);
}

// WHY: persisted (unlike sseConnection): the user asked for generated
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

function readStoredIdeas(userId: string | null): IdeatedIdea[] {
  try {
    const stored = localStorage.getItem(ideasKey(userId));
    if (!stored) return [];
    const parsed: unknown = JSON.parse(stored);
    if (!Array.isArray(parsed)) return [];
    return withIdeaIds(parsed.filter(isIdeatedIdea));
  } catch {
    // WHY: localStorage can throw in private-browsing/disabled-storage contexts,
    // and stored JSON could be corrupted/stale-shaped — fall back to empty either way
    return [];
  }
}

function writeStoredIdeas(userId: string | null, ideas: IdeatedIdea[]): void {
  try {
    localStorage.setItem(ideasKey(userId), JSON.stringify(ideas));
  } catch {
    // WHY: same private-browsing guard as theme storage — ideas still apply for this session
  }
}

const IDEAS_GENERATED_AT_STORAGE_KEY = 'contentagent-ideas-generated-at';

function readStoredGeneratedAt(userId: string | null): string | null {
  try {
    return localStorage.getItem(userScopedKey(IDEAS_GENERATED_AT_STORAGE_KEY, userId));
  } catch {
    return null;
  }
}

function writeStoredGeneratedAt(userId: string | null, iso: string | null): void {
  try {
    const key = userScopedKey(IDEAS_GENERATED_AT_STORAGE_KEY, userId);
    if (iso) {
      localStorage.setItem(key, iso);
    } else {
      localStorage.removeItem(key);
    }
  } catch {
    // WHY: same private-browsing guard as theme storage
  }
}

const SAVED_IDEAS_STORAGE_KEY = 'contentagent-saved-ideas';

// WHY: a separate list from ideatedIdeas: the generated batch is always fully replaced on
// regenerate, so anything worth keeping past the next click needs its own persisted list —
// bookmarking an idea shouldn't be undone by clicking "Regenerate ideas" later.
export interface SavedIdea extends IdeatedIdea {
  savedAt: string;
}

function isSavedIdea(value: unknown): value is SavedIdea {
  if (!isIdeatedIdea(value)) return false;
  return typeof (value as unknown as Record<string, unknown>).savedAt === 'string';
}

function readStoredSavedIdeas(userId: string | null): SavedIdea[] {
  try {
    const stored = localStorage.getItem(userScopedKey(SAVED_IDEAS_STORAGE_KEY, userId));
    if (!stored) return [];
    const parsed: unknown = JSON.parse(stored);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isSavedIdea);
  } catch {
    return [];
  }
}

function writeStoredSavedIdeas(userId: string | null, ideas: SavedIdea[]): void {
  try {
    localStorage.setItem(userScopedKey(SAVED_IDEAS_STORAGE_KEY, userId), JSON.stringify(ideas));
  } catch {
    // WHY: same private-browsing guard as theme storage
  }
}

interface AppState {
  // WHY: no currentJob mirror: useJobData owns live progress — duplicating it here only re-rendered.
  sseConnection: EventSource | null;
  ideatedIdeas: IdeatedIdea[];
  ideasGeneratedAt: string | null;
  savedIdeas: SavedIdea[];
  activeUserId: string | null;
  themeName: ThemeName;

  connectToStream: (jobId: string, token?: string, onEvent?: (data: SSEEvent) => void, onError?: () => void) => void;
  disconnectStream: () => void;
  // WHY: options.preserveGeneratedAt for dismiss / single-card regenerate —
  // those mutate the batch without a new generation, so "Generated X ago"
  // must stay tied to the last full Suggest/Regenerate run.
  // WHY: forUserId drops stale generate/regenerate writes after an account switch mid-request
  setIdeatedIdeas: (
    ideas: IdeatedIdea[],
    options?: { preserveGeneratedAt?: boolean; forUserId?: string | null },
  ) => void;
  saveIdea: (idea: IdeatedIdea) => void;
  unsaveIdea: (id: string) => void;
  setTheme: (theme: ThemeName) => void;
  setActiveUser: (userId: string | null) => void;
  resetUserScopedState: () => void;
}

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

export const useAppStore = create<AppState>((set, get) => ({
  sseConnection: null,
  // WHY: empty until setActiveUser(userId): userId isn't known at module load
  ideatedIdeas: [],
  ideasGeneratedAt: null,
  savedIdeas: [],
  activeUserId: null,
  themeName: readStoredTheme(),

  connectToStream: (jobId: string, token?: string, onEvent?: (data: SSEEvent) => void, onError?: () => void) => {
    const existing = get().sseConnection;
    if (existing) {
      existing.close();
    }

    // WHY: ?token= query param: EventSource cannot send Authorization headers.
    // The token is a short-lived Redis UUID from POST /stream-token (not a Clerk
    // session JWT) — verifySSEToken() looks it up server-side.
    const tokenParam = token ? `?token=${encodeURIComponent(token)}` : '';
    const url = `${API_BASE}/api/jobs/${jobId}/stream${tokenParam}`;
    const eventSource = new EventSource(url);

    eventSource.onmessage = (event) => {
      try {
        // WHY: unknown then guard: JSON.parse's return type is implicitly `any`; treat the
        // wire payload as unknown and confirm it's a non-null object before trusting it as
        // an SSEEvent, since the server payload isn't compile-time checked from here.
        const parsed: unknown = JSON.parse(event.data);
        if (typeof parsed !== 'object' || parsed === null) return;
        const data = parsed as SSEEvent;
        // WHY: onEvent only (no Zustand job mirror): useJobData merges into jobData.
        onEvent?.(data);

        // WHY: close on terminal: an open EventSource keeps retrying with an expired stream token.
        if (data.stage === 'done' || data.stage === 'failed') {
          eventSource.close();
          set({ sseConnection: null });
        }
      } catch (_e) {
        // NOTE: SSE parse errors are logged server-side; no need for console.error in production
      }
    };

    // WHY: onError + es.close(): native EventSource retries the same expired ?token= forever;
    // useJobData fetches a fresh stream token and reconnects (polling alone is too slow).
    eventSource.onerror = () => {
      console.warn('SSE connection error, will retry...');
      eventSource.close();
      set({ sseConnection: null });
      onError?.();
    };

    set({ sseConnection: eventSource });
  },

  disconnectStream: () => {
    const connection = get().sseConnection;
    if (connection) {
      connection.close();
    }
    set({ sseConnection: null });
  },

  setIdeatedIdeas: (ideas, options) => {
    const userId = get().activeUserId;
    // WHY: Ideate captures activeUserId at request start — a late response after
    // setActiveUser must not overwrite the new account's ideas / localStorage.
    if (options?.forUserId !== undefined && options.forUserId !== userId) return;
    const withIds = withIdeaIds(ideas);
    writeStoredIdeas(userId, withIds);
    if (options?.preserveGeneratedAt) {
      set({ ideatedIdeas: withIds });
      return;
    }
    const generatedAt = new Date().toISOString();
    writeStoredGeneratedAt(userId, generatedAt);
    set({ ideatedIdeas: withIds, ideasGeneratedAt: generatedAt });
  },

  saveIdea: (idea) => {
    set((state) => {
      // WHY: keyed by id, not title — two distinct ideas can share a title.
      const id = idea.id ?? newIdeaId();
      if (state.savedIdeas.some((s) => s.id === id)) return state;
      const next = [{ ...idea, id, savedAt: new Date().toISOString() }, ...state.savedIdeas];
      writeStoredSavedIdeas(state.activeUserId, next);
      return { savedIdeas: next };
    });
  },

  unsaveIdea: (id) => {
    set((state) => {
      const next = state.savedIdeas.filter((s) => s.id !== id);
      writeStoredSavedIdeas(state.activeUserId, next);
      return { savedIdeas: next };
    });
  },

  setActiveUser: (userId) => {
    if (get().activeUserId === userId) return;
    if (userId) {
      migrateLegacyKey(localStorage, IDEATED_IDEAS_STORAGE_KEY, userId);
      migrateLegacyKey(localStorage, SAVED_IDEAS_STORAGE_KEY, userId);
      migrateLegacyKey(localStorage, IDEAS_GENERATED_AT_STORAGE_KEY, userId);
    }
    set({
      activeUserId: userId,
      ideatedIdeas: userId ? readStoredIdeas(userId) : [],
      ideasGeneratedAt: userId ? readStoredGeneratedAt(userId) : null,
      savedIdeas: userId ? readStoredSavedIdeas(userId) : [],
    });
  },

  // WHY: in-memory only: persisted data stays under the user's own scoped keys
  // for their next login; we just stop showing it to whoever is current.
  resetUserScopedState: () => {
    get().disconnectStream();
    set({ activeUserId: null, ideatedIdeas: [], ideasGeneratedAt: null, savedIdeas: [] });
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
