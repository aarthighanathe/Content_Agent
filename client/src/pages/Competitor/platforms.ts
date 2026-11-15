import type { ComponentType, CSSProperties } from 'react';
import { Instagram, Linkedin, XTwitter } from '../../components/BrandIcons';
import type { CompetitorPlatform } from '../../types/social';

interface IconProps {
  size?: number;
  color?: string;
  style?: CSSProperties;
}

// WHY: mirrored client-side (not imported from server zod): client and server
// are separate TS projects. Keep in sync with COMPETITOR_PLATFORMS in
// server/src/schemas/content.ts.
export const COMPETITOR_PLATFORM_OPTIONS: {
  id: CompetitorPlatform;
  label: string;
  Icon: ComponentType<IconProps>;
}[] = [
  { id: 'linkedin', label: 'LinkedIn', Icon: Linkedin },
  { id: 'twitter', label: 'Twitter/X', Icon: XTwitter },
  { id: 'instagram', label: 'Instagram', Icon: Instagram },
];

export function competitorPlatformLabel(platform: string | undefined): string {
  if (!platform) return '';
  const match = COMPETITOR_PLATFORM_OPTIONS.find((p) => p.id === platform);
  return match?.label ?? platform;
}

// WHY: legacy history rows sometimes stored a full profile URL as `handle`
// (before server-side resolveCompetitorIdentity always persisted the slug).
// History list + form re-hydrate should show the vanity slug, not the URL.
export function displayCompetitorHandle(handle: string): string {
  const trimmed = handle.trim();
  const linkedIn = trimmed.match(
    /(?:https?:\/\/)?(?:www\.)?linkedin\.com\/(?:in|company)\/([^/?#\s]+)/i,
  );
  if (linkedIn?.[1]) {
    return decodeURIComponent(linkedIn[1]).replace(/\/+$/, '');
  }
  const twitter = trimmed.match(
    /(?:https?:\/\/)?(?:www\.)?(?:twitter\.com|x\.com)\/([^/?#\s]+)/i,
  );
  if (twitter?.[1]) {
    return decodeURIComponent(twitter[1]).replace(/^@/, '');
  }
  const instagram = trimmed.match(
    /(?:https?:\/\/)?(?:www\.)?instagram\.com\/([^/?#\s]+)/i,
  );
  if (instagram?.[1]) {
    return decodeURIComponent(instagram[1]).replace(/^@/, '');
  }
  return trimmed.replace(/^@/, '');
}
