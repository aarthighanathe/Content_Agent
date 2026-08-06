// Template System for Instagram Carousels
// This defines 10 distinct templates with unique layouts, typography, spacing, and color palettes

export type TemplateId =
  | 'modern-minimal'
  | 'bold-statement'
  | 'editorial-classic'
  | 'tech-modern'
  | 'vibrant-pop'
  | 'luxury-dark'
  | 'clean-corporate'
  | 'creative-abstract'
  | 'storyteller'
  | 'social-media';

export type TemplateCategory = 'modern' | 'classic' | 'bold' | 'minimal' | 'editorial';

export interface Typography {
  headingFont: 'Plus Jakarta Sans' | 'Playfair Display' | 'Inter' | 'DM Sans';
  bodyFont: 'Plus Jakarta Sans' | 'Inter' | 'DM Sans';
  headingWeight: number;
  bodyWeight: number;
  headingSize: number;
  bodySize: number;
  letterSpacing: number;
}

export interface Spacing {
  padding: number;
  gap: number;
  sectionSpacing: number;
}

export interface Layout {
  coverStyle: 'centered' | 'split' | 'full-bleed' | 'minimal';
  contentStyle: 'card' | 'list' | 'minimal' | 'highlight';
  decorativeElements: string[];
}

export interface ColorPalette {
  id: string;
  name: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    text: string;
  };
}

export interface CarouselTemplate {
  id: TemplateId;
  name: string;
  description: string;
  category: TemplateCategory;
  
  // Visual characteristics
  typography: Typography;
  
  spacing: Spacing;
  
  layout: Layout;
  
  // Color system
  colorPalettes: ColorPalette[];
  defaultPaletteIndex: number;
}

export const TEMPLATES: Record<TemplateId, CarouselTemplate> = {
  'modern-minimal': {
    id: 'modern-minimal',
    name: 'Modern Minimal',
    description: 'Clean, spacious design with large typography and subtle decorative lines',
    category: 'minimal',
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
      decorativeElements: ['thin-lines', 'numbered-steps'],
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
  },

  'bold-statement': {
    id: 'bold-statement',
    name: 'Bold Statement',
    description: 'High-contrast, attention-grabbing design with dramatic spacing',
    category: 'bold',
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
      decorativeElements: ['geometric-shapes', 'bold-borders'],
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
  },

  'editorial-classic': {
    id: 'editorial-classic',
    name: 'Editorial Classic',
    description: 'Magazine-style layout with elegant serif headings',
    category: 'editorial',
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
      decorativeElements: ['quote-marks', 'dividers', 'drop-caps'],
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
  },

  'tech-modern': {
    id: 'tech-modern',
    name: 'Tech Modern',
    description: 'Clean, tech-focused design with grid layouts and monospace accents',
    category: 'modern',
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
      decorativeElements: ['grid-patterns', 'code-accents'],
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
  },

  'vibrant-pop': {
    id: 'vibrant-pop',
    name: 'Vibrant Pop',
    description: 'Colorful, energetic design with playful elements and rounded corners',
    category: 'modern',
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
      decorativeElements: ['colorful-blobs', 'emoji-accents'],
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
  },

  'luxury-dark': {
    id: 'luxury-dark',
    name: 'Luxury Dark',
    description: 'Premium dark theme with gold/metallic accents and elegant spacing',
    category: 'classic',
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
      decorativeElements: ['metallic-gradients', 'thin-borders'],
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
  },

  'clean-corporate': {
    id: 'clean-corporate',
    name: 'Clean Corporate',
    description: 'Professional, business-focused design with structured layouts',
    category: 'minimal',
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
      decorativeElements: ['icon-accents', 'progress-bars'],
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
  },

  'creative-abstract': {
    id: 'creative-abstract',
    name: 'Creative Abstract',
    description: 'Artistic design with organic shapes and asymmetric layouts',
    category: 'modern',
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
      decorativeElements: ['abstract-shapes', 'gradient-overlays'],
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
  },

  'storyteller': {
    id: 'storyteller',
    name: 'Storyteller',
    description: 'Narrative-focused design with visual flow and connecting elements',
    category: 'editorial',
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
      decorativeElements: ['connecting-lines', 'chapter-markers'],
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
  },

  'social-media': {
    id: 'social-media',
    name: 'Social Media',
    description: 'Optimized for engagement with clear CTAs and emoji integration',
    category: 'modern',
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
      decorativeElements: ['emoji-accents', 'action-buttons'],
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
  },
};

// Type guard replacing unchecked `as TemplateId` casts at the boundaries
// where a template id arrives as a plain string (localStorage, job records,
// request bodies) — validates against the real TEMPLATES catalog instead of
// just asserting the type.
export function isTemplateId(id: string): id is TemplateId {
  return Object.prototype.hasOwnProperty.call(TEMPLATES, id);
}

// Helper function to get a template by ID
export function getTemplate(id: TemplateId): CarouselTemplate | undefined {
  return TEMPLATES[id];
}

// Helper function to get all templates
export function getAllTemplates(): CarouselTemplate[] {
  return Object.values(TEMPLATES);
}

// Helper function to get templates by category
export function getTemplatesByCategory(category: TemplateCategory): CarouselTemplate[] {
  return Object.values(TEMPLATES).filter(t => t.category === category);
}

// Helper function to get a color palette from a template
export function getPalette(templateId: TemplateId, paletteId: string): ColorPalette | undefined {
  const template = getTemplate(templateId);
  if (!template) return undefined;
  return template.colorPalettes.find(p => p.id === paletteId);
}

// Helper function to get the default palette for a template
export function getDefaultPalette(templateId: TemplateId): ColorPalette | undefined {
  const template = getTemplate(templateId);
  if (!template) return undefined;
  return template.colorPalettes[template.defaultPaletteIndex];
}
