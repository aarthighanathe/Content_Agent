import { z } from 'zod';
import { slideDataSchema } from '../../schemas/jobs.js';
import { readOutputs } from '../content/shared.js';
import type { MemoryJob, AssembledJob } from './ownership.js';

export type ExportSlide = z.infer<typeof slideDataSchema>;

/**
 * SECURITY (SEC-003): export must not trust arbitrary client slide text as the
 * sole render source — owners could burn Puppeteer quota on unbounded payloads.
 * Prefer the job's stored final carousel; merge client imageDataUrl overlays
 * (EditSlideModal may have a fresh data-URL not yet PATCHed).
 */
export function resolveExportSlides(
  job: MemoryJob | AssembledJob,
  clientSlides: ExportSlide[],
): ExportSlide[] | null {
  const finalOutput = readOutputs(job).find((o) => o.outputType === 'final');
  if (!finalOutput || !Array.isArray(finalOutput.content)) return null;

  const parsed = z.array(slideDataSchema).safeParse(finalOutput.content);
  if (!parsed.success || parsed.data.length === 0) return null;

  const stored = parsed.data;
  // WHY: allow length mismatch → stored only: client may be mid-edit; never
  // invent slides from the request body alone when a final exists.
  if (clientSlides.length !== stored.length) {
    return stored;
  }

  return stored.map((slide, index) => {
    const overlay = clientSlides[index];
    if (overlay?.imageDataUrl) {
      return { ...slide, imageDataUrl: overlay.imageDataUrl };
    }
    return slide;
  });
}
