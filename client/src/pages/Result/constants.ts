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

// ── Carousel themes — maps TemplateId to visual + AI metadata ────────────────
export interface CarouselTheme {
  name: string;
  accent: string;
  bgRgb: [number, number, number];
  previewBg: string;       // CSS gradient for the mini picker card
  previewGlow: string;     // box-shadow glow colour for selected state
  previewEmoji: string;
}

export const CAROUSEL_THEMES: Record<TemplateId, CarouselTheme> = {
  aurora: {
    name: 'Neon Aurora',
    accent: '#00F5FF',
    bgRgb: [3, 4, 16],
    previewBg: 'linear-gradient(135deg, #030410 0%, #0a0a20 100%)',
    previewGlow: 'rgba(0,245,255,0.45)',
    previewEmoji: '⚡',
  },
  magazine: {
    name: 'Editorial',
    accent: '#F59E0B',
    bgRgb: [8, 6, 0],
    previewBg: 'linear-gradient(135deg, #080600 0%, #1a1200 100%)',
    previewGlow: 'rgba(245,158,11,0.45)',
    previewEmoji: '◉',
  },
  split: {
    name: 'Geometric',
    accent: '#8B5CF6',
    bgRgb: [10, 7, 22],
    previewBg: 'linear-gradient(135deg, #0a0716 0%, #1a0f3a 100%)',
    previewGlow: 'rgba(139,92,246,0.45)',
    previewEmoji: '◈',
  },
  bold: {
    name: 'Luxury',
    accent: '#C9A84C',
    bgRgb: [6, 4, 0],
    previewBg: 'linear-gradient(135deg, #060400 0%, #100c00 100%)',
    previewGlow: 'rgba(201,168,76,0.45)',
    previewEmoji: '✦',
  },
  minimal: {
    name: 'Minimal',
    accent: '#6366F1',
    bgRgb: [245, 243, 238],
    previewBg: 'linear-gradient(135deg, #f5f3ee 0%, #e8e5dc 100%)',
    previewGlow: 'rgba(99,102,241,0.35)',
    previewEmoji: '○',
  },
  neon: {
    name: 'Neon Cyber',
    accent: '#FF2D78',
    bgRgb: [8, 3, 10],
    previewBg: 'linear-gradient(135deg, #08000a 0%, #1a0020 100%)',
    previewGlow: 'rgba(255,45,120,0.45)',
    previewEmoji: '⚡',
  },
  violet: {
    name: 'Violet Luxe',
    accent: '#A855F7',
    bgRgb: [10, 5, 20],
    previewBg: 'linear-gradient(135deg, #0a0514 0%, #180a2e 100%)',
    previewGlow: 'rgba(168,85,247,0.45)',
    previewEmoji: '◆',
  },
  crimson: {
    name: 'Crimson Power',
    accent: '#DC2626',
    bgRgb: [20, 3, 3],
    previewBg: 'linear-gradient(135deg, #140000 0%, #280404 100%)',
    previewGlow: 'rgba(220,38,38,0.45)',
    previewEmoji: '⬥',
  },
  rose: {
    name: 'Rose Elegance',
    accent: '#E11D48',
    bgRgb: [20, 4, 8],
    previewBg: 'linear-gradient(135deg, #140004 0%, #280a12 100%)',
    previewGlow: 'rgba(225,29,72,0.45)',
    previewEmoji: '❋',
  },
};

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
