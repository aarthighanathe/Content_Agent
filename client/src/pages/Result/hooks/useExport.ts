// NOTE: PNG/PDF/TXT/HTML downloads live in ExportModal.tsx; this hook only owns
// "copy all text".
import { useState } from 'react';
import { flattenContentToText } from '../../../lib/contentFlattener.js';
import { useTrackedTimeout } from '../../../hooks/useTrackedTimeout';

// WHY: unknown: content's shape varies by platform, so each branch below must check
// before reading a field.
type ExportableContent = unknown;

export function useExport(content: ExportableContent) {
  const [copied, setCopied] = useState(false);
  const pendingTimers = useTrackedTimeout();

  function copyAllText(): void {
    if (!content) return;
    const t = flattenContentToText(content);

    // WHY: setCopied only in .then(): clipboard access can be denied by permissions/focus,
    // and flashing "Copied!" after a silent failure would claim false success.
    navigator.clipboard.writeText(t).then(() => {
      setCopied(true);
      // WHY: useTrackedTimeout: clear on unmount so a navigated-away Result doesn't
      // setState after the 2s flash timer.
      pendingTimers.set(() => setCopied(false), 2000);
    }).catch(() => {
      // WHY: still swallowed, not surfaced as an error: this is a "nice to have" copy
      // button, not a critical action — skipping the success flash is enough feedback.
    });
  }

  return { copied, setCopied, copyAllText };
}
