import { z } from 'zod';
import { slideDataSchema } from '../schemas/jobs.js';
import { carouselContentForStore } from '../schemas/slideCoerce.js';

// WHY: built once. Persist runs coerce-then-parse so a writer deck with a long
// icon or a 9th point is stored inside slideDataSchema and stays editable.
const persistedCarouselSlides = z.array(slideDataSchema).min(1).max(20);

export function contentForPersist(
  platform: string,
  outputType: string,
  content: unknown,
): unknown {
  if (platform !== 'instagram_carousel') return content;
  if (outputType !== 'final' && outputType !== 'draft') return content;
  return carouselContentForStore(content, (value) => {
    const parsed = persistedCarouselSlides.safeParse(value);
    return parsed.success ? { success: true, data: parsed.data } : { success: false };
  });
}
