import { sseManager } from '../lib/sse.js';
import type { RuntimeJob } from '../lib/pipelineTypes.js';
import type {
  WriterResponse,
  WriterCarouselResponse,
  WriterLinkedInResponse,
  WriterTwitterResponse,
  WriterInstagramCaptionResponse,
  WriterVideoScriptResponse,
} from '../schemas/agentResponses.js';
import { enforceWriterCompleteness } from './writerCompleteness.js';
import { carouselBodyMaxWords } from './carouselBodyLimits.js';

// WHY: these types, not a straight re-export of the Writer*Response types: this
// module doesn't just pass writer.ts's output through — formatCarousel adds
// slideNumber (camelCase, alongside the writer's existing slide_number) and
// formatInstagramCaption adds emojis, a field the writer schema never produces.
// These extend the writer shapes with exactly the fields this file adds, so a
// caller reading formatter.ts's output has a real type for what's actually there,
// not just what the writer originally sent.
type FormattedCarouselSlide = WriterCarouselResponse[number] & { slideNumber?: number };
type FormattedCarouselResponse = FormattedCarouselSlide[];
type FormattedInstagramCaptionResponse = WriterInstagramCaptionResponse & { emojis?: string[] };

// WHY: a union rather than one return type: same reasoning as WriterResponse
// itself — the real shape is platform-dependent, and formatter.ts's job is to
// dispatch to the matching per-platform function, not to unify them.
export type FormatterResponse =
  | FormattedCarouselResponse
  | WriterLinkedInResponse
  | WriterTwitterResponse
  | FormattedInstagramCaptionResponse
  | WriterVideoScriptResponse
  | WriterResponse; // default: passthrough for any platform without a dedicated formatter (see the `default` case below)

export async function runFormatter(job: RuntimeJob, content: WriterResponse): Promise<FormatterResponse> {
  sseManager.sendEvent(job.id, {
    type: 'progress',
    stage: 'formatting',
    progress: 80,
    agent: 'formatter',
    message: 'Polishing and formatting your content...',
  });

  let formatted: FormatterResponse;
  switch (job.platform) {
    case 'instagram_carousel':
      formatted = formatCarousel(content as WriterCarouselResponse);
      break;
    case 'linkedin_post':
      formatted = formatLinkedIn(content as WriterLinkedInResponse);
      break;
    case 'twitter_thread':
      formatted = formatTwitterThread(content as WriterTwitterResponse);
      break;
    case 'instagram_caption':
      formatted = formatInstagramCaption(content as WriterInstagramCaptionResponse);
      break;
    case 'video_script':
      formatted = formatVideoScript(content as WriterVideoScriptResponse);
      break;
    default:
      formatted = content;
      break;
  }

  // WHY: scrubCoerceJunk can empty fields that were literal "undefined"/"null";
  // re-check with requireMinCounts:false so missing optional shapes stay soft,
  // but hollow prune + carousel/tweet/segment floors still throw for retry.
  const complete = enforceWriterCompleteness(job.platform, formatted as WriterResponse, {
    requireMinCounts: false,
  }) as FormatterResponse;

  // FLOW: hollow drops can remove the only CTA — renumber, then append a
  // minimal CTA instead of mutating the prior slide's type to cta.
  if (job.platform === 'instagram_carousel' && Array.isArray(complete)) {
    return ensureCarouselHasCta(complete);
  }
  return complete;
}

// WHY: scrub Zod coerce leftovers: before CS() stopped using z.coerce.string(),
// omitted fields became the literal words "undefined"/"null". Treat those as
// empty so a stale row or a regression can't paint them on a slide.
function scrubCoerceJunk(value: string | undefined): string | undefined {
  if (value === undefined) return undefined;
  const trimmed = value.trim();
  if (trimmed === '' || trimmed === 'undefined' || trimmed === 'null') return undefined;
  return value;
}

function formatCarousel(slides: WriterCarouselResponse): FormattedCarouselResponse {
  if (!Array.isArray(slides)) return slides;

  return slides.map((slide, index): FormattedCarouselSlide => {
    const formatted: FormattedCarouselSlide = { ...slide };

    formatted.type = scrubCoerceJunk(formatted.type);
    formatted.headline = scrubCoerceJunk(formatted.headline);
    formatted.body = scrubCoerceJunk(formatted.body);
    formatted.visual_hint = scrubCoerceJunk(formatted.visual_hint);
    // WHY: writer schema only emits accent|dark|light. scrub can return a
    // plain string; map anything else back to undefined so the field stays
    // inside slideDataSchema's enum.
    const scrubbedBg = scrubCoerceJunk(formatted.bg_suggestion);
    formatted.bg_suggestion =
      scrubbedBg === 'accent' || scrubbedBg === 'dark' || scrubbedBg === 'light'
        ? scrubbedBg
        : undefined;

    // WHY: do not force last→cta here — hollow CTA drops used to leave a content
    // slide as last, and overwriting its type stole a real content slide.
    // ensureCarouselHasCta (after completeness) appends instead.
    if (!formatted.type) {
      formatted.type = index === 0 ? 'cover' : 'content';
    }

    // Normalize slide_number (re-applied after completeness in ensureCarouselHasCta)
    formatted.slide_number = index + 1;
    formatted.slideNumber = index + 1;

    if (formatted.type === 'cta' && !formatted.cta) {
      formatted.cta = { action: 'Follow for more', handle: '' };
    }

    // WHY: type/role maxima via carouselBodyLimits (not renumbered index) — same
    // as critic.ts so truncate and length-gate stay aligned after hollow drops.
    const bodyCap = carouselBodyMaxWords(formatted);
    // WHY: filter empty tokens so the count matches critic.ts (leading/trailing space).
    const words = (formatted.body || '').split(/\s+/).filter((word) => word.length > 0);
    if (words.length > bodyCap) {
      formatted.body = words.slice(0, bodyCap).join(' ') + '…';
    }

    // Preserve structured points array if present
    if (Array.isArray(slide.points)) {
      formatted.points = slide.points;
    }

    return formatted;
  });
}

// WHY: after hollow drops, renumber and guarantee a CTA without mutating the
// prior slide into type=cta (that hid real content behind a fake CTA).
function ensureCarouselHasCta(slides: FormattedCarouselResponse): FormattedCarouselResponse {
  const renumbered = slides.map((slide, index): FormattedCarouselSlide => ({
    ...slide,
    slide_number: index + 1,
    slideNumber: index + 1,
  }));

  const withCtaDefaults = renumbered.map((slide): FormattedCarouselSlide => {
    if (slide.type !== 'cta') return slide;
    if (slide.cta) return slide;
    return { ...slide, cta: { action: 'Follow for more', handle: '' } };
  });

  if (withCtaDefaults.some((slide) => slide.type === 'cta')) {
    return withCtaDefaults;
  }

  const nextNumber = withCtaDefaults.length + 1;
  return [
    ...withCtaDefaults,
    {
      type: 'cta',
      headline: 'Follow for more',
      body: 'Save this and follow for the next tip.',
      slide_number: nextNumber,
      slideNumber: nextNumber,
      cta: { action: 'Follow for more', handle: '' },
    },
  ];
}

function formatLinkedIn(post: WriterLinkedInResponse): WriterLinkedInResponse {
  if (!post || typeof post !== 'object') return post;

  // WHY: spread keeps hookAlt: the A/B hook toggle on Result reads hookAlt;
  // reformatting must not drop it.
  const formatted: WriterLinkedInResponse = { ...post };

  if (formatted.hook) {
    formatted.hook = scrubCoerceJunk(formatted.hook.trim());
  }
  // WHY: drop coerce junk: hookAlt === "undefined" is truthy, so LinkedInContent
  // showed the A/B toggle with the word "undefined" as the alternate hook.
  formatted.hookAlt = scrubCoerceJunk(
    typeof formatted.hookAlt === 'string' ? formatted.hookAlt.trim() : undefined,
  );
  if (formatted.cta) {
    formatted.cta = scrubCoerceJunk(formatted.cta.trim());
  }
  if (formatted.body) {
    formatted.body = scrubCoerceJunk(formatted.body) ?? '';
  }

  // WHY: skip re-split when writer already used \\n\\n: forced every-2-sentence
  // chunking flattened intentional rhythm (tension / proof / list / takeaway).
  if (formatted.body) {
    const body = formatted.body.trim();
    if (body.includes('\n\n')) {
      formatted.body = body
        .split(/\n\n+/)
        .map((p) => p.trim())
        .filter(Boolean)
        .join('\n\n');
    } else {
      const sentences = body.split(/(?<=[.!?])\s+/);
      const paragraphs: string[] = [];
      for (let i = 0; i < sentences.length; i += 2) {
        paragraphs.push(sentences.slice(i, i + 2).join(' '));
      }
      formatted.body = paragraphs.join('\n\n');
    }
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
    t.text = scrubCoerceJunk(typeof t.text === 'string' ? t.text : undefined) ?? '';
    const n = index + 1;
    const prefix = `${n}/`;

    // WHY: strip only a thread index (`1/ …`, `2/Hook`) via `(?!\d)` — a bare
    // `/^\d+\//` ate fractions/dates (`3/5 of…` → `5 of…`). Wrong writer indices
    // still strip because the char after `/` is not a digit.
    const text = t.text ?? '';
    const stripped = text.replace(/^\d+\/(?!\d)\s*/, '');
    t.text = stripped.length > 0 ? `${prefix} ${stripped}` : prefix;

    // Enforce 280-char hard limit
    if (t.text.length > 280) {
      t.text = t.text.slice(0, 277) + '...';
    }

    t.number = n;
    return t;
  });

  return formatted;
}

function formatVideoScript(script: WriterVideoScriptResponse): WriterVideoScriptResponse {
  if (!script || typeof script !== 'object') return script;

  const formatted: WriterVideoScriptResponse = { ...script };

  if (formatted.hook && typeof formatted.hook === 'object') {
    const hook = { ...formatted.hook };
    // WHY: ?? '' like Instagram caption — keep a string so completeness still
    // sees scrubbed junk (undefined would skip the typeof==='string' gate).
    if (typeof hook.text === 'string') hook.text = scrubCoerceJunk(hook.text) ?? '';
    if (typeof hook.duration === 'string') hook.duration = scrubCoerceJunk(hook.duration);
    if (typeof hook.visual === 'string') hook.visual = scrubCoerceJunk(hook.visual);
    formatted.hook = hook;
  }

  if (Array.isArray(formatted.segments)) {
    formatted.segments = formatted.segments.map((seg) => {
      if (!seg || typeof seg !== 'object') return seg;
      const s = { ...seg };
      if (typeof s.script === 'string') s.script = scrubCoerceJunk(s.script) ?? '';
      if (typeof s.duration === 'string') s.duration = scrubCoerceJunk(s.duration);
      if (typeof s.broll === 'string') s.broll = scrubCoerceJunk(s.broll);
      if (typeof s.caption === 'string') s.caption = scrubCoerceJunk(s.caption);
      return s;
    });
  }

  if (formatted.cta && typeof formatted.cta === 'object') {
    const cta = { ...formatted.cta };
    if (typeof cta.text === 'string') cta.text = scrubCoerceJunk(cta.text) ?? '';
    if (typeof cta.duration === 'string') cta.duration = scrubCoerceJunk(cta.duration);
    if (typeof cta.visual === 'string') cta.visual = scrubCoerceJunk(cta.visual);
    formatted.cta = cta;
  }

  if (typeof formatted.speakerNotes === 'string') {
    formatted.speakerNotes = scrubCoerceJunk(formatted.speakerNotes);
  }
  if (typeof formatted.totalDuration === 'string') {
    formatted.totalDuration = scrubCoerceJunk(formatted.totalDuration);
  }

  return formatted;
}

function formatInstagramCaption(caption: WriterInstagramCaptionResponse): FormattedInstagramCaptionResponse {
  if (!caption || typeof caption !== 'object') return caption;

  const formatted: FormattedInstagramCaptionResponse = { ...caption };

  // WHY: same coerce-junk scrub as LinkedIn/Twitter — literal "undefined"/"null"
  // caption text must not ship (post-format completeness catches emptied strings).
  if (typeof formatted.caption === 'string') {
    formatted.caption = scrubCoerceJunk(formatted.caption) ?? '';
  }

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

  // WHY: pad, not replace: overwriting the whole array on <3 emojis discarded
  // any the writer had already chosen for tone/topic, leaving every under-3
  // caption with the same generic 5-emoji set regardless of content.
  const FALLBACK_EMOJIS = ['✨', '💫', '🔥', '💡', '🎯'];
  if (!formatted.emojis || formatted.emojis.length < 3) {
    const existing = formatted.emojis || [];
    const padding = FALLBACK_EMOJIS.filter((e) => !existing.includes(e));
    // WHY: a plain slice(0, 3): this branch only runs when existing.length < 3
    // (the enclosing if-condition above), so existing.length is always 0, 1,
    // or 2 here — Math.max(existing.length, 3) always evaluated to 3 anyway.
    formatted.emojis = [...existing, ...padding].slice(0, 3);
  }

  return formatted;
}
