import type React from 'react';
import type { TemplateId } from '../../../../../../../lib/templateSystem';
import type { CarouselTemplateProps } from './templateProps';
import { ModernMinimalTemplate } from './ModernMinimalTemplate';
import { BoldStatementTemplate } from './BoldStatementTemplate';
import { EditorialClassicTemplate } from './EditorialClassicTemplate';
import { TechModernTemplate } from './TechModernTemplate';
import { VibrantPopTemplate } from './VibrantPopTemplate';
import { LuxuryDarkTemplate } from './LuxuryDarkTemplate';
import { CleanCorporateTemplate } from './CleanCorporateTemplate';
import { CreativeAbstractTemplate } from './CreativeAbstractTemplate';
import { StorytellerTemplate } from './StorytellerTemplate';
import { SocialMediaTemplate } from './SocialMediaTemplate';

type TemplateComponent = React.ForwardRefExoticComponent<
  CarouselTemplateProps & React.RefAttributes<HTMLDivElement>
>;

// Single source of truth mapping TemplateId -> component. Module-scoped (not
// rebuilt per render) and keyed by the same TemplateId union templateSystem.ts's
// TEMPLATES uses, so adding/removing a template only ever needs updating here
// and in TEMPLATES — not a third hand-copied map.
export const TEMPLATE_COMPONENTS: Record<TemplateId, TemplateComponent> = {
  'modern-minimal': ModernMinimalTemplate,
  'bold-statement': BoldStatementTemplate,
  'editorial-classic': EditorialClassicTemplate,
  'tech-modern': TechModernTemplate,
  'vibrant-pop': VibrantPopTemplate,
  'luxury-dark': LuxuryDarkTemplate,
  'clean-corporate': CleanCorporateTemplate,
  'creative-abstract': CreativeAbstractTemplate,
  'storyteller': StorytellerTemplate,
  'social-media': SocialMediaTemplate,
};
