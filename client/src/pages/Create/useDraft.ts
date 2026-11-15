import { useCallback, useEffect, useRef, useState } from 'react';
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
  // WHY: Create form state only syncs once draftScopeId matches the live user —
  // otherwise a scope switch would briefly apply the previous account's draft.
  draftScopeId: string | null;
  setDraft: (patch: Partial<CreateDraft>) => void;
  clearDraft: () => void;
  draftWriteFailed: boolean;
  dismissDraftWriteFailed: () => void;
} {
  const { userId } = useAuth();
  const scopeId = userId ?? null;
  const [draft, setDraftState] = useState<Partial<CreateDraft>>(() => initialDraft(scopeId));
  const [draftScopeId, setDraftScopeId] = useState<string | null>(scopeId);
  const [draftWriteFailed, setDraftWriteFailed] = useState(false);
  const loadedFor = useRef<string | null>(scopeId);
  // WHY: ref mirrors the latest merged draft so two setDraft calls in one tick
  // don't write from a stale render-closure `draft` and drop the first patch.
  const draftRef = useRef<Partial<CreateDraft>>(draft);

  // WHY: if the signed-in user changes while this hook stays mounted, drop the old
  // user's in-memory draft and load the new user's.
  useEffect(() => {
    if (loadedFor.current === scopeId) return;
    loadedFor.current = scopeId;
    const fresh = initialDraft(scopeId);
    draftRef.current = fresh;
    setDraftState(fresh);
    setDraftScopeId(scopeId);
  }, [scopeId]);

  function setDraft(patch: Partial<CreateDraft>): void {
    const next = { ...draftRef.current, ...patch };
    draftRef.current = next;
    // SECURITY: never write under the anon bucket — Clerk userId may still be
    // null on first paint; persisting then would leak the next account's draft.
    if (scopeId) {
      // WHY: write outside the setState updater: updaters must be pure (StrictMode runs
      // them twice) and must not call other setters.
      try {
        sessionStorage.setItem(userScopedKey(DRAFT_KEY, scopeId), JSON.stringify(next));
      } catch {
        // storage unavailable (private mode, quota) — surfaced via draftWriteFailed
        setDraftWriteFailed(true);
      }
    }
    setDraftState(next);
  }

  function clearDraft(): void {
    if (scopeId) {
      try {
        sessionStorage.removeItem(userScopedKey(DRAFT_KEY, scopeId));
      } catch {
        // storage unavailable — nothing to clear
      }
    }
    draftRef.current = {};
    setDraftState({});
  }

  // WHY: stable callback — Create's auto-dismiss effect depended on an inline
  // dismiss that changed every setDraft keystroke and restarted the 4s timer.
  const dismissDraftWriteFailed = useCallback((): void => {
    setDraftWriteFailed(false);
  }, []);

  return {
    draft,
    draftScopeId,
    setDraft,
    clearDraft,
    draftWriteFailed,
    dismissDraftWriteFailed,
  };
}
