import { Router, Response } from 'express';
import { AuthRequest } from '../../middleware/auth.js';
import { exportRateLimit } from '../../middleware/rateLimit.js';
import { requireJobOwnership } from './ownership.js';
import type { ThemeKey } from '../../lib/carousel.js';
import { parseBody, exportCarouselSsrSchema } from '../../schemas/index.js';

const router = Router({ mergeParams: true });

// NOTE: this file used to also host POST /:jobId/render-slides and its SSE stream, which
// asked Gemini to invent slide HTML per theme and streamed the resulting PNGs back into
// the preview. That design never matched what the user saw (and varied run to run, since
// it failed over to Groq), so it was removed along with the "Render with AI theme"
// button. Rendering now happens only here, from the same components the client draws.

// POST /:jobId/export/carousel-png — server-side Puppeteer ZIP export
router.post('/:jobId/export/carousel-png', exportRateLimit, async (req: AuthRequest, res: Response) => {
  const jobId = req.params.jobId as string;
  const userId = req.dbUserId || req.userId || 'demo';
  const ownership = await requireJobOwnership(jobId, userId, res);
  if (!ownership) return;

  const parsedExportBody = parseBody(exportCarouselSsrSchema, req.body, res);
  if (!parsedExportBody) return;
  const { theme, slides, colors, brandName, handle, designPreset } = parsedExportBody;

  try {
    // FLOW: renders the same IGSlide component the client preview uses, so the
    // downloaded PNGs are the design the user is looking at — no LLM involved.
    const { renderCarouselSlidesSsr } = await import('../../lib/carouselSsr.js');
    const { default: JSZip } = await import('jszip');

    const zip = new JSZip();

    const renderResults = await renderCarouselSlidesSsr(
      slides,
      { colors, brandName, handle, designPreset },
      jobId,
      theme as ThemeKey,
    );

    for (const result of renderResults) {
      if (result.status === 'rejected') {
        throw new Error(`Slide render failed: ${result.reason}`);
      }
      const { index, dataUrl } = result.value;
      const base64 = dataUrl.replace(/^data:image\/png;base64,/, '');
      zip.file(`slide_${String(index + 1).padStart(2, '0')}.png`, base64, { base64: true });
    }

    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE', compressionOptions: { level: 6 } });
    const safeTopicName = (jobId || 'carousel').replace(/[^a-zA-Z0-9]/g, '_').slice(0, 40);

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${safeTopicName}_slides.zip"`);
    return res.send(zipBuffer);
  } catch (err: unknown) {
    // SECURITY: log the real cause server-side, return a generic message to the client.
    console.error('[export-png] Failed:', err instanceof Error ? err.message : err);
    return res.status(500).json({ error: 'Export failed', code: 'EXPORT_FAILED', retryable: true });
  }
});

export default router;
