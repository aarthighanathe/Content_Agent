// NOTE: PNG/PDF/TXT/HTML downloads all live in ExportModal.tsx. This hook now only owns
// "copy all text" — the former exportSlidesPNG()/html2canvas fallback here was never
// wired to any button and still targeted the pre-SSR export contract, so it was removed
// rather than left to drift further out of sync with the real export path.
import { useState } from 'react';
import { flattenContentToText } from '../../../lib/contentFlattener.js';

// NOTE: content's shape varies by platform (carousel slide array, LinkedIn hook/body/cta,
// Twitter thread, etc. — see ExportModal.tsx for the same union informally). unknown here
// forces each branch below to check before reading a field, unlike `any`.
type ExportableContent = unknown;

export function useExport(content: ExportableContent) {
  const [copied, setCopied] = useState(false);

  function copyAllText(): void {
    if (!content) return;
    const t = flattenContentToText(content);

    // WHY setCopied only in .then(), not unconditionally after: clipboard access can be
    // denied by browser permissions/focus state — this previously flashed "Copied!" even
    // when the write silently failed, falsely claiming success (FUNCTIONAL_AUDIT_2026-07.md
    // finding #16).
    navigator.clipboard.writeText(t).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {
      // WHY still swallowed, not surfaced as an error: this is a "nice to have" copy
      // button, not a critical action — skipping the success flash is enough feedback.
    });
  }

  return { copied, setCopied, copyAllText };
}
