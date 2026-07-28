/**
 * routes/templates — Integration Tests (P2)
 * Full CRUD via in-memory fallback (db mocked as null).
 * Tests GET list, POST create, DELETE, PATCH rename.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import supertest from 'supertest';

vi.mock('../../src/db/index.js', () => ({ db: null }));
vi.mock('../../src/db/schema.js', () => ({ templates: 'templates_table' }));
vi.mock('../../src/middleware/auth.js', () => ({}));

// ─── App factory ─────────────────────────────────────────────────────────────

let userCounter = 0;

async function buildTemplatesApp(userId?: string) {
  const uid = userId ?? `test-user-${++userCounter}`;
  const { default: templatesRouter } = await import('../../src/routes/templates.js');
  const app = express();
  app.use(express.json());
  app.use((req: any, _res, next) => {
    req.userId = uid;
    req.dbUserId = uid;
    next();
  });
  app.use('/api/templates', templatesRouter);
  return { app, uid };
}

// ─── GET / ────────────────────────────────────────────────────────────────────

describe('GET /api/templates', () => {
  it('returns empty templates array for new user', async () => {
    const { app } = await buildTemplatesApp();
    const res = await supertest(app).get('/api/templates');
    expect(res.status).toBe(200);
    expect(res.body.templates).toEqual([]);
  });

  it('response has templates array property', async () => {
    const { app } = await buildTemplatesApp();
    const res = await supertest(app).get('/api/templates');
    expect(Array.isArray(res.body.templates)).toBe(true);
  });
});

// ─── POST / ───────────────────────────────────────────────────────────────────

describe('POST /api/templates', () => {
  it('creates a template and returns 201', async () => {
    const { app } = await buildTemplatesApp();
    const res = await supertest(app)
      .post('/api/templates')
      .send({ name: 'My LinkedIn Hook', platform: 'linkedin_post' });
    expect(res.status).toBe(201);
    expect(res.body.template).toBeDefined();
  });

  it('created template has an id', async () => {
    const { app } = await buildTemplatesApp();
    const res = await supertest(app)
      .post('/api/templates')
      .send({ name: 'Hook Template', platform: 'linkedin_post' });
    expect(res.body.template.id).toBeTruthy();
  });

  it('created template has correct name and platform', async () => {
    const { app } = await buildTemplatesApp();
    const res = await supertest(app)
      .post('/api/templates')
      .send({ name: 'Thread Strategy', platform: 'twitter_thread' });
    expect(res.body.template.name).toBe('Thread Strategy');
    expect(res.body.template.platform).toBe('twitter_thread');
  });

  it('trims whitespace from name', async () => {
    const { app } = await buildTemplatesApp();
    const res = await supertest(app)
      .post('/api/templates')
      .send({ name: '  Hook Template  ', platform: 'linkedin_post' });
    expect(res.body.template.name).toBe('Hook Template');
  });

  it('stores optional fields when provided', async () => {
    const { app } = await buildTemplatesApp();
    const res = await supertest(app)
      .post('/api/templates')
      .send({
        name: 'Full Template',
        platform: 'linkedin_post',
        hookStyle: 'Question',
        structure: 'Hook + Body + CTA',
        ctaPattern: 'Follow for more',
      });
    expect(res.body.template.hookStyle).toBe('Question');
    expect(res.body.template.structure).toBe('Hook + Body + CTA');
    expect(res.body.template.ctaPattern).toBe('Follow for more');
  });

  it('returns 400 when name is missing', async () => {
    const { app } = await buildTemplatesApp();
    const res = await supertest(app)
      .post('/api/templates')
      .send({ platform: 'linkedin_post' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBeTruthy();
  });

  it('returns 400 when platform is missing', async () => {
    const { app } = await buildTemplatesApp();
    const res = await supertest(app)
      .post('/api/templates')
      .send({ name: 'No Platform Template' });
    expect(res.status).toBe(400);
  });

  it('returns 400 when both name and platform are missing', async () => {
    const { app } = await buildTemplatesApp();
    const res = await supertest(app)
      .post('/api/templates')
      .send({});
    expect(res.status).toBe(400);
  });
});

// ─── DELETE /:id ──────────────────────────────────────────────────────────────

describe('DELETE /api/templates/:id', () => {
  it('deletes an existing template and returns success', async () => {
    const { app } = await buildTemplatesApp();
    const createRes = await supertest(app)
      .post('/api/templates')
      .send({ name: 'To Delete', platform: 'twitter_thread' });
    const { id } = createRes.body.template;

    const deleteRes = await supertest(app).delete(`/api/templates/${id}`);
    expect(deleteRes.status).toBe(200);
    expect(deleteRes.body.success).toBe(true);
  });

  it('returns 404 for a nonexistent template id', async () => {
    const { app } = await buildTemplatesApp();
    const res = await supertest(app).delete('/api/templates/nonexistent-id-99');
    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/not found/i);
  });

  it('deleted template no longer appears in GET /', async () => {
    const { app, uid } = await buildTemplatesApp();
    const createRes = await supertest(app)
      .post('/api/templates')
      .send({ name: 'Temp', platform: 'instagram_caption' });
    const { id } = createRes.body.template;

    await supertest(app).delete(`/api/templates/${id}`);

    const listRes = await supertest(app).get('/api/templates');
    const ids = listRes.body.templates.map((t: any) => t.id);
    expect(ids).not.toContain(id);
  });
});

// ─── PATCH /:id ───────────────────────────────────────────────────────────────

describe('PATCH /api/templates/:id', () => {
  it('renames a template and returns the updated template', async () => {
    const { app } = await buildTemplatesApp();
    const createRes = await supertest(app)
      .post('/api/templates')
      .send({ name: 'Original Name', platform: 'linkedin_post' });
    const { id } = createRes.body.template;

    const patchRes = await supertest(app)
      .patch(`/api/templates/${id}`)
      .send({ name: 'Renamed Template' });
    expect(patchRes.status).toBe(200);
    expect(patchRes.body.template.name).toBe('Renamed Template');
  });

  it('trims whitespace from new name', async () => {
    const { app } = await buildTemplatesApp();
    const createRes = await supertest(app)
      .post('/api/templates')
      .send({ name: 'Trim Test', platform: 'twitter_thread' });
    const { id } = createRes.body.template;

    const patchRes = await supertest(app)
      .patch(`/api/templates/${id}`)
      .send({ name: '  Trimmed Name  ' });
    expect(patchRes.body.template.name).toBe('Trimmed Name');
  });

  it('returns 400 when name is missing', async () => {
    const { app } = await buildTemplatesApp();
    const createRes = await supertest(app)
      .post('/api/templates')
      .send({ name: 'Valid', platform: 'linkedin_post' });
    const { id } = createRes.body.template;

    const res = await supertest(app).patch(`/api/templates/${id}`).send({});
    expect(res.status).toBe(400);
  });

  it('returns 400 when name is empty string', async () => {
    const { app } = await buildTemplatesApp();
    const createRes = await supertest(app)
      .post('/api/templates')
      .send({ name: 'Valid', platform: 'linkedin_post' });
    const { id } = createRes.body.template;

    const res = await supertest(app)
      .patch(`/api/templates/${id}`)
      .send({ name: '' });
    expect(res.status).toBe(400);
  });

  it('returns 400 when name is whitespace only', async () => {
    const { app } = await buildTemplatesApp();
    const createRes = await supertest(app)
      .post('/api/templates')
      .send({ name: 'Valid', platform: 'linkedin_post' });
    const { id } = createRes.body.template;

    const res = await supertest(app)
      .patch(`/api/templates/${id}`)
      .send({ name: '   ' });
    expect(res.status).toBe(400);
  });

  it('returns 404 for a nonexistent template id', async () => {
    const { app } = await buildTemplatesApp();
    const res = await supertest(app)
      .patch('/api/templates/nonexistent-id-xyz')
      .send({ name: 'New Name' });
    expect(res.status).toBe(404);
  });
});

// ─── GET / after creates ──────────────────────────────────────────────────────

describe('GET /api/templates — after creates', () => {
  it('returns all created templates for the user', async () => {
    const { app } = await buildTemplatesApp();
    await supertest(app)
      .post('/api/templates')
      .send({ name: 'Template A', platform: 'linkedin_post' });
    await supertest(app)
      .post('/api/templates')
      .send({ name: 'Template B', platform: 'twitter_thread' });

    const listRes = await supertest(app).get('/api/templates');
    expect(listRes.body.templates.length).toBeGreaterThanOrEqual(2);
    const names = listRes.body.templates.map((t: any) => t.name);
    expect(names).toContain('Template A');
    expect(names).toContain('Template B');
  });

  it('does not return templates from a different user', async () => {
    const { app: app1 } = await buildTemplatesApp('user-alpha');
    const { app: app2 } = await buildTemplatesApp('user-beta');

    await supertest(app1)
      .post('/api/templates')
      .send({ name: 'Alpha Template', platform: 'linkedin_post' });

    const betaList = await supertest(app2).get('/api/templates');
    const names = betaList.body.templates.map((t: any) => t.name);
    expect(names).not.toContain('Alpha Template');
  });
});
