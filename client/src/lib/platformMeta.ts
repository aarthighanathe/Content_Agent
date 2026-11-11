import { ImageIcon, Briefcase, MessageSquare, Camera, Video } from 'lucide-react';
import type { ComponentType, CSSProperties } from 'react';

export interface PlatformMeta {
  label: string;
  color: string;
  Icon: ComponentType<{ size?: number; style?: CSSProperties }>;
  bg: string;
  border: string;
  badgeClass: string;
}

// WHY: colors are brand-aligned but lifted/desaturated for dark UI — neon Tailwind
// sky/cyan/pink made Library chips read as a candy rainbow against --bg-base.
export const platformMeta: Record<string, PlatformMeta> = {
  instagram_carousel: {
    label: 'Carousel',
    color: '#E1306C',
    Icon: ImageIcon,
    bg: 'rgba(225,48,108,0.10)',
    border: 'rgba(225,48,108,0.22)',
    badgeClass: 'badge-pink',
  },
  linkedin_post: {
    label: 'LinkedIn',
    color: '#70B5F9',
    Icon: Briefcase,
    bg: 'rgba(10,102,194,0.14)',
    border: 'rgba(112,181,249,0.26)',
    badgeClass: 'badge-blue',
  },
  twitter_thread: {
    label: 'Twitter',
    color: '#1DA1F2',
    Icon: MessageSquare,
    bg: 'rgba(29,161,242,0.10)',
    border: 'rgba(29,161,242,0.24)',
    badgeClass: 'badge-cyan',
  },
  instagram_caption: {
    label: 'Caption',
    color: '#B794F6',
    Icon: Camera,
    bg: 'rgba(183,148,246,0.10)',
    border: 'rgba(183,148,246,0.22)',
    badgeClass: 'badge-purple',
  },
  video_script: {
    label: 'Video',
    color: '#E8846A',
    Icon: Video,
    bg: 'rgba(232,132,106,0.10)',
    border: 'rgba(232,132,106,0.24)',
    badgeClass: 'badge-red',
  },
};
