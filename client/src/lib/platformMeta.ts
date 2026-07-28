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

export const platformMeta: Record<string, PlatformMeta> = {
  instagram_carousel: { label: 'Carousel', color: '#EC4899', Icon: ImageIcon,     bg: 'rgba(236,72,153,0.08)', border: 'rgba(236,72,153,0.20)', badgeClass: 'badge-pink'   },
  linkedin_post:      { label: 'LinkedIn', color: '#60A5FA', Icon: Briefcase,     bg: 'rgba(96,165,250,0.08)', border: 'rgba(96,165,250,0.20)',  badgeClass: 'badge-blue'   },
  twitter_thread:     { label: 'Twitter',  color: '#22D3EE', Icon: MessageSquare, bg: 'rgba(34,211,238,0.08)', border: 'rgba(34,211,238,0.20)',  badgeClass: 'badge-cyan'   },
  instagram_caption:  { label: 'Caption',  color: '#A78BFA', Icon: Camera,        bg: 'rgba(167,139,250,0.08)', border: 'rgba(167,139,250,0.20)', badgeClass: 'badge-purple' },
  video_script:       { label: 'Video',    color: '#F87171', Icon: Video,         bg: 'rgba(248,113,113,0.08)', border: 'rgba(248,113,113,0.20)', badgeClass: 'badge-red'    },
};
