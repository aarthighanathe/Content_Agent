import type { CarouselTemplate } from '../templateSystem';

export const storyteller: CarouselTemplate = {
  id: 'storyteller',
  name: 'Storyteller',
  description: 'Narrative-focused design with visual flow and connecting elements',
  typography: {
    headingFont: 'Playfair Display',
    bodyFont: 'Plus Jakarta Sans',
    headingWeight: 600,
    bodyWeight: 400,
    headingSize: 32,
    bodySize: 14,
    letterSpacing: 0.5,
  },
  spacing: {
    padding: 34,
    gap: 18,
    sectionSpacing: 26,
  },
  layout: {
    coverStyle: 'centered',
    contentStyle: 'list',
  },
  colorPalettes: [
    {
      id: 'story-amber',
      name: 'Story Amber',
      colors: {
        primary: '#D97706',
        secondary: '#B45309',
        accent: '#FBBF24',
        background: '#FFFBEB',
        text: '#451A03',
      },
    },
    {
      id: 'narrative-indigo',
      name: 'Narrative Indigo',
      colors: {
        primary: '#4F46E5',
        secondary: '#4338CA',
        accent: '#6366F1',
        background: '#EEF2FF',
        text: '#312E81',
      },
    },
    {
      id: 'tale-teal',
      name: 'Tale Teal',
      colors: {
        primary: '#0D9488',
        secondary: '#0F766E',
        accent: '#14B8A6',
        background: '#F0FDFA',
        text: '#134E4A',
      },
    },
  ],
  defaultPaletteIndex: 0,
};
