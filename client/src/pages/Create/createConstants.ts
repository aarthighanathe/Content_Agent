// WHY: extracted from Create.tsx: keeps the page orchestrator under the 400-line cap.
import { migrateLegacyKey, userScopedKey } from '../../lib/userScopedStorage';

export const RECENT_TOPICS_KEY = 'ca_recent_topics';

// SECURITY: recent topics are per-user (L2) — same userScopedKey pattern as drafts.
export function readRecentTopics(userId: string | null | undefined): string[] {
  try {
    migrateLegacyKey(localStorage, RECENT_TOPICS_KEY, userId);
    const raw: unknown = JSON.parse(
      localStorage.getItem(userScopedKey(RECENT_TOPICS_KEY, userId)) || '[]',
    );
    if (!Array.isArray(raw)) return [];
    return raw.filter((t): t is string => typeof t === 'string');
  } catch {
    return [];
  }
}

export function writeRecentTopics(
  userId: string | null | undefined,
  topics: string[],
): void {
  try {
    localStorage.setItem(userScopedKey(RECENT_TOPICS_KEY, userId), JSON.stringify(topics));
  } catch {
    // storage is best-effort
  }
}

export const TOPIC_PLACEHOLDERS: Record<string, string> = {
  instagram_carousel: "e.g. '5 habits that transformed my mornings'",
  linkedin_post:      "e.g. 'Why most product launches fail in week 2'",
  twitter_thread:     "e.g. 'Thread: everything I learned building in public'",
  instagram_caption:  "e.g. 'Behind-the-scenes of our new product launch'",
  video_script:       "e.g. '3-minute guide to cold email that actually gets replies'",
};

export const GENERATE_LABELS: Record<string, string> = {
  instagram_carousel: 'Instagram Carousel',
  linkedin_post:      'LinkedIn Post',
  twitter_thread:     'Twitter Thread',
  instagram_caption:  'Instagram Caption',
  video_script:       'Video Script',
};

export const AUDIENCE_DEFAULTS: Record<string, string> = {
  instagram_carousel: 'content creators and marketers',
  linkedin_post:      'founders and business professionals',
  twitter_thread:     'tech enthusiasts and entrepreneurs',
  instagram_caption:  'lifestyle and brand followers',
  video_script:       'short-form video viewers aged 18-35',
};

// WHY: a shared helper: same fallback chain in handleSubmit and handleBatchSubmit.
export function resolveAudience(
  input: string,
  platform: string,
  learnedDefaults: Partial<Record<string, string>>,
): string {
  const trimmed = input.trim();
  if (trimmed) return trimmed;
  return learnedDefaults[platform] || AUDIENCE_DEFAULTS[platform] || 'general audience';
}
