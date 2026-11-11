import { COMPETITOR_PLATFORMS } from '../schemas/content.js';

type CompetitorPlatform = (typeof COMPETITOR_PLATFORMS)[number];

export interface CompetitorIdentity {
  slug: string;
  profileUrl: string;
}

// WHY parse URLs here (not only strip @): LinkedIn vanity URLs are the reliable
// identity key — a bare @handle often isn't how LinkedIn profiles are indexed,
// and users naturally paste linkedin.com/in/... when username search fails.
export function resolveCompetitorIdentity(
  rawHandle: string,
  platform: CompetitorPlatform,
): CompetitorIdentity {
  const trimmed = rawHandle.trim();

  const linkedInMatch = trimmed.match(
    /(?:https?:\/\/)?(?:www\.)?linkedin\.com\/(in|company)\/([^/?#\s]+)/i,
  );
  if (linkedInMatch) {
    const kind = linkedInMatch[1].toLowerCase();
    const slug = decodeURIComponent(linkedInMatch[2]).replace(/\/+$/, '');
    return {
      slug,
      profileUrl: `https://www.linkedin.com/${kind}/${slug}`,
    };
  }

  const twitterMatch = trimmed.match(
    /(?:https?:\/\/)?(?:www\.)?(?:twitter\.com|x\.com)\/([^/?#\s]+)/i,
  );
  if (twitterMatch) {
    const slug = decodeURIComponent(twitterMatch[1]).replace(/^@/, '');
    return { slug, profileUrl: `https://x.com/${slug}` };
  }

  const instagramMatch = trimmed.match(
    /(?:https?:\/\/)?(?:www\.)?instagram\.com\/([^/?#\s]+)/i,
  );
  if (instagramMatch) {
    const slug = decodeURIComponent(instagramMatch[1]).replace(/^@/, '');
    return { slug, profileUrl: `https://www.instagram.com/${slug}/` };
  }

  const slug = trimmed.replace(/^@/, '').replace(/\/+$/, '');
  switch (platform) {
    case 'linkedin':
      return { slug, profileUrl: `https://www.linkedin.com/in/${slug}` };
    case 'twitter':
      return { slug, profileUrl: `https://x.com/${slug}` };
    case 'instagram':
      return { slug, profileUrl: `https://www.instagram.com/${slug}/` };
    default: {
      const _exhaustive: never = platform;
      return _exhaustive;
    }
  }
}
