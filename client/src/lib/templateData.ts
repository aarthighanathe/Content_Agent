// Template data record for Instagram Carousels — 10 templates × 3 curated
// color palettes each. Split out of templateSystem.ts (2026-08-10, that file
// was 722 lines, mostly this record) to stay under the 400-line file cap.
// templateSystem.ts keeps the type definitions and helper functions
// (getTemplate/getPalette/getDefaultPalette/isTemplateId) as the public
// surface; the actual per-template data lives one level further, in
// lib/templates/ (one file per template — even a single combined data file
// here still exceeded 400 lines, so this went one step further than a
// two-file split). To add an 11th template, add a new file in lib/templates/
// following the same shape and register it below (see CLAUDE.md §11a for the
// full checklist — this is only step 1).
import type { TemplateId, CarouselTemplate } from './templateSystem';
import { modernMinimal } from './templates/modernMinimal';
import { boldStatement } from './templates/boldStatement';
import { editorialClassic } from './templates/editorialClassic';
import { techModern } from './templates/techModern';
import { vibrantPop } from './templates/vibrantPop';
import { luxuryDark } from './templates/luxuryDark';
import { cleanCorporate } from './templates/cleanCorporate';
import { creativeAbstract } from './templates/creativeAbstract';
import { storyteller } from './templates/storyteller';
import { socialMedia } from './templates/socialMedia';

export const TEMPLATES: Record<TemplateId, CarouselTemplate> = {
  'modern-minimal': modernMinimal,
  'bold-statement': boldStatement,
  'editorial-classic': editorialClassic,
  'tech-modern': techModern,
  'vibrant-pop': vibrantPop,
  'luxury-dark': luxuryDark,
  'clean-corporate': cleanCorporate,
  'creative-abstract': creativeAbstract,
  'storyteller': storyteller,
  'social-media': socialMedia,
};
