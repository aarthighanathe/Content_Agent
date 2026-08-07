import { sseManager } from '../lib/sse.js';
import { ContentJob } from '../db/schema.js';
import type {
  WriterResponse,
  WriterCarouselResponse,
  WriterLinkedInResponse,
  WriterTwitterResponse,
  WriterInstagramCaptionResponse,
} from '../schemas/agentResponses.js';

// WHY these types, not a straight re-export of the Writer*Response types: this
// module doesn't just pass writer.ts's output through — formatCarousel adds
// slideNumber (camelCase, alongside the writer's existing slide_number) and
// formatInstagramCaption adds emojis, a field the writer schema never produces.
// These extend the writer shapes with exactly the fields this file adds, so a
// caller reading formatter.ts's output has a real type for what's actually there,
// not just what the writer originally sent.
type FormattedCarouselSlide = WriterCarouselResponse[number] & { slideNumber?: number };
type FormattedCarouselResponse = FormattedCarouselSlide[];
type FormattedInstagramCaptionResponse = WriterInstagramCaptionResponse & { emojis?: string[] };

// WHY a union rather than one return type: same reasoning as WriterResponse
// itself — the real shape is platform-dependent, and formatter.ts's job is to
// dispatch to the matching per-platform function, not to unify them.
export type FormatterResponse =
  | FormattedCarouselResponse
  | WriterLinkedInResponse
  | WriterTwitterResponse
  | FormattedInstagramCaptionResponse
  | WriterResponse; // default: passthrough for any platform without a dedicated formatter (see the `default` case below)

export async function runFormatter(job: ContentJob, content: WriterResponse): Promise<FormatterResponse> {
  sseManager.sendEvent(job.id, {
    type: 'progress',
    stage: 'formatting',
    progress: 80,
    agent: 'formatter',
    message: 'Polishing and formatting your content...',
  });

  switch (job.platform) {
    case 'instagram_carousel':
      return formatCarousel(content as WriterCarouselResponse);
    case 'linkedin_post':
      return formatLinkedIn(content as WriterLinkedInResponse);
    case 'twitter_thread':
      return formatTwitterThread(content as WriterTwitterResponse);
    case 'instagram_caption':
      return formatInstagramCaption(content as WriterInstagramCaptionResponse);
    default:
      return content;
  }
}

function formatCarousel(slides: WriterCarouselResponse): FormattedCarouselResponse {
  if (!Array.isArray(slides)) return slides;

  return slides.map((slide, index): FormattedCarouselSlide => {
    const formatted: FormattedCarouselSlide = { ...slide };
    const isLast = index === slides.length - 1;

    // Normalize type field
    if (!formatted.type) {
      formatted.type = index === 0 ? 'cover' : isLast ? 'cta' : 'content';
    }

    // Normalize slide_number
    formatted.slide_number = index + 1;
    formatted.slideNumber  = index + 1;

    // Ensure last slide is typed as CTA with a default action
    if (isLast) {
      if (formatted.type !== 'cta') formatted.type = 'cta';
      if (!formatted.cta) {
        formatted.cta = { action: 'Follow for more', handle: '' };
      }
    }

    // Max 80 words per slide body — enough for detailed, specific copy
    const words = (formatted.body || '').split(/\s+/);
    if (words.length > 80) {
      formatted.body = words.slice(0, 80).join(' ') + '…';
    }

    // Preserve structured points array if present
    if (Array.isArray(slide.points)) {
      formatted.points = slide.points;
    }

    return formatted;
  });
}

function formatLinkedIn(post: WriterLinkedInResponse): WriterLinkedInResponse {
  if (!post || typeof post !== 'object') return post;

  const formatted: WriterLinkedInResponse = { ...post };

  // Ensure hook is in first 2 lines
  if (formatted.hook && !formatted.hook.includes('\n')) {
    formatted.hook = formatted.hook.trim();
  }

  // Add line breaks every 2-3 sentences in body
  if (formatted.body) {
    const sentences = formatted.body.split(/(?<=[.!?])\s+/);
    const paragraphs: string[] = [];
    for (let i = 0; i < sentences.length; i += 2) {
      paragraphs.push(sentences.slice(i, i + 2).join(' '));
    }
    formatted.body = paragraphs.join('\n\n');
  }

  // Limit to 5 hashtags
  if (formatted.hashtags && formatted.hashtags.length > 5) {
    formatted.hashtags = formatted.hashtags.slice(0, 5);
  }

  // Ensure hashtags have # prefix
  if (formatted.hashtags) {
    formatted.hashtags = formatted.hashtags.map((tag: string) =>
      tag.startsWith('#') ? tag : `#${tag}`
    );
  }

  return formatted;
}

function formatTwitterThread(thread: WriterTwitterResponse): WriterTwitterResponse {
  if (!thread || !thread.tweets) return thread;

  const formatted: WriterTwitterResponse = { ...thread };

  formatted.tweets = (formatted.tweets ?? []).map((tweet, index) => {
    const t = { ...tweet };
    const n = index + 1;
    const prefix = `${n}/`;

    // Only prepend numbering if the model hasn't already added it.
    // The writer prompt asks for numbered tweets, so avoid double-prefixing
    // (e.g. "1/ 1/ text" or "2/ 2/ text").
    const text = t.text ?? '';
    const alreadyNumbered = /^\d+\/\s/.test(text);
    t.text = alreadyNumbered ? text : `${prefix} ${text}`;

    // Enforce 280-char hard limit
    if (t.text.length > 280) {
      t.text = t.text.slice(0, 277) + '...';
    }

    t.number = n;
    return t;
  });

  return formatted;
}

function formatInstagramCaption(caption: WriterInstagramCaptionResponse): FormattedInstagramCaptionResponse {
  if (!caption || typeof caption !== 'object') return caption;

  const formatted: FormattedInstagramCaptionResponse = { ...caption };

  // Limit hashtags to 30
  if (formatted.hashtags && formatted.hashtags.length > 30) {
    formatted.hashtags = formatted.hashtags.slice(0, 30);
  }

  // Ensure hashtags have # prefix
  if (formatted.hashtags) {
    formatted.hashtags = formatted.hashtags.map((tag: string) =>
      tag.startsWith('#') ? tag : `#${tag}`
    );
  }

  // WHY pad, not replace: overwriting the whole array on <3 emojis discarded
  // any the writer had already chosen for tone/topic, leaving every under-3
  // caption with the same generic 5-emoji set regardless of content.
  const FALLBACK_EMOJIS = ['✨', '💫', '🔥', '💡', '🎯'];
  if (!formatted.emojis || formatted.emojis.length < 3) {
    const existing = formatted.emojis || [];
    const padding = FALLBACK_EMOJIS.filter((e) => !existing.includes(e));
    formatted.emojis = [...existing, ...padding].slice(0, Math.max(existing.length, 3));
  }

  return formatted;
}
