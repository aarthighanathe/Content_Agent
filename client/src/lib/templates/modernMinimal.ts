import type { CarouselTemplate } from '../templateSystem';

export const modernMinimal: CarouselTemplate = {
  id: 'modern-minimal',
  name: 'Modern Minimal',
  description: 'Clean, spacious design with large typography and subtle decorative lines',
  typography: {
    headingFont: 'Plus Jakarta Sans',
    bodyFont: 'Plus Jakarta Sans',
    headingWeight: 700,
    bodyWeight: 400,
    headingSize: 32,
    bodySize: 14,
    letterSpacing: 0,
  },
  spacing: {
    padding: 32,
    gap: 16,
    sectionSpacing: 24,
  },
  layout: {
    coverStyle: 'centered',
    contentStyle: 'card',
  },
  colorPalettes: [
    {
      id: 'ocean-blue',
      name: 'Ocean Blue',
      colors: {
        primary: '#3B82F6',
        secondary: '#1E40AF',
        accent: '#60A5FA',
        background: '#F0F9FF',
        text: '#1E3A8A',
      },
    },
    {
      id: 'forest-green',
      name: 'Forest Green',
      colors: {
        primary: '#10B981',
        secondary: '#065F46',
        accent: '#34D399',
        background: '#ECFDF5',
        text: '#064E3B',
      },
    },
    {
      id: 'slate-gray',
      name: 'Slate Gray',
      colors: {
        primary: '#64748B',
        secondary: '#334155',
        accent: '#94A3B8',
        background: '#F8FAFC',
        text: '#1E293B',
      },
    },
  ],
  defaultPaletteIndex: 0,
};
