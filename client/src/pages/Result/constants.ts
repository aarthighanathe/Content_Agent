import { Video } from 'lucide-react';
import { Instagram, Linkedin, XTwitter } from '../../components/BrandIcons';
import type { ComponentType, CSSProperties } from 'react';
import type { TemplateId as TemplateSystemId } from '../../lib/templateSystem';

// WHY: TemplateId used to live in SlideCanvas.tsx (deleted — dead code, see
// REVIEW_FINDINGS.md 1.18). Rendering now happens via IGSlide.tsx/IGCarouselPreview.tsx,
// but the theme-key union is still needed here and by SlideVisual.tsx/IGSlide.tsx.
export type TemplateId =
  | 'aurora'
  | 'magazine'
  | 'split'
  | 'bold'
  | 'minimal'
  | 'neon'
  | 'violet'
  | 'crimson'
  | 'rose';

// New template system id — re-exported from templateSystem.ts (the single
// source of truth for the 10 template ids) rather than independently
// redeclared here. Was a second hand-copied literal union that had already
// silently drifted out of grep-verified sync risk; kept as a distinct name
// (not just importing TemplateId directly) since every existing call site
// already imports `NewTemplateId` from this file.
export type NewTemplateId = TemplateSystemId;

export const stageOrder = ['planning', 'researching', 'writing', 'formatting', 'critiquing', 'done'];
export const agentNames = ['Orchestrator', 'Researcher', 'Writer', 'Formatter', 'Critic'];
export const agentSubs  = ['Planning structure', 'Analyzing trends', 'Drafting content', 'Applying rules', 'Quality review'];
export const agentColors = ['#F59E0B', '#8B5CF6', '#22D3EE', '#10B981', '#F43F5E'];

export const slideColors: { name: string; hex: string; bg: [number, number, number] }[] = [
  { name: 'Gold',    hex: '#F59E0B', bg: [12,  8,  0] },
  { name: 'Violet',  hex: '#8B5CF6', bg: [10,  7, 22] },
  { name: 'Cyan',    hex: '#22D3EE', bg: [ 7, 18, 24] },
  { name: 'Rose',    hex: '#F43F5E', bg: [24,  7, 12] },
  { name: 'Emerald', hex: '#10B981', bg: [ 7, 22, 16] },
  { name: 'Blue',    hex: '#3B82F6', bg: [ 5,  8, 22] },
  { name: 'Orange',  hex: '#F97316', bg: [22,  9,  3] },
  { name: 'Pink',    hex: '#EC4899', bg: [22,  5, 14] },
  { name: 'Indigo',  hex: '#6366F1', bg: [ 8,  7, 22] },
  { name: 'Teal',    hex: '#14B8A6', bg: [ 5, 20, 18] },
  { name: 'Red',     hex: '#EF4444', bg: [24,  5,  5] },
  { name: 'Lime',    hex: '#84CC16', bg: [ 8, 18,  3] },
];

export const platNames: Record<string, string> = {
  instagram_carousel: 'Instagram Carousel',
  linkedin_post:      'LinkedIn Post',
  twitter_thread:     'Twitter Thread',
  instagram_caption:  'Instagram Caption',
  video_script:       'Video Script',
};

type IconProps = { size?: number; color?: string; style?: CSSProperties };
export const platIcons: Record<string, ComponentType<IconProps>> = {
  instagram_carousel: Instagram,
  linkedin_post:      Linkedin,
  twitter_thread:     XTwitter,
  instagram_caption:  Instagram,
  video_script:       Video,
};
