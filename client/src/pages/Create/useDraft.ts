import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { migrateLegacyKey, userScopedKey } from '../../lib/userScopedStorage';

export interface CreateDraft {
  platform: string;
  topic: string;
  tone: string;
  targetAudience: string;
  // WHY: optional competitor fields: Ideate/Competitor handoffs used to live
  // only on location.state, so a Brand round-trip dropped gap context even when
  // the topic survived in the draft.
  competitorContext?: string;
  competitorAnalysisId?: string;
  industry?: string;
}

const DRAFT_KEY = 'ca_create_draft';
const DEMO_HANDOFF_KEY = 'ca_demo_handoff';
const DEMO_HANDOFF_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const DRAFT_STRING_FIELDS = [
  'platform', 'topic', 'tone', 'targetAudience',
  'competitorContext', 'competitorAnalysisId', 'industry',
] as const;

// WHY: field-by-field guard: sessionStorage JSON can be stale/hand-edited, and a
// wrong-typed field would crash controlled inputs downstream.
function parseDraft(raw: string | null): Partial<CreateDraft> {
  if (!raw) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return {};
    const obj = parsed as Record<string, unknown>;
    const out: Partial<CreateDraft> = {};
    for (const field of DRAFT_STRING_FIELDS) {
      const value = obj[field];
      if (typeof value === 'string') out[field] = value;
    }
    return out;
  } catch {
    return {};
  }
}

// SECURITY: draft key is per-user so a shared tab never shows another account's draft.
function readDraft(userId: string | null): Partial<CreateDraft> {
  try {
    migrateLegacyKey(sessionStorage, DRAFT_KEY, userId);
    return parseDraft(sessionStorage.getItem(userScopedKey(DRAFT_KEY, userId)));
  } catch {
    return {};
  }
}

// WHY: localStorage demo handoff (F6): after LiveDemo → sign-up, Create should
// seed topic/platform from the last successful demo. Cleared once consumed.
function readAndConsumeDemoHandoff(): Partial<CreateDraft> {
  try {
    const raw = localStorage.getItem(DEMO_HANDOFF_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    localStorage.removeItem(DEMO_HANDOFF_KEY);
    if (!parsed || typeof parsed !== 'object') return {};
    const obj = parsed as Record<string, unknown>;
    const savedAt = typeof obj.savedAt === 'number' ? obj.savedAt : 0;
    if (savedAt > 0 && Date.now() - savedAt > DEMO_HANDOFF_TTL_MS) return {};
    const topic = typeof obj.topic === 'string' ? obj.topic.trim() : '';
    const platform = typeof obj.platform === 'string' ? obj.platform : '';
    if (!topic && !platform) return {};
    return {
      ...(topic ? { topic } : {}),
      ...(platform ? { platform } : {}),
    };
  } catch {
    return {};
  }
}

function initialDraft(userId: string | null): Partial<CreateDraft> {
  const draft = readDraft(userId);
  // Prefer an existing Create draft over a stale demo handoff.
  if (draft.topic || draft.platform) return draft;
  return { ...draft, ...readAndConsumeDemoHandoff() };
}

// WHY: sessionStorage + explicit clearDraft(): the wizard used to lose topic/tone/
// audience whenever the user followed the "Edit brand voice" link to /brand and
// came back, since all Create state was local useState wiped on unmount. This
// persists the draft across that round trip but clears it once a job is actually
// submitted, so it doesn't resurrect stale input days later.
//
// WHY: draftWriteFailed instead of a toast inside this hook: this repo has no
// shared toast component (Brand.tsx/useLibraryData.ts each implement the same
// { message, isError } | null + flashToast pattern locally rather than sharing
// one) — this hook exposes a boolean flag and lets the calling page (Create.tsx)
// render it through whatever toast affordance it already uses, instead of this
// hook inventing its own UI.
export function useDraft(): {
  draft: Partial<CreateDraft>;
  setDraft: (patch: Partial<CreateDraft>) => void;
  clearDraft: () => void;
  draftWriteFailed: boolean;
  dismissDraftWriteFailed: () => void;
} {
  const { userId } = useAuth();
  const scopeId = userId ?? null;
  const [draft, setDraftState] = useState<Partial<CreateDraft>>(() => initialDraft(scopeId));
  const [draftWriteFailed, setDraftWriteFailed] = useState(false);
  const loadedFor = useRef<string | null>(scopeId);

  // WHY: if the signed-in user changes while this hook stays mounted, drop the old
  // user's in-memory draft and load the new user's.
  useEffect(() => {
    if (loadedFor.current === scopeId) return;
    loadedFor.current = scopeId;
    setDraftState(initialDraft(scopeId));
  }, [scopeId]);

  function setDraft(patch: Partial<CreateDraft>): void {
    const next = { ...draft, ...patch };
    // WHY: write outside the setState updater: updaters must be pure (StrictMode runs
    // them twice) and must not call other setters.
    try {
      sessionStorage.setItem(userScopedKey(DRAFT_KEY, scopeId), JSON.stringify(next));
    } catch {
      // storage unavailable (private mode, quota) — surfaced via draftWriteFailed
      setDraftWriteFailed(true);
    }
    setDraftState((prev) => ({ ...prev, ...patch }));
  }

  function clearDraft(): void {
    try {
      sessionStorage.removeItem(userScopedKey(DRAFT_KEY, scopeId));
    } catch {
      // storage unavailable — nothing to clear
    }
    setDraftState({});
  }

  return {
    draft,
    setDraft,
    clearDraft,
    draftWriteFailed,
    dismissDraftWriteFailed: (): void => setDraftWriteFailed(false),
  };
}
