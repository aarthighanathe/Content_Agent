// WHY: the TEMPLATES data record lives in templateData.ts, not here: this file
// was 722 lines (split 2026-08-10), almost entirely the 10-templates × 3-
// palettes-each data record. Types and helper functions stay here as the
// public surface every consumer imports from (`lib/templateSystem`) —
// TEMPLATES itself is re-exported below so no import path anywhere else
// needed to change.

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

  typography: Typography;
  spacing: Spacing;
  layout: Layout;
  colorPalettes: ColorPalette[];
  defaultPaletteIndex: number;
}

export { TEMPLATES } from './templateData';
import { TEMPLATES } from './templateData';

// WHY: template ids arrive as plain strings from storage/API — validate against TEMPLATES.
export function isTemplateId(id: string): id is TemplateId {
  return Object.prototype.hasOwnProperty.call(TEMPLATES, id);
}

export function getTemplate(id: TemplateId): CarouselTemplate | undefined {
  return TEMPLATES[id];
}

export function getAllTemplates(): CarouselTemplate[] {
  return Object.values(TEMPLATES);
}

export function getPalette(templateId: TemplateId, paletteId: string): ColorPalette | undefined {
  const template = getTemplate(templateId);
  if (!template) return undefined;
  return template.colorPalettes.find(p => p.id === paletteId);
}

export function getDefaultPalette(templateId: TemplateId): ColorPalette | undefined {
  const template = getTemplate(templateId);
  if (!template) return undefined;
  return template.colorPalettes[template.defaultPaletteIndex];
}
