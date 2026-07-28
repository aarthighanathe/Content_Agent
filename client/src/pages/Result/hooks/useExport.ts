// NOTE: PNG/PDF/TXT/HTML downloads all live in ExportModal.tsx. This hook now only owns
// "copy all text" — the former exportSlidesPNG()/html2canvas fallback here was never
// wired to any button and still targeted the pre-SSR export contract, so it was removed
// rather than left to drift further out of sync with the real export path.
import { useState } from 'react';

// NOTE: content's shape varies by platform (carousel slide array, LinkedIn hook/body/cta,
// Twitter thread, etc. — see ExportModal.tsx for the same union informally). unknown here
// forces each branch below to check before reading a field, unlike `any`.
type ExportableContent = unknown;

interface CarouselSlide { headline?: string; body?: string }
interface TweetThread { tweets?: { text?: string }[] }
interface VideoScript {
  hook?: { text?: string } | string;
  segments?: { number?: number; script?: string }[];
  cta?: { text?: string } | string;
  hashtags?: string[];
}
interface CaptionContent { caption?: string; hashtags?: string[] }
interface StandardPost { hook?: string; body?: string; cta?: string; hashtags?: string[] }

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function useExport(content: ExportableContent) {
  const [copied, setCopied] = useState(false);

  function copyAllText(): void {
    if (!content) return;
    let t = '';

    if (Array.isArray(content)) {
      (content as CarouselSlide[]).forEach((s) => { t += `${s.headline ?? ''}\n${s.body ?? ''}\n\n`; });
    } else if (isRecord(content) && Array.isArray((content as TweetThread).tweets)) {
      (content as TweetThread).tweets!.forEach((tw) => { t += `${tw.text ?? ''}\n\n`; });
    } else if (isRecord(content) && typeof (content as CaptionContent).caption === 'string') {
      const c = content as CaptionContent;
      t = `${c.caption}\n\n${c.hashtags?.join(' ') ?? ''}`;
    } else if (isRecord(content) && Array.isArray((content as VideoScript).segments)) {
      const c = content as VideoScript;
      const hookText = typeof c.hook === 'string' ? c.hook : c.hook?.text ?? '';
      const ctaText = typeof c.cta === 'string' ? c.cta : c.cta?.text ?? '';
      const segments = (c.segments ?? [])
        .map((s) => `[Seg ${s.number ?? ''}]\n${s.script ?? ''}`)
        .join('\n\n');
      t = `[HOOK]\n${hookText}\n\n${segments}\n\n[CTA]\n${ctaText}\n\n${c.hashtags?.join(' ') ?? ''}`;
    } else if (isRecord(content)) {
      const c = content as StandardPost;
      t = `${c.hook ?? ''}\n\n${c.body ?? ''}\n\n${c.cta ?? ''}\n\n${c.hashtags?.join(' ') ?? ''}`;
    }

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
