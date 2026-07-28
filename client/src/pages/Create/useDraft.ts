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
export function useDraft() {
  const [draft, setDraftState] = useState<Partial<CreateDraft>>(readDraft);

  function setDraft(patch: Partial<CreateDraft>) {
    setDraftState((prev) => {
      const next = { ...prev, ...patch };
      try {
        sessionStorage.setItem(DRAFT_KEY, JSON.stringify(next));
      } catch {
        // storage unavailable (private mode, quota) — draft just won't persist
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

  return { draft, setDraft, clearDraft };
}
