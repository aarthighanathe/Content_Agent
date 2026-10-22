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

// WHY content: unknown, narrowed inside: mirrors postSocialSchema's own
// validated shape (record|array|string — content varies by platform) — this
// function only reads specific optional fields off it, same pattern as the
// route this was extracted from.
export async function publishToSocialPlatform(
  platform: 'linkedin' | 'twitter',
  content: unknown,
  conn: SocialTokenData,
): Promise<PublishResult> {
  const c = (typeof content === 'object' && content !== null && !Array.isArray(content)) ? content as Record<string, unknown> : null;

  if (platform === 'linkedin') {
    let text = '';
    if (c?.hook) text = `${c.hook}\n\n${c.body || ''}\n\n${c.cta || ''}\n\n${(c.hashtags as string[] || []).join(' ')}`;
    else if (c?.caption) text = `${c.caption}\n\n${(c.hashtags as string[] || []).join(' ')}`;
    else if (c?.tweets) text = ((c.tweets as Array<Record<string, unknown>>)[0]?.text as string) || '';
    else if (Array.isArray(content)) text = `${content[0]?.headline}\n${content[0]?.body}`;

    let authorUrn = conn.platformUserId
      ? (conn.platformUserId.startsWith('urn:') ? conn.platformUserId : `urn:li:person:${conn.platformUserId}`)
      : '';
    if (!authorUrn) {
      const meRes = await fetch('https://api.linkedin.com/v2/userinfo', { headers: { Authorization: `Bearer ${conn.accessToken}` } });
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
      headers: { Authorization: `Bearer ${conn.accessToken}`, 'Content-Type': 'application/json', 'X-Restli-Protocol-Version': '2.0.0' },
      body: JSON.stringify({ author: authorUrn, lifecycleState: 'PUBLISHED', specificContent: { 'com.linkedin.ugc.ShareContent': { shareCommentary: { text: text.slice(0, 3000) }, shareMediaCategory: 'NONE' } }, visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' } }),
    });
    if (!postRes.ok) {
      throw new SocialPublishError('LinkedIn rejected this post — try reconnecting or shortening the text');
    }
    const postData = await postRes.json() as LinkedInPostResponse;
    const linkedinPostId: string | undefined = postData.id || postData.value?.id;
    if (linkedinPostId) {
      return { postId: linkedinPostId, postUrl: `https://www.linkedin.com/feed/update/${encodeURIComponent(linkedinPostId)}/` };
    }
    throw new SocialPublishError('LinkedIn did not return a post id');
  }

  // platform === 'twitter'
  let text = '';
  if (c?.hook) text = `${c.hook}\n\n${c.cta || ''}`.slice(0, 280);
  else if (c?.caption) text = (c.caption as string).slice(0, 280);
  else if (c?.tweets) text = ((c.tweets as Array<Record<string, unknown>>)[0]?.text as string) || '';
  else if (Array.isArray(content)) text = `${content[0]?.headline}\n${content[0]?.body}`.slice(0, 280);

  const tweetRes = await fetch('https://api.twitter.com/2/tweets', {
    method: 'POST',
    headers: { Authorization: `Bearer ${conn.accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });
  if (!tweetRes.ok) {
    throw new SocialPublishError('Twitter rejected this post — try reconnecting or shortening the text');
  }
  const tweetData = await tweetRes.json() as TwitterTweetResponse;
  if (tweetData.data?.id) {
    // WHY conn.displayName here: stored as "@username" when the account was
    // connected — Twitter's status URL requires a handle, not just the tweet
    // ID. Falls back to the generic "i" path (still resolves, via redirect)
    // if displayName is somehow missing.
    const handle = conn.displayName?.replace(/^@/, '') || 'i';
    return { postId: tweetData.data.id, postUrl: `https://twitter.com/${encodeURIComponent(handle)}/status/${encodeURIComponent(tweetData.data.id)}` };
  }
  throw new SocialPublishError('Twitter did not return a tweet id');
}
