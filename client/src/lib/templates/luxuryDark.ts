import type { CarouselTemplate } from '../templateSystem';

export const luxuryDark: CarouselTemplate = {
  id: 'luxury-dark',
  name: 'Luxury Dark',
  description: 'Premium dark theme with gold/metallic accents and elegant spacing',
  typography: {
    headingFont: 'Playfair Display',
    bodyFont: 'Inter',
    headingWeight: 600,
    bodyWeight: 400,
    headingSize: 32,
    bodySize: 14,
    letterSpacing: 0.5,
  },
  spacing: {
    padding: 36,
    gap: 20,
    sectionSpacing: 28,
  },
  layout: {
    coverStyle: 'minimal',
    contentStyle: 'minimal',
  },
  colorPalettes: [
    {
      id: 'gold-black',
      name: 'Gold Black',
      colors: {
        primary: '#F59E0B',
        secondary: '#D97706',
        accent: '#FBBF24',
        background: '#0A0A0A',
        text: '#FAFAF9',
      },
    },
    {
      id: 'silver-charcoal',
      name: 'Silver Charcoal',
      colors: {
        primary: '#9CA3AF',
        secondary: '#6B7280',
        accent: '#D1D5DB',
        background: '#0F0F0F',
        text: '#F3F4F6',
      },
    },
    {
      id: 'bronze-midnight',
      name: 'Bronze Midnight',
      colors: {
        primary: '#B45309',
        secondary: '#92400E',
        accent: '#D97706',
        background: '#0C0A09',
        text: '#FAFAF9',
      },
    },
  ],
  defaultPaletteIndex: 0,
};
