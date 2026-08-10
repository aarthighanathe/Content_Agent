import type { CarouselTemplate } from '../templateSystem';

export const socialMedia: CarouselTemplate = {
  id: 'social-media',
  name: 'Social Media',
  description: 'Optimized for engagement with clear CTAs and emoji integration',
  typography: {
    headingFont: 'Plus Jakarta Sans',
    bodyFont: 'Plus Jakarta Sans',
    headingWeight: 800,
    bodyWeight: 500,
    headingSize: 34,
    bodySize: 15,
    letterSpacing: 0,
  },
  spacing: {
    padding: 30,
    gap: 18,
    sectionSpacing: 24,
  },
  layout: {
    coverStyle: 'centered',
    contentStyle: 'card',
  },
  colorPalettes: [
    {
      id: 'engagement-pink',
      name: 'Engagement Pink',
      colors: {
        primary: '#EC4899',
        secondary: '#DB2777',
        accent: '#F472B6',
        background: '#FDF2F8',
        text: '#831843',
      },
    },
    {
      id: 'viral-orange',
      name: 'Viral Orange',
      colors: {
        primary: '#F97316',
        secondary: '#EA580C',
        accent: '#FB923C',
        background: '#FFF7ED',
        text: '#7C2D12',
      },
    },
    {
      id: 'trending-blue',
      name: 'Trending Blue',
      colors: {
        primary: '#3B82F6',
        secondary: '#2563EB',
        accent: '#60A5FA',
        background: '#EFF6FF',
        text: '#1E3A8A',
      },
    },
  ],
  defaultPaletteIndex: 0,
};
