// WHY: split across lib/templates/*.ts: the 10×3 palette record alone exceeds the 400-line cap.
// templateSystem.ts stays the public import; register new templates in TEMPLATES below.
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
