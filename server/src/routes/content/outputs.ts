import * as Sentry from '@sentry/node';
import { Router, Response } from 'express';
import { AuthRequest } from '../../middleware/auth.js';
import { jobsMemory } from '../jobs/index.js';
import { requireJobOwnership } from '../jobs/ownership.js';
import { getJobFromStore, setJobInStore } from '../../workers/contentWorker.js';
import { db } from '../../db/index.js';
import { contentOutputs } from '../../db/schema.js';
import { eq, and } from 'drizzle-orm';
import { parseBody, editSlideSchema, regenerateContentSchema } from '../../schemas/index.js';
import { readOutputs, jobIdFromOutputId, sanitizeContentDeep } from './shared.js';

const router = Router();

// GET /api/content/:outputId
router.get('/:outputId', async (req: AuthRequest, res: Response) => {
  try {
    const outputId = req.params.outputId as string;
    const jobId = jobIdFromOutputId(outputId);

    const job = await requireJobOwnership(jobId, req.dbUserId || req.userId || 'demo', res);
    if (!job) return; // 404 already sent

    const index = parseInt(outputId.slice(outputId.lastIndexOf('-') + 1), 10);
    const output = readOutputs(job)[index];
    if (!output) {
      res.status(404).json({ error: 'Output not found', code: 'NOT_FOUND', retryable: false });
      return;
    }

    res.json(output);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch output', code: 'SERVER_ERROR', retryable: true });
  }
});

// POST /api/content/:outputId/regenerate
router.post('/:outputId/regenerate', async (req: AuthRequest, res: Response) => {
  try {
    const outputId = req.params.outputId as string;
    const jobId = jobIdFromOutputId(outputId);
    const body = parseBody(regenerateContentSchema, req.body, res);
    if (!body) return;
    const { custom_feedback } = body;

    const job = await requireJobOwnership(jobId, req.dbUserId || req.userId || 'demo', res);
    if (!job) return; // 404 already sent

    const finalOutput = readOutputs(job).find((o) => o.outputType === 'final');
    if (!finalOutput) {
      res.status(404).json({ error: 'Output not found', code: 'NOT_FOUND', retryable: false });
      return;
    }

    res.json({
      jobId,
      message: 'Regeneration started',
      feedback: custom_feedback || 'Regenerate with improvements',
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to regenerate', code: 'SERVER_ERROR', retryable: true });
  }
});

// GET /api/content/:outputId/export/pdf
router.get('/:outputId/export/pdf', async (req: AuthRequest, res: Response) => {
  try {
    // Return the content as JSON (PDF generation happens client-side with jsPDF)
    const outputId = req.params.outputId as string;
    const jobId = jobIdFromOutputId(outputId);

    const job = await requireJobOwnership(jobId, req.dbUserId || req.userId || 'demo', res);
    if (!job) return; // 404 already sent

    const finalOutput = readOutputs(job).find((o) => o.outputType === 'final');
    if (!finalOutput) {
      res.status(404).json({ error: 'Output not found', code: 'NOT_FOUND', retryable: false });
      return;
    }

    res.json({
      content: finalOutput.content,
      platform: job.platform,
      topic: job.topic,
    });
  } catch (error) {
    res.status(500).json({ error: 'Export failed', code: 'SERVER_ERROR', retryable: true });
  }
});

// GET /api/content/:outputId/export/text
router.get('/:outputId/export/text', async (req: AuthRequest, res: Response) => {
  try {
    const outputId = req.params.outputId as string;
    const jobId = jobIdFromOutputId(outputId);

    const job = await requireJobOwnership(jobId, req.dbUserId || req.userId || 'demo', res);
    if (!job) return; // 404 already sent

    const finalOutput = readOutputs(job).find((o) => o.outputType === 'final');
    if (!finalOutput) {
      res.status(404).json({ error: 'Output not found', code: 'NOT_FOUND', retryable: false });
      return;
    }

    let textContent = '';

    // WHY Record<string, unknown> narrowing, not a cast to FormatterResponse:
    // finalOutput.content is `unknown` (see pipeline.ts's own WHY on
    // PipelineOutput.content) — this route branches on which platform-specific
    // shape is present at runtime exactly as formatter.ts produces it, so a
    // structural object guard here is enough to read fields safely without
    // claiming a specific type the value hasn't actually been validated against.
    const content = finalOutput.content;
    if (Array.isArray(content)) {
      // Carousel
      content.forEach((slide: unknown) => {
        if (slide === null || typeof slide !== 'object') return;
        const s = slide as Record<string, unknown>;
        textContent += `--- Slide ${String(s.slideNumber ?? s.slide_number ?? '')} ---\n`;
        textContent += `${String(s.headline ?? '')}\n\n${String(s.body ?? '')}\n\n`;
      });
    } else if (content !== null && typeof content === 'object') {
      const c = content as Record<string, unknown>;
      if (Array.isArray(c.tweets)) {
        // Twitter thread
        c.tweets.forEach((tweet: unknown) => {
          if (tweet === null || typeof tweet !== 'object') return;
          const t = tweet as Record<string, unknown>;
          textContent += `Tweet ${String(t.number ?? '')}:\n${String(t.text ?? '')}\n\n`;
        });
      } else if (typeof c.caption === 'string') {
        // Instagram caption
        const hashtags = Array.isArray(c.hashtags) ? c.hashtags.join(' ') : '';
        textContent = `${c.caption}\n\n${hashtags}`;
      } else {
        // LinkedIn
        const hashtags = Array.isArray(c.hashtags) ? c.hashtags.join(' ') : '';
        textContent = `${String(c.hook ?? '')}\n\n${String(c.body ?? '')}\n\n${String(c.cta ?? '')}\n\n${hashtags}`;
      }
    }

    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Content-Disposition', `attachment; filename="${job.topic.replace(/[^a-zA-Z0-9]/g, '_')}.txt"`);
    res.send(textContent);
  } catch (error) {
    res.status(500).json({ error: 'Export failed', code: 'SERVER_ERROR', retryable: true });
  }
});

// POST /api/content/:outputId/slides/:index
router.post('/:outputId/slides/:index', async (req: AuthRequest, res: Response) => {
  try {
    const outputId = req.params.outputId as string;
    const jobId = jobIdFromOutputId(outputId);
    const index = req.params.index as string;
    const parsed = parseBody(editSlideSchema, req.body, res);
    if (!parsed) return;
    const { headline, body } = parsed;
    const slideIndex = parseInt(index, 10);

    const job = await requireJobOwnership(jobId, req.dbUserId || req.userId || 'demo', res);
    if (!job) return; // 404 already sent

    const finalOutput = readOutputs(job).find((o) => o.outputType === 'final');
    const slides = finalOutput?.content;
    if (!finalOutput || !Array.isArray(slides) || slideIndex < 0 || slideIndex >= slides.length) {
      res.status(404).json({ error: 'Slide not found', code: 'NOT_FOUND', retryable: false });
      return;
    }
    const targetSlide = slides[slideIndex];
    if (targetSlide === null || typeof targetSlide !== 'object') {
      res.status(404).json({ error: 'Slide not found', code: 'NOT_FOUND', retryable: false });
      return;
    }
    const slide = targetSlide as Record<string, unknown>;

    // SECURITY: same stripScriptsAndEventHandlers() defense-in-depth as
    // jobs/manage.ts's PATCH /:jobId/content — this route writes into the
    // same finalOutput.content field consumed by the carousel SSR export
    // route, so user-edited headline/body must be sanitized before persisting.
    if (headline !== undefined) slide.headline = sanitizeContentDeep(headline);
    if (body !== undefined) slide.body = sanitizeContentDeep(body);

    // Persist the mutation — requireJobOwnership may have returned a DB-assembled
    // object (memory miss), so write through to whichever store(s) actually hold it.
    const memJob = jobsMemory.get(jobId) || getJobFromStore(jobId);
    if (memJob) {
      const memFinalOutput = readOutputs(memJob).find((o) => o.outputType === 'final');
      if (memFinalOutput) {
        memFinalOutput.content = finalOutput.content;
        jobsMemory.set(jobId, memJob);
        setJobInStore(jobId, memJob);
      }
    }
    if (db) {
      try {
        const existing = await db.select({ id: contentOutputs.id })
          .from(contentOutputs)
          .where(and(eq(contentOutputs.jobId, jobId), eq(contentOutputs.outputType, 'final')))
          .limit(1);
        if (existing.length > 0) {
          await db.update(contentOutputs).set({ content: finalOutput.content }).where(eq(contentOutputs.id, existing[0].id));
        }
      } catch (dbErr) {
        console.error('[DB] slide edit persist failed:', dbErr);
        Sentry.captureException(dbErr, { tags: { route: 'POST /:outputId/slides/:index', action: 'db-persist' } });
      }
    }

    res.json({ success: true, slide });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update slide', code: 'SERVER_ERROR', retryable: true });
  }
});

export default router;
