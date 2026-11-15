import type { WriterResponse } from '../schemas/agentResponses.js';

// WHY: shared by writer (post-parse) and formatter (post-scrub) so literal
// "undefined"/"null" coerce leftovers and hollow drafts fail the same way.

const PLACEHOLDER_PATTERNS = [
  /Feature name/i,
  /Step name/i,
  /\[specific subject\]/i,
  /\[composition\]/i,
  /\[lighting\]/i,
  /bold promise or provocative question/i,
  /name the pain point directly/i,
  /the reframe or solution in one bold claim/i,
];

// WHY: writer prompt asks for EXACTLY 8; floor must match (was 6 and accepted short decks).
export const CAROUSEL_MIN_SLIDES = 8;
const TWITTER_MIN_TWEETS = 3;
const VIDEO_MIN_SEGMENTS = 1;

export function isCoerceJunkText(value: string): boolean {
  const trimmed = value.trim();
  return trimmed === '' || trimmed === 'undefined' || trimmed === 'null';
}

function meaningfulText(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (isCoerceJunkText(trimmed)) return null;
  return trimmed;
}

// WHY: formatter prefixes "N/" onto tweets — strip that before hollowness checks
// so a scrubbed-empty tweet that became "1/ " still counts as hollow.
function tweetBodyText(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const stripped = value.replace(/^\d+\/\s*/, '').trim();
  if (isCoerceJunkText(stripped)) return null;
  return stripped;
}

function containsPlaceholders(obj: WriterResponse): boolean {
  const str = JSON.stringify(obj);
  return PLACEHOLDER_PATTERNS.some((p) => p.test(str));
}

export type CompletenessOptions = {
  // WHY: formatter re-check still prunes hollow items and enforces count floors
  // after scrubCoerceJunk; `false` only skips placeholder-scan / missing-field
  // gates that are writer-parse specific (LinkedIn/caption optional shapes).
  requireMinCounts?: boolean;
};

/**
 * Filter hollow items and throw when the draft is incomplete for `platform`.
 * Mutates object platforms in place (tweets/segments arrays) like runWriter did.
 */
export function enforceWriterCompleteness(
  platform: string,
  parsed: WriterResponse,
  opts?: CompletenessOptions,
): WriterResponse {
  const requireMinCounts = opts?.requireMinCounts !== false;

  if (platform === 'instagram_carousel' && Array.isArray(parsed)) {
    const realSlides = parsed.filter((slide) => {
      if (!slide || typeof slide !== 'object') return false;
      const s = slide as Record<string, unknown>;
      const headline = meaningfulText(s.headline);
      const body = meaningfulText(s.body);
      return Boolean(headline || body);
    });
    // WHY: post-format scrub can drop hollow slides — always re-check the writer
    // floor (EXACTLY 8) so short decks retry instead of shipping.
    if (requireMinCounts || realSlides.length > 0) {
      if (realSlides.length < CAROUSEL_MIN_SLIDES) {
        throw new Error(
          `Incomplete carousel: received ${realSlides.length} slides, expected ${CAROUSEL_MIN_SLIDES}. Retrying.`,
        );
      }
    }
    if (requireMinCounts) {
      if (containsPlaceholders(realSlides as WriterResponse)) {
        throw new Error('Carousel output contains unfilled placeholder text. Retrying.');
      }
      return realSlides as WriterResponse;
    }
    if (parsed.length > 0 && realSlides.length === 0) {
      throw new Error('Incomplete carousel: all slides empty after format scrub. Retrying.');
    }
    return realSlides.length > 0 ? (realSlides as WriterResponse) : parsed;
  }

  if (platform === 'linkedin_post' && parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
    const li = parsed as Record<string, unknown>;
    const hookOk = meaningfulText(li.hook) !== null;
    const bodyOk = meaningfulText(li.body) !== null;
    if (requireMinCounts) {
      if (!hookOk || !bodyOk) {
        throw new Error('Incomplete LinkedIn draft: hook and body are required. Retrying.');
      }
    } else {
      // NOTE: only fail when a string field survived scrub as coerce junk / ''.
      if (typeof li.hook === 'string' && !hookOk) {
        throw new Error('Incomplete LinkedIn draft: hook and body are required. Retrying.');
      }
      if (typeof li.body === 'string' && !bodyOk) {
        throw new Error('Incomplete LinkedIn draft: hook and body are required. Retrying.');
      }
    }
    return parsed;
  }

  if (platform === 'twitter_thread' && parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
    const tw = parsed as Record<string, unknown>;
    // WHY: missing/non-array tweets used to return early as complete — threads
    // without a tweets[] would pass the writer/formatter completeness gate.
    const tweetsRaw = tw.tweets;
    if (!Array.isArray(tweetsRaw)) {
      throw new Error(
        'Incomplete Twitter thread: tweets array is required. Retrying.',
      );
    }
    const realTweets = tweetsRaw.filter((t) => {
      if (!t || typeof t !== 'object') return false;
      return tweetBodyText((t as Record<string, unknown>).text) !== null;
    });
    // WHY: always prune hollow tweets on the formatter path too — requireMinCounts
    // false used to leave empties in place after the length gate.
    if (realTweets.length > 0) {
      tw.tweets = realTweets;
    }
    if (realTweets.length > 0 && realTweets.length < TWITTER_MIN_TWEETS) {
      throw new Error(
        `Incomplete Twitter thread: received ${realTweets.length} tweets, expected at least ${TWITTER_MIN_TWEETS}. Retrying.`,
      );
    }
    if (requireMinCounts) {
      if (realTweets.length < TWITTER_MIN_TWEETS) {
        throw new Error(
          `Incomplete Twitter thread: received ${realTweets.length} tweets, expected at least ${TWITTER_MIN_TWEETS}. Retrying.`,
        );
      }
      return parsed;
    }
    if (tweetsRaw.length > 0 && realTweets.length === 0) {
      throw new Error(
        'Incomplete Twitter thread: all tweets empty after format scrub. Retrying.',
      );
    }
    return parsed;
  }

  if (platform === 'instagram_caption' && parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
    const cap = parsed as Record<string, unknown>;
    const captionOk = meaningfulText(cap.caption) !== null;
    if (requireMinCounts) {
      if (!captionOk) {
        throw new Error('Incomplete Instagram caption: caption text is required. Retrying.');
      }
    } else if (typeof cap.caption === 'string' && !captionOk) {
      throw new Error('Incomplete Instagram caption: caption text is required. Retrying.');
    }
    return parsed;
  }

  if (platform === 'video_script' && parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
    const vs = parsed as Record<string, unknown>;
    const hookObj =
      vs.hook && typeof vs.hook === 'object' && !Array.isArray(vs.hook)
        ? (vs.hook as Record<string, unknown>)
        : null;
    const ctaObj =
      vs.cta && typeof vs.cta === 'object' && !Array.isArray(vs.cta)
        ? (vs.cta as Record<string, unknown>)
        : null;
    const hookText = meaningfulText(hookObj?.text);
    const ctaText = meaningfulText(ctaObj?.text);
    const segments = Array.isArray(vs.segments) ? vs.segments : [];
    const realSegments = segments.filter((s) => {
      if (!s || typeof s !== 'object') return false;
      return meaningfulText((s as Record<string, unknown>).script) !== null;
    });
    // WHY: always prune hollow segments when any remain (formatter path included).
    if (realSegments.length > 0) {
      vs.segments = realSegments;
    }
    // WHY: require non-junk cta.text — hollow/undefined CTA used to pass after
    // hook+segment gates and ship without a closing ask.
    if (requireMinCounts) {
      if (!hookText || realSegments.length < VIDEO_MIN_SEGMENTS || !ctaText) {
        throw new Error(
          'Incomplete video script: hook text, at least one segment with script, and cta.text are required. Retrying.',
        );
      }
      return parsed;
    }
    if (hookObj && typeof hookObj.text === 'string' && !hookText) {
      throw new Error(
        'Incomplete video script: hook text, at least one segment with script, and cta.text are required. Retrying.',
      );
    }
    if (ctaObj && typeof ctaObj.text === 'string' && !ctaText) {
      throw new Error(
        'Incomplete video script: hook text, at least one segment with script, and cta.text are required. Retrying.',
      );
    }
    if (segments.length > 0 && realSegments.length === 0) {
      throw new Error(
        'Incomplete video script: hook text, at least one segment with script, and cta.text are required. Retrying.',
      );
    }
    return parsed;
  }

  return parsed;
}
