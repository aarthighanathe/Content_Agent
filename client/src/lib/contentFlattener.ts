// WHY a shared content-to-text flattener: the same platform-specific content
// flattening logic was duplicated across ExportModal.tsx (exportText/exportPDF),
// useExport.ts (copyAllText), and PostPanel.tsx (getContentPreview). Each copy
// had slightly different field access and fallback strings, so adding a new
// platform or renaming a field required updating four files by hand. This shared
// helper ensures consistency and reduces maintenance burden.

interface CarouselPoint {
  label?: string;
  desc?: string;
}

interface CarouselSlide {
  type?: string;
  headline?: string;
  body?: string;
  points?: CarouselPoint[];
  cta?: { action?: string; handle?: string };
}

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

function formatSlideType(type: string | undefined): string {
  const raw = (type ?? '').trim();
  if (!raw) return '';
  return raw
    .split(/[_\s-]+/)
    .filter((part) => part.length > 0)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}

function formatCarouselSlide(slide: CarouselSlide, index: number, total: number): string {
  const kind = formatSlideType(slide.type);
  // WHY "Slide N — Type": plain [cover]/[content] tags were hard to scan in
  // .txt exports and Copy-all; numbered headers match the PDF/HTML outlines.
  const header = kind
    ? `Slide ${index + 1} of ${total} — ${kind}`
    : `Slide ${index + 1} of ${total}`;
  const lines: string[] = [header];

  const headline = (slide.headline ?? '').trim();
  const body = (slide.body ?? '').trim();
  if (headline) lines.push(headline);
  if (body) lines.push(body);

  const points = Array.isArray(slide.points) ? slide.points : [];
  points.forEach((point, pointIndex) => {
    const label = (point.label ?? '').trim();
    const desc = (point.desc ?? '').trim();
    if (!label && !desc) return;
    lines.push(desc ? `${pointIndex + 1}. ${label} — ${desc}` : `${pointIndex + 1}. ${label}`);
  });

  const action = (slide.cta?.action ?? '').trim();
  const handle = (slide.cta?.handle ?? '').trim();
  if (action || handle) {
    lines.push([action, handle ? `@${handle}` : ''].filter((part) => part.length > 0).join(' · '));
  }

  return lines.join('\n');
}

export function flattenContentToText(content: unknown): string {
  if (!content) return '';
  let text = '';

  if (Array.isArray(content)) {
    const slides = content as CarouselSlide[];
    text = slides
      .map((slide, index) => formatCarouselSlide(slide, index, slides.length))
      .join('\n\n');
  } else if (isRecord(content) && Array.isArray((content as TweetThread).tweets)) {
    const tweets = (content as TweetThread).tweets!;
    text = tweets
      .map((t, i) => `Tweet ${i + 1} of ${tweets.length}\n${t.text ?? ''}`.trim())
      .join('\n\n');
  } else if (isRecord(content) && Array.isArray((content as VideoScript).segments)) {
    const c = content as VideoScript;
    const hookText = typeof c.hook === 'string' ? c.hook : c.hook?.text ?? '';
    const ctaText = typeof c.cta === 'string' ? c.cta : c.cta?.text ?? '';
    const segments = (c.segments ?? [])
      .map((s) => `Segment ${s.number ?? ''}\n${s.script ?? ''}`.trim())
      .join('\n\n');
    text = [`Hook\n${hookText}`, segments, `CTA\n${ctaText}`]
      .filter((block) => block.trim().length > 0)
      .join('\n\n');
    if (c.hashtags?.length) text += `\n\n${c.hashtags.join(' ')}`;
  } else if (isRecord(content) && typeof (content as CaptionContent).caption === 'string') {
    const c = content as CaptionContent;
    text = `${c.caption}\n\n${c.hashtags?.join(' ') ?? ''}`;
  } else if (isRecord(content)) {
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
