import { Router, Response, NextFunction } from 'express';
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
router.post('/:jobId/export/carousel-png', exportRateLimit, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const jobId = req.params.jobId as string;
    // NOTE: unlike stream.ts's SSE route (which IS exempted from authMiddleware
    // and genuinely needs this fallback chain), this route is NOT exempted —
    // routes/jobs/index.ts's auth gate covers every path except the exact SSE
    // stream path. auth.ts's fail-closed guarantee means req.dbUserId is always
    // populated here, so `req.userId`/'demo' are unreachable dead branches, kept
    // only for defensive-copy consistency with the pattern used elsewhere.
    const userId = req.dbUserId || req.userId || 'demo';
    const ownership = await requireJobOwnership(jobId, userId, res);
    if (!ownership) return;

    const parsedExportBody = parseBody(exportCarouselSsrSchema, req.body, res);
    if (!parsedExportBody) return;
    const { theme, slides, colors, brandName, handle, designPreset, templateId, paletteId } = parsedExportBody;

    try {
      // FLOW: renders the same IGSlide component the client preview uses, so the
      // downloaded PNGs are the design the user is looking at — no LLM involved.
      const { renderCarouselSlidesSsr } = await import('../../lib/carouselSsr.js');
      const { default: JSZip } = await import('jszip');

      const zip = new JSZip();

      const renderResults = await renderCarouselSlidesSsr(
        slides,
        { colors, brandName, handle, designPreset, templateId, paletteId },
        jobId,
        theme as ThemeKey,
      );

      const failedSlides: number[] = [];
      let successCount = 0;
      let firstFailure = 'unknown';

      for (const result of renderResults) {
        if (result.status === 'rejected') {
          // PromiseRejectedResult has 'reason' not 'value'
          const reason: unknown = result.reason;
          const index = reason && typeof reason === 'object' && 'index' in reason
            ? (reason as { index?: unknown }).index
            : undefined;
          failedSlides.push(typeof index === 'number' ? index : -1);
          if (firstFailure === 'unknown') {
            firstFailure = reason instanceof Error ? reason.message : String(reason);
          }
          continue;
        }
        const { index, dataUrl } = result.value;
        const base64 = dataUrl.replace(/^data:image\/png;base64,/, '');
        zip.file(`slide_${String(index + 1).padStart(2, '0')}.png`, base64, { base64: true });
        successCount++;
      }

      // WHY refuse partial ZIPs: a 200 with only some slides used to download
      // silently — CORS never exposed X-Export-Warning, so the client could not
      // tell the set was incomplete. Users got 2–3 PNGs from an 8-slide carousel.
      if (failedSlides.length > 0 || successCount !== slides.length) {
        const which = failedSlides
          .filter((i) => i >= 0)
          .map((i) => i + 1)
          .join(', ');
        console.error('[export-png] Incomplete render', {
          jobId,
          successCount,
          expected: slides.length,
          failedSlides: which || failedSlides,
          firstFailure,
        });
        return res.status(500).json({
          error: which
            ? `Export failed on slide ${which}. Try again.`
            : 'Export failed to render every slide. Try again.',
          code: 'EXPORT_PARTIAL',
          retryable: true,
        });
      }

      const zipBuffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE', compressionOptions: { level: 6 } });
      const safeTopicName = (jobId || 'carousel').replace(/[^a-zA-Z0-9]/g, '_').slice(0, 40);

      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="${safeTopicName}_slides.zip"`);
      res.send(zipBuffer);
      return;
    } catch (err: unknown) {
      // SECURITY: log the real cause server-side, return a generic message to the client.
      console.error('[export-png] Failed:', err instanceof Error ? err.message : err);
      res.status(500).json({ error: 'Export failed', code: 'EXPORT_FAILED', retryable: true });
      return;
    }
  } catch (error) {
    next(error);
  }
});

export default router;
