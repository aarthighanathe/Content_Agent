// WHY a shared content-to-text flattener: the same platform-specific content
// flattening logic was duplicated across ExportModal.tsx (exportText/exportPDF),
// useExport.ts (copyAllText), and PostPanel.tsx (getContentPreview). Each copy
// had slightly different field access and fallback strings, so adding a new
// platform or renaming a field required updating four files by hand. This shared
// helper ensures consistency and reduces maintenance burden.

interface CarouselSlide { type?: string; headline?: string; body?: string }
interface TweetThread { tweets?: { text?: string }[] }
interface VideoScript {
  hook?: { text?: string } | string;
  segments?: { number?: number; script?: string }[];
  cta?: { text?: string } | string;
  hashtags?: string[];
}
interface CaptionContent { caption?: string; hashtags?: string[] }
interface StandardPost { hook?: string; body?: string; cta?: string; caption?: string; hashtags?: string[] }

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function flattenContentToText(content: unknown): string {
  if (!content) return '';
  let text = '';

  if (Array.isArray(content)) {
    // Carousel slides
    (content as CarouselSlide[]).forEach((s) => {
      text += `${s.type ? `[${s.type}]\n` : ''}${s.headline ?? ''}\n${s.body ?? ''}\n\n`;
    });
  } else if (isRecord(content) && Array.isArray((content as TweetThread).tweets)) {
    // Twitter thread
    const tweets = (content as TweetThread).tweets!;
    tweets.forEach((t, i) => { text += `[${i + 1}/${tweets.length}]\n${t.text ?? ''}\n\n`; });
  } else if (isRecord(content) && Array.isArray((content as VideoScript).segments)) {
    // Video script
    const c = content as VideoScript;
    const hookText = typeof c.hook === 'string' ? c.hook : c.hook?.text ?? '';
    const ctaText = typeof c.cta === 'string' ? c.cta : c.cta?.text ?? '';
    const segments = (c.segments ?? [])
      .map((s) => `[Segment ${s.number ?? ''}]\n${s.script ?? ''}`)
      .join('\n\n');
    text = `[HOOK]\n${hookText}\n\n${segments}\n\n[CTA]\n${ctaText}\n\n`;
    if (c.hashtags?.length) text += c.hashtags.join(' ');
  } else if (isRecord(content) && typeof (content as CaptionContent).caption === 'string') {
    // Instagram caption
    const c = content as CaptionContent;
    text = `${c.caption}\n\n${c.hashtags?.join(' ') ?? ''}`;
  } else if (isRecord(content)) {
    // Standard post (LinkedIn, etc.)
    const c = content as StandardPost;
    if (c.hook) text += `${c.hook}\n\n`;
    if (c.body) text += `${c.body}\n\n`;
    if (c.cta) text += `${c.cta}\n\n`;
    if (c.caption) text += `${c.caption}\n\n`;
    if (c.hashtags?.length) text += c.hashtags.join(' ');
  }

  return text.trim();
}

// WHY a separate preview function: PostPanel needs a truncated preview (max 300 chars)
// for display, while export functions need the full text. This reuses the same
// flattening logic but slices the result.
export function flattenContentToPreview(content: unknown, platform: string): string {
  if (!content) return '';
  try {
    if (Array.isArray(content)) {
      // Carousel: show first slide only
      return `${content[0]?.headline ?? ''}\n${content[0]?.body ?? ''}`.slice(0, 300);
    }
    // WHY 'segments' exclusion: VideoScriptContentData.hook is an object, not a string —
    // posting a video script through this flat-text preview isn't supported (Post panel
    // targets LinkedIn/Twitter/Instagram, not a video platform), so fall through to ''.
    if (isRecord(content) && 'segments' in content) return '';
    if (isRecord(content)) {
      const c = content as Record<string, unknown>;
      if (platform === 'linkedin') {
        if (c.hook && typeof c.hook === 'string') return `${c.hook}\n\n${c.body || ''}`.slice(0, 300);
        if (c.caption && typeof c.caption === 'string') return c.caption.slice(0, 300);
      }
      if (platform === 'twitter') {
        if (c.tweets && Array.isArray(c.tweets)) {
          return (c.tweets as TweetThread['tweets'])!.map((t) => t.text ?? '').join('\n—\n').slice(0, 300);
        }
        if (c.hook && typeof c.hook === 'string') return c.hook.slice(0, 280);
      }
      if (platform === 'instagram' && c.caption && typeof c.caption === 'string') {
        return c.caption.slice(0, 300);
      }
      if (c.hook && typeof c.hook === 'string') {
        return `${c.hook}\n\n${c.cta || ''}`.slice(0, 300);
      }
      if (c.caption && typeof c.caption === 'string') {
        return c.caption.slice(0, 300);
      }
    }
  } catch {
    // Preview is best-effort display text — swallow malformed content shapes
    // rather than crashing the drawer.
  }
  return '';
}
