import React from 'react';

// WHY: extracted from PostPanel.tsx: that file exceeded the 400-line cap;
// brand SVGs + color map are pure presentational constants.

export function LinkedInIcon({ size = 18, style }: { size?: number; style?: React.CSSProperties }): React.ReactElement {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" style={style}>
      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/>
      <rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/>
    </svg>
  );
}

export function TwitterIcon({ size = 18, style }: { size?: number; style?: React.CSSProperties }): React.ReactElement {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" style={style}>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
    </svg>
  );
}

export function InstagramIcon({ size = 18, style }: { size?: number; style?: React.CSSProperties }): React.ReactElement {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
    </svg>
  );
}

type PlatIconProps = { size?: number; style?: React.CSSProperties };

export const PLATFORM_ICON_COMPONENTS: Record<string, React.ComponentType<PlatIconProps>> = {
  linkedin: LinkedInIcon,
  twitter: TwitterIcon,
  instagram: InstagramIcon,
};

export const PLATFORM_COLORS: Record<string, string> = {
  linkedin: '#0A66C2',
  twitter: '#1DA1F2',
  instagram: '#E1306C',
};

export const SCHEDULE_SUPPORTED = ['linkedin', 'twitter'];

export function hexToRgb(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return '255,255,255';
  return `${parseInt(result[1], 16)},${parseInt(result[2], 16)},${parseInt(result[3], 16)}`;
}

export function Spinner(): React.ReactElement {
  return (
    <div
      style={{
        width: 11,
        height: 11,
        border: '1.5px solid var(--rule)',
        borderTopColor: 'currentColor',
        borderRadius: '50%',
        animation: 'rp-spin .7s linear infinite',
        flexShrink: 0,
      }}
    />
  );
}
