// WHY: extracted from routes/social.ts: the LinkedIn/Twitter posting logic
// (build text from content shape → call the platform API → derive a
// browsable post URL) previously lived only inline in POST /api/social/post.
// The new Calendar auto-publish worker (workers/publishWorker.ts) needs the
// exact same logic — duplicating ~80 lines of fetch/parsing code across two
// call sites would let them silently drift (e.g. one gets a bug fix the
// other doesn't). This is the single shared implementation both call.
import { logger } from './logger.js';
import type { SocialTokenData } from './socialTokens.js';

interface LinkedInProfileResponse {
  id?: string;
}
interface TwitterTweetResponse {
  data?: { id?: string };
}

export interface PublishResult {
  postId: string;
  postUrl: string;
  // WHY: LinkedIn can return 2xx with no id (empty body, no X-RestLi-Id).
  // Callers must record posted / posted-unverified instead of throwing.
  unverified?: boolean;
}

const LINKEDIN_UNVERIFIED_POST_ID = 'linkedin-unverified';
const LINKEDIN_FEED_URL = 'https://www.linkedin.com/feed/';

export class SocialPublishError extends Error {}

// WHY: tweets 1..N-1 are already live when tweet N fails; callers must be able
// to tell this apart from "nothing posted" so they never republish the whole thread.
export class TwitterPartialThreadError extends SocialPublishError {
  readonly postedCount: number;
  readonly totalCount: number;
  readonly rootId: string;
  readonly lastId: string;
  readonly postUrl: string;

  constructor(params: {
    postedCount: number;
    totalCount: number;
    rootId: string;
    lastId: string;
    postUrl: string;
  }) {
    super(`Posted ${params.postedCount} of ${params.totalCount} tweets`);
    this.name = 'TwitterPartialThreadError';
    this.postedCount = params.postedCount;
    this.totalCount = params.totalCount;
    this.rootId = params.rootId;
    this.lastId = params.lastId;
    this.postUrl = params.postUrl;
  }
}

// WHY: ~25s: LinkedIn/Twitter occasionally hang; calendar publishWorker must
// fail the scheduled row rather than block a worker slot indefinitely (M1).
const SOCIAL_FETCH_TIMEOUT_MS = 25_000;

function socialFetchSignal(): AbortSignal {
  return AbortSignal.timeout(SOCIAL_FETCH_TIMEOUT_MS);
}

function mapFetchAbort(err: unknown): never {
  // Node's AbortSignal.timeout uses DOMException name TimeoutError; some
  // runtimes surface AbortError — both map to the existing failed path.
  if (
    err instanceof Error
    && (err.name === 'TimeoutError' || err.name === 'AbortError')
  ) {
    throw new SocialPublishError('Social network request timed out — try again');
  }
  throw err;
}

async function socialFetch(
  url: string,
  init: RequestInit,
): Promise<Response> {
  try {
    return await fetch(url, { ...init, signal: socialFetchSignal() });
  } catch (err: unknown) {
    mapFetchAbort(err);
  }
}

function asText(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function flattenLinkedInText(content: unknown): string {
  const c = (typeof content === 'object' && content !== null && !Array.isArray(content))
    ? content as Record<string, unknown>
    : null;
  if (c?.hook) {
    const hashtags = Array.isArray(c.hashtags)
      ? (c.hashtags as unknown[]).filter((h): h is string => typeof h === 'string').join(' ')
      : '';
    return `${asText(c.hook)}\n\n${asText(c.body)}\n\n${asText(c.cta)}\n\n${hashtags}`.trim();
  }
  if (c?.caption) {
    const hashtags = Array.isArray(c.hashtags)
      ? (c.hashtags as unknown[]).filter((h): h is string => typeof h === 'string').join(' ')
      : '';
    return `${asText(c.caption)}\n\n${hashtags}`.trim();
  }
  if (c?.tweets && Array.isArray(c.tweets)) {
    return asText((c.tweets[0] as Record<string, unknown> | undefined)?.text);
  }
  if (Array.isArray(content) && content.length > 0) {
    const slide = content[0] as Record<string, unknown>;
    return `${asText(slide.headline)}\n${asText(slide.body)}`.trim();
  }
  return '';
}

function twitterTweetTexts(content: unknown): string[] {
  const c = (typeof content === 'object' && content !== null && !Array.isArray(content))
    ? content as Record<string, unknown>
    : null;

  if (c?.tweets && Array.isArray(c.tweets)) {
    return (c.tweets as unknown[])
      .map((t) => {
        if (!t || typeof t !== 'object') return '';
        return asText((t as Record<string, unknown>).text).slice(0, 280);
      })
      .filter((t) => t.length > 0);
  }
  if (c?.hook) {
    return [`${asText(c.hook)}\n\n${asText(c.cta)}`.trim().slice(0, 280)].filter(Boolean);
  }
  if (c?.caption) {
    return [asText(c.caption).slice(0, 280)].filter(Boolean);
  }
  if (Array.isArray(content) && content.length > 0) {
    const slide = content[0] as Record<string, unknown>;
    const text = `${asText(slide.headline)}\n${asText(slide.body)}`.trim().slice(0, 280);
    return text ? [text] : [];
  }
  return [];
}

function linkedInUpdateUrl(postId: string): string {
  return `https://www.linkedin.com/feed/update/${encodeURIComponent(postId)}/`;
}

function readLinkedInId(value: unknown): string | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const record = value as Record<string, unknown>;
  const direct = record.id;
  if (typeof direct === 'string' && direct.trim()) return direct.trim();
  const nested = record.value;
  if (!nested || typeof nested !== 'object' || Array.isArray(nested)) return undefined;
  const nestedId = (nested as Record<string, unknown>).id;
  if (typeof nestedId !== 'string') return undefined;
  const trimmed = nestedId.trim();
  return trimmed || undefined;
}

// WHY: Rest.li 2.0.0 returns 201 with the new id in X-RestLi-Id and an empty
// body. response.json() throws on that body, which used to mark a live post
// failed and a later reschedule posted it again.
export async function linkedInResultFromAcceptedResponse(
  postRes: Response,
): Promise<PublishResult> {
  // NOTE: Headers.get is case-insensitive (x-restli-id matches X-RestLi-Id).
  const headerId = postRes.headers.get('x-restli-id')?.trim();
  if (headerId) {
    return { postId: headerId, postUrl: linkedInUpdateUrl(headerId) };
  }

  let bodyId: string | undefined;
  try {
    const raw = await postRes.text();
    if (raw.trim()) {
      const parsed: unknown = JSON.parse(raw);
      bodyId = readLinkedInId(parsed);
    }
  } catch (err: unknown) {
    logger.warn('[socialPublish] LinkedIn 2xx body was not JSON', {
      error: err instanceof Error ? err.message : String(err),
    });
  }

  if (bodyId) {
    return { postId: bodyId, postUrl: linkedInUpdateUrl(bodyId) };
  }

  return {
    postId: LINKEDIN_UNVERIFIED_POST_ID,
    postUrl: LINKEDIN_FEED_URL,
    unverified: true,
  };
}

async function postTwitterTweet(
  accessToken: string,
  text: string,
  replyToId?: string,
): Promise<string> {
  const body: Record<string, unknown> = { text };
  if (replyToId) {
    body.reply = { in_reply_to_tweet_id: replyToId };
  }
  const tweetRes = await socialFetch('https://api.twitter.com/2/tweets', {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!tweetRes.ok) {
    throw new SocialPublishError('Twitter rejected this post — try reconnecting or shortening the text');
  }
  const tweetData = await tweetRes.json() as TwitterTweetResponse;
  const id = tweetData.data?.id;
  if (!id) throw new SocialPublishError('Twitter did not return a tweet id');
  return id;
}

// WHY: content: unknown, narrowed inside: mirrors postSocialSchema's own
// validated shape (record|array|string — content varies by platform) — this
// function only reads specific optional fields off it, same pattern as the
// route this was extracted from.
export async function publishToSocialPlatform(
  platform: 'linkedin' | 'twitter',
  content: unknown,
  conn: SocialTokenData,
): Promise<PublishResult> {
  if (platform === 'linkedin') {
    const text = flattenLinkedInText(content);
    if (!text) throw new SocialPublishError('Nothing to post — content is empty');

    let authorUrn = conn.platformUserId
      ? (conn.platformUserId.startsWith('urn:') ? conn.platformUserId : `urn:li:person:${conn.platformUserId}`)
      : '';
    if (!authorUrn) {
      const meRes = await socialFetch('https://api.linkedin.com/v2/userinfo', {
        headers: { Authorization: `Bearer ${conn.accessToken}` },
      });
      if (!meRes.ok) {
        throw new SocialPublishError('LinkedIn profile lookup failed — reconnect your account');
      }
      const me = await meRes.json() as LinkedInProfileResponse & { sub?: string };
      const personId = me.sub || me.id;
      if (!personId) throw new SocialPublishError('LinkedIn profile missing member id');
      authorUrn = `urn:li:person:${personId}`;
    }

    const postRes = await socialFetch('https://api.linkedin.com/v2/ugcPosts', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${conn.accessToken}`,
        'Content-Type': 'application/json',
        'X-Restli-Protocol-Version': '2.0.0',
      },
      body: JSON.stringify({
        author: authorUrn,
        lifecycleState: 'PUBLISHED',
        specificContent: {
          'com.linkedin.ugc.ShareContent': {
            shareCommentary: { text: text.slice(0, 3000) },
            shareMediaCategory: 'NONE',
          },
        },
        visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' },
      }),
    });
    if (!postRes.ok) {
      throw new SocialPublishError('LinkedIn rejected this post — try reconnecting or shortening the text');
    }
    // WHY: never throw after a 2xx — LinkedIn already accepted the share.
    return linkedInResultFromAcceptedResponse(postRes);
  }

  // platform === 'twitter'
  // WHY: reply chain: writer output for twitter_thread is { tweets: [...] }.
  // Publishing only index 0 reported success while silently dropping the rest
  // of the thread (and calendar auto-publish used this same path).
  const tweets = twitterTweetTexts(content);
  if (tweets.length === 0) {
    throw new SocialPublishError('Nothing to post — content is empty');
  }

  // WHY: conn.displayName here: stored as "@username" when the account was
  // connected — Twitter's status URL requires a handle, not just the tweet
  // ID. Falls back to the generic "i" path (still resolves, via redirect)
  // if displayName is somehow missing.
  const handle = conn.displayName?.replace(/^@/, '') || 'i';
  const statusUrl = (id: string): string =>
    `https://twitter.com/${encodeURIComponent(handle)}/status/${encodeURIComponent(id)}`;

  let rootId = '';
  let previousId: string | undefined;
  let postedCount = 0;
  for (const text of tweets) {
    try {
      // eslint-disable-next-line no-await-in-loop -- WHY: each reply needs the previous tweet's id
      const id = await postTwitterTweet(conn.accessToken, text, previousId);
      if (!rootId) rootId = id;
      previousId = id;
      postedCount += 1;
    } catch (err: unknown) {
      if (postedCount > 0 && rootId && previousId) {
        throw new TwitterPartialThreadError({
          postedCount,
          totalCount: tweets.length,
          rootId,
          lastId: previousId,
          postUrl: statusUrl(rootId),
        });
      }
      throw err;
    }
  }

  return { postId: rootId, postUrl: statusUrl(rootId) };
}
