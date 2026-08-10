import type { CarouselTemplate } from '../templateSystem';

export const boldStatement: CarouselTemplate = {
  id: 'bold-statement',
  name: 'Bold Statement',
  description: 'High-contrast, attention-grabbing design with dramatic spacing',
  typography: {
    headingFont: 'DM Sans',
    bodyFont: 'DM Sans',
    headingWeight: 800,
    bodyWeight: 500,
    headingSize: 36,
    bodySize: 15,
    letterSpacing: -0.5,
  },
  spacing: {
    padding: 28,
    gap: 20,
    sectionSpacing: 28,
  },
  layout: {
    coverStyle: 'full-bleed',
    contentStyle: 'highlight',
  },
  colorPalettes: [
    {
      id: 'electric-orange',
      name: 'Electric Orange',
      colors: {
        primary: '#FF6B35',
        secondary: '#E85D04',
        accent: '#FF9F1C',
        background: '#FFF7ED',
        text: '#1C1917',
      },
    },
    {
      id: 'vivid-purple',
      name: 'Vivid Purple',
      colors: {
        primary: '#8B5CF6',
        secondary: '#7C3AED',
        accent: '#A78BFA',
        background: '#F5F3FF',
        text: '#1E1B4B',
      },
    },
    {
      id: 'crimson-red',
      name: 'Crimson Red',
      colors: {
        primary: '#DC2626',
        secondary: '#B91C1C',
        accent: '#EF4444',
        background: '#FEF2F2',
        text: '#450A0A',
      },
    },
  ],
  defaultPaletteIndex: 0,
};
