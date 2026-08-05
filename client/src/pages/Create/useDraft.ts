import { useState } from 'react';

export interface CreateDraft {
  platform: string;
  topic: string;
  tone: string;
  targetAudience: string;
}

const DRAFT_KEY = 'ca_create_draft';

function readDraft(): Partial<CreateDraft> {
  try {
    return JSON.parse(sessionStorage.getItem(DRAFT_KEY) || '{}');
  } catch {
    return {};
  }
}

// WHY sessionStorage + explicit clearDraft(): the wizard used to lose topic/tone/
// audience whenever the user followed the "Edit brand voice" link to /brand and
// came back, since all Create state was local useState wiped on unmount. This
// persists the draft across that round trip but clears it once a job is actually
// submitted, so it doesn't resurrect stale input days later.
//
// WHY draftWriteFailed instead of a toast inside this hook: this repo has no
// shared toast component (Brand.tsx/useLibraryData.ts each implement the same
// { message, isError } | null + flashToast pattern locally rather than sharing
// one) — this hook exposes a boolean flag and lets the calling page (Create.tsx)
// render it through whatever toast affordance it already uses, instead of this
// hook inventing its own UI.
export function useDraft() {
  const [draft, setDraftState] = useState<Partial<CreateDraft>>(readDraft);
  const [draftWriteFailed, setDraftWriteFailed] = useState(false);

  function setDraft(patch: Partial<CreateDraft>) {
    setDraftState((prev) => {
      const next = { ...prev, ...patch };
      try {
        sessionStorage.setItem(DRAFT_KEY, JSON.stringify(next));
      } catch {
        // storage unavailable (private mode, quota) — draft just won't persist;
        // surfaced to the caller via draftWriteFailed instead of failing silently.
        setDraftWriteFailed(true);
      }
      return next;
    });
  }

  function clearDraft() {
    try {
      sessionStorage.removeItem(DRAFT_KEY);
    } catch {
      // storage unavailable — nothing to clear
    }
    setDraftState({});
  }

  return { draft, setDraft, clearDraft, draftWriteFailed, dismissDraftWriteFailed: () => setDraftWriteFailed(false) };
}
