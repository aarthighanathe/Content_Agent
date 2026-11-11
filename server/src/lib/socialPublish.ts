// WHY extracted from routes/social.ts: the LinkedIn/Twitter posting logic
// (build text from content shape → call the platform API → derive a
// browsable post URL) previously lived only inline in POST /api/social/post.
// The new Calendar auto-publish worker (workers/publishWorker.ts) needs the
// exact same logic — duplicating ~80 lines of fetch/parsing code across two
// call sites would let them silently drift (e.g. one gets a bug fix the
// other doesn't). This is the single shared implementation both call.
import type { SocialTokenData } from './socialTokens.js';

interface LinkedInProfileResponse {
  id?: string;
}
interface LinkedInPostResponse {
  id?: string;
  value?: { id?: string };
}
interface TwitterTweetResponse {
  data?: { id?: string };
}

export interface PublishResult {
  postId: string;
  postUrl: string;
}

export class SocialPublishError extends Error {}

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

async function postTwitterTweet(
  accessToken: string,
  text: string,
  replyToId?: string,
): Promise<string> {
  const body: Record<string, unknown> = { text };
  if (replyToId) {
    body.reply = { in_reply_to_tweet_id: replyToId };
  }
  const tweetRes = await fetch('https://api.twitter.com/2/tweets', {
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

// WHY content: unknown, narrowed inside: mirrors postSocialSchema's own
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
      const meRes = await fetch('https://api.linkedin.com/v2/userinfo', {
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

    const postRes = await fetch('https://api.linkedin.com/v2/ugcPosts', {
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
    const postData = await postRes.json() as LinkedInPostResponse;
    const linkedinPostId: string | undefined = postData.id || postData.value?.id;
    if (linkedinPostId) {
      return {
        postId: linkedinPostId,
        postUrl: `https://www.linkedin.com/feed/update/${encodeURIComponent(linkedinPostId)}/`,
      };
    }
    throw new SocialPublishError('LinkedIn did not return a post id');
  }

  // platform === 'twitter'
  // WHY reply chain: writer output for twitter_thread is { tweets: [...] }.
  // Publishing only index 0 reported success while silently dropping the rest
  // of the thread (and calendar auto-publish used this same path).
  const tweets = twitterTweetTexts(content);
  if (tweets.length === 0) {
    throw new SocialPublishError('Nothing to post — content is empty');
  }

  let rootId = '';
  let previousId: string | undefined;
  for (const text of tweets) {
    const id = await postTwitterTweet(conn.accessToken, text, previousId);
    if (!rootId) rootId = id;
    previousId = id;
  }

  // WHY conn.displayName here: stored as "@username" when the account was
  // connected — Twitter's status URL requires a handle, not just the tweet
  // ID. Falls back to the generic "i" path (still resolves, via redirect)
  // if displayName is somehow missing.
  const handle = conn.displayName?.replace(/^@/, '') || 'i';
  return {
    postId: rootId,
    postUrl: `https://twitter.com/${encodeURIComponent(handle)}/status/${encodeURIComponent(rootId)}`,
  };
}
