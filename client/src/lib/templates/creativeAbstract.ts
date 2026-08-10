import type { CarouselTemplate } from '../templateSystem';

export const creativeAbstract: CarouselTemplate = {
  id: 'creative-abstract',
  name: 'Creative Abstract',
  description: 'Artistic design with organic shapes and asymmetric layouts',
  typography: {
    headingFont: 'DM Sans',
    bodyFont: 'Plus Jakarta Sans',
    headingWeight: 700,
    bodyWeight: 400,
    headingSize: 34,
    bodySize: 14,
    letterSpacing: 0.25,
  },
  spacing: {
    padding: 30,
    gap: 18,
    sectionSpacing: 26,
  },
  layout: {
    coverStyle: 'full-bleed',
    contentStyle: 'highlight',
  },
  colorPalettes: [
    {
      id: 'artistic-gradient',
      name: 'Artistic Gradient',
      colors: {
        primary: '#8B5CF6',
        secondary: '#EC4899',
        accent: '#F43F5E',
        background: '#FDF4FF',
        text: '#4A044E',
      },
    },
    {
      id: 'organic-earth',
      name: 'Organic Earth',
      colors: {
        primary: '#78716C',
        secondary: '#57534E',
        accent: '#A8A29E',
        background: '#FAFAF9',
        text: '#292524',
      },
    },
    {
      id: 'dreamy-lavender',
      name: 'Dreamy Lavender',
      colors: {
        primary: '#A78BFA',
        secondary: '#8B5CF6',
        accent: '#C4B5FD',
        background: '#F5F3FF',
        text: '#4C1D95',
      },
    },
  ],
  defaultPaletteIndex: 0,
};
