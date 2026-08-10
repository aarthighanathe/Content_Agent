import type { CarouselTemplate } from '../templateSystem';

export const editorialClassic: CarouselTemplate = {
  id: 'editorial-classic',
  name: 'Editorial Classic',
  description: 'Magazine-style layout with elegant serif headings',
  typography: {
    headingFont: 'Playfair Display',
    bodyFont: 'Plus Jakarta Sans',
    headingWeight: 700,
    bodyWeight: 400,
    headingSize: 34,
    bodySize: 14,
    letterSpacing: 0.5,
  },
  spacing: {
    padding: 36,
    gap: 18,
    sectionSpacing: 26,
  },
  layout: {
    coverStyle: 'split',
    contentStyle: 'card',
  },
  colorPalettes: [
    {
      id: 'warm-gold',
      name: 'Warm Gold',
      colors: {
        primary: '#D97706',
        secondary: '#92400E',
        accent: '#F59E0B',
        background: '#FFFBEB',
        text: '#451A03',
      },
    },
    {
      id: 'classic-burgundy',
      name: 'Classic Burgundy',
      colors: {
        primary: '#881337',
        secondary: '#4C0519',
        accent: '#BE123C',
        background: '#FFF1F2',
        text: '#4A044E',
      },
    },
    {
      id: 'navy-cream',
      name: 'Navy Cream',
      colors: {
        primary: '#1E3A8A',
        secondary: '#1E40AF',
        accent: '#3B82F6',
        background: '#EFF6FF',
        text: '#172554',
      },
    },
  ],
  defaultPaletteIndex: 0,
};
