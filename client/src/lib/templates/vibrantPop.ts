import type { CarouselTemplate } from '../templateSystem';

export const vibrantPop: CarouselTemplate = {
  id: 'vibrant-pop',
  name: 'Vibrant Pop',
  description: 'Colorful, energetic design with playful elements and rounded corners',
  typography: {
    headingFont: 'Plus Jakarta Sans',
    bodyFont: 'Plus Jakarta Sans',
    headingWeight: 700,
    bodyWeight: 500,
    headingSize: 32,
    bodySize: 15,
    letterSpacing: 0,
  },
  spacing: {
    padding: 32,
    gap: 18,
    sectionSpacing: 24,
  },
  layout: {
    coverStyle: 'centered',
    contentStyle: 'card',
  },
  colorPalettes: [
    {
      id: 'sunset-gradient',
      name: 'Sunset Gradient',
      colors: {
        primary: '#F97316',
        secondary: '#FB923C',
        accent: '#FDBA74',
        background: '#FFF7ED',
        text: '#7C2D12',
      },
    },
    {
      id: 'berry-blast',
      name: 'Berry Blast',
      colors: {
        primary: '#A855F7',
        secondary: '#C084FC',
        accent: '#E879F9',
        background: '#FAF5FF',
        text: '#581C87',
      },
    },
    {
      id: 'tropical-mint',
      name: 'Tropical Mint',
      colors: {
        primary: '#14B8A6',
        secondary: '#2DD4BF',
        accent: '#5EEAD4',
        background: '#F0FDFA',
        text: '#134E4A',
      },
    },
  ],
  defaultPaletteIndex: 0,
};
