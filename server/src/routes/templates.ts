// AUDIT FIX #1 — migrated from in-memory templateStore to Neon DB
import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { AuthRequest } from '../middleware/auth.js';
import { db } from '../db/index.js';
import { templates } from '../db/schema.js';
import { eq, and } from 'drizzle-orm';
import { parseBody, createTemplateSchema, renameTemplateSchema } from '../schemas/index.js';

const router = Router();

// Fallback in-memory store used only when DB is unavailable
const _fallback = new Map<string, any[]>();
function fbGet(uid: string) { return _fallback.get(uid) || []; }
function fbSet(uid: string, rows: any[]) { _fallback.set(uid, rows); }

// GET /api/templates
router.get('/', async (req: AuthRequest, res: Response) => {
  const userId = req.dbUserId || req.userId || 'demo';
  try {
    if (db) {
      const rows = await (db as any).select().from(templates).where(eq(templates.userId, userId));
      res.json({ templates: rows });
      return;
    }
    res.json({ templates: fbGet(userId) });
  } catch (err) {
    console.error('[templates] GET failed, falling back to memory:', err);
    res.json({ templates: fbGet(userId) });
  }
});

// POST /api/templates
router.post('/', async (req: AuthRequest, res: Response) => {
  const userId = req.dbUserId || req.userId || 'demo';
  const body = parseBody(createTemplateSchema, req.body, res);
  if (!body) return;

  const { name, platform, hookStyle, structure, ctaPattern, contentSample, topic } = body;
  const row = {
    id: uuidv4(),
    userId,
    name: name.trim(),
    platform,
    topic: topic || '',
    hookStyle: hookStyle || '',
    structure: structure || '',
    ctaPattern: ctaPattern || '',
    contentSample: contentSample || null,
    createdAt: new Date().toISOString(),
  };

  try {
    if (db) {
      const [inserted] = await (db as any).insert(templates).values(row).returning();
      res.status(201).json({ template: inserted });
      return;
    }
    fbSet(userId, [...fbGet(userId), row]);
    res.status(201).json({ template: row });
  } catch (err) {
    console.error('[templates] INSERT failed, falling back to memory:', err);
    fbSet(userId, [...fbGet(userId), row]);
    res.status(201).json({ template: row });
  }
});

// DELETE /api/templates/:id
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  const userId = req.dbUserId || req.userId || 'demo';
  const id = req.params.id as string;
  try {
    if (db) {
      const deleted = await (db as any).delete(templates)
        .where(and(eq(templates.id, id), eq(templates.userId, userId)))
        .returning();
      if (deleted.length === 0) {
        res.status(404).json({ error: 'Template not found' });
        return;
      }
      res.json({ success: true });
      return;
    }
    const existing = fbGet(userId);
    const updated = existing.filter((t) => t.id !== id);
    if (updated.length === existing.length) {
      res.status(404).json({ error: 'Template not found' });
      return;
    }
    fbSet(userId, updated);
    res.json({ success: true });
  } catch (err) {
    console.error('[templates] DELETE failed, falling back to memory:', err);
    const existing = fbGet(userId);
    fbSet(userId, existing.filter((t) => t.id !== id));
    res.json({ success: true });
  }
});

// PATCH /api/templates/:id — rename
router.patch('/:id', async (req: AuthRequest, res: Response) => {
  const userId = req.dbUserId || req.userId || 'demo';
  const id = req.params.id as string;
  const body = parseBody(renameTemplateSchema, req.body, res);
  if (!body) return;
  const { name } = body;

  try {
    if (db) {
      const [updated] = await (db as any).update(templates)
        .set({ name: name.trim() })
        .where(and(eq(templates.id, id), eq(templates.userId, userId)))
        .returning();
      if (!updated) {
        res.status(404).json({ error: 'Template not found' });
        return;
      }
      res.json({ template: updated });
      return;
    }
    const existing = fbGet(userId);
    const idx = existing.findIndex((t) => t.id === id);
    if (idx === -1) { res.status(404).json({ error: 'Template not found' }); return; }
    existing[idx] = { ...existing[idx], name: name.trim() };
    fbSet(userId, existing);
    res.json({ template: existing[idx] });
  } catch (err) {
    console.error('[templates] PATCH failed:', err);
    res.status(500).json({ error: 'Failed to update template' });
  }
});

export default router;
