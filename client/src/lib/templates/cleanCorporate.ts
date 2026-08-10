import type { CarouselTemplate } from '../templateSystem';

export const cleanCorporate: CarouselTemplate = {
  id: 'clean-corporate',
  name: 'Clean Corporate',
  description: 'Professional, business-focused design with structured layouts',
  typography: {
    headingFont: 'Inter',
    bodyFont: 'Inter',
    headingWeight: 600,
    bodyWeight: 400,
    headingSize: 30,
    bodySize: 14,
    letterSpacing: 0,
  },
  spacing: {
    padding: 32,
    gap: 16,
    sectionSpacing: 24,
  },
  layout: {
    coverStyle: 'split',
    contentStyle: 'card',
  },
  colorPalettes: [
    {
      id: 'professional-blue',
      name: 'Professional Blue',
      colors: {
        primary: '#2563EB',
        secondary: '#1D4ED8',
        accent: '#3B82F6',
        background: '#EFF6FF',
        text: '#1E3A8A',
      },
    },
    {
      id: 'trust-gray',
      name: 'Trust Gray',
      colors: {
        primary: '#475569',
        secondary: '#334155',
        accent: '#64748B',
        background: '#F8FAFC',
        text: '#0F172A',
      },
    },
    {
      id: 'growth-green',
      name: 'Growth Green',
      colors: {
        primary: '#059669',
        secondary: '#047857',
        accent: '#10B981',
        background: '#ECFDF5',
        text: '#064E3B',
      },
    },
  ],
  defaultPaletteIndex: 0,
};
