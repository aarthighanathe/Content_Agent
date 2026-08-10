import type { CarouselTemplate } from '../templateSystem';

export const techModern: CarouselTemplate = {
  id: 'tech-modern',
  name: 'Tech Modern',
  description: 'Clean, tech-focused design with grid layouts and monospace accents',
  typography: {
    headingFont: 'Inter',
    bodyFont: 'DM Sans',
    headingWeight: 600,
    bodyWeight: 400,
    headingSize: 30,
    bodySize: 14,
    letterSpacing: -0.25,
  },
  spacing: {
    padding: 30,
    gap: 16,
    sectionSpacing: 22,
  },
  layout: {
    coverStyle: 'centered',
    contentStyle: 'list',
  },
  colorPalettes: [
    {
      id: 'cyber-cyan',
      name: 'Cyber Cyan',
      colors: {
        primary: '#06B6D4',
        secondary: '#0891B2',
        accent: '#22D3EE',
        background: '#ECFEFF',
        text: '#164E63',
      },
    },
    {
      id: 'matrix-green',
      name: 'Matrix Green',
      colors: {
        primary: '#22C55E',
        secondary: '#16A34A',
        accent: '#4ADE80',
        background: '#F0FDF4',
        text: '#14532D',
      },
    },
    {
      id: 'neon-pink',
      name: 'Neon Pink',
      colors: {
        primary: '#EC4899',
        secondary: '#DB2777',
        accent: '#F472B6',
        background: '#FDF2F8',
        text: '#831843',
      },
    },
  ],
  defaultPaletteIndex: 0,
};
