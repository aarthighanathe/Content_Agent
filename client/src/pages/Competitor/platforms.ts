import type { ComponentType, CSSProperties } from 'react';
import { Instagram, Linkedin, XTwitter } from '../../components/BrandIcons';
import type { CompetitorPlatform } from '../../types/social';

interface IconProps {
  size?: number;
  color?: string;
  style?: CSSProperties;
}

// WHY mirrored client-side (not imported from server zod): client and server
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
