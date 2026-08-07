/**
 * workers/publishWorker.ts — processPublishJob unit tests (real module).
 *
 * WHY this suite exists: publishWorker.ts was entirely excluded from the
 * vitest coverage config and had zero test files referencing it. The review
 * flagged the row-not-found / already-non-pending / missing-platform early
 * returns, the missing-accessToken throw path, and the "failure durably
 * recorded, not rethrown" contract as untested — a regression to any of
 * these (e.g. removing the `publishStatus !== 'pending'` guard) could
 * double-publish a scheduled post to LinkedIn/Twitter on a race, only
 * discovered when a user complains about a duplicate post.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Job } from 'bullmq';

vi.mock('../../src/config.js', () => ({
  env: { UPSTASH_REDIS_URL: undefined, REDIS_URL: undefined, NODE_ENV: 'test' },
}));
vi.mock('../../src/lib/redisClient.js', () => ({ createDedicatedRedisConnection: vi.fn() }));
vi.mock('../../src/lib/logger.js', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

const dbGetToken = vi.fn();
vi.mock('../../src/routes/social.js', () => ({
  dbGetToken: (...args: unknown[]) => dbGetToken(...args),
  PLATFORM_LABELS: { linkedin: 'LinkedIn', twitter: 'Twitter/X' },
}));

const publishToSocialPlatform = vi.fn();
vi.mock('../../src/lib/socialPublish.js', () => ({
  publishToSocialPlatform: (...args: unknown[]) => publishToSocialPlatform(...args),
}));

// Minimal fake Drizzle db — only the chains processPublishJob actually calls.
let scheduledPostRow: Record<string, unknown> | undefined;
let contentJobRow: Record<string, unknown> | undefined;
let outputRows: Record<string, unknown>[] = [];
const updateSet = vi.fn();

const fakeDb = {
  select: () => ({
    from: (table: unknown) => ({
      where: () => ({
        limit: async () => {
          // Distinguish scheduledPosts vs contentJobs selects by which row is
          // currently populated for this test — both call sites use the same
          // select().from().where().limit(1) shape.
          if (table === 'scheduledPosts') return scheduledPostRow ? [scheduledPostRow] : [];
          return contentJobRow ? [contentJobRow] : [];
        },
      }),
    }),
  }),
  query: {
    contentOutputs: {
      findMany: async () => outputRows,
    },
  },
  update: () => ({
    set: (values: Record<string, unknown>) => {
      updateSet(values);
      return { where: async () => undefined };
    },
  }),
};

vi.mock('../../src/db/index.js', () => ({ get db() { return fakeDb; } }));
vi.mock('../../src/db/schema.js', () => ({
  scheduledPosts: 'scheduledPosts',
  contentJobs: 'contentJobs',
}));

function makeJob(data: unknown): Job {
  return { data } as Job;
}

describe('processPublishJob (real module)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    scheduledPostRow = undefined;
    contentJobRow = undefined;
    outputRows = [];
  });

  it('a malformed job.data (missing scheduledPostId) is a silent no-op', async () => {
    const { processPublishJob } = await import('../../src/workers/publishWorker.js');
    await expect(processPublishJob(makeJob({}))).resolves.toBeUndefined();
    expect(dbGetToken).not.toHaveBeenCalled();
    expect(publishToSocialPlatform).not.toHaveBeenCalled();
  });

  it('a row that no longer exists (deleted/rescheduled between queue and fire) is a silent no-op', async () => {
    scheduledPostRow = undefined;
    const { processPublishJob } = await import('../../src/workers/publishWorker.js');
    await processPublishJob(makeJob({ scheduledPostId: 'sp-1' }));
    expect(publishToSocialPlatform).not.toHaveBeenCalled();
    expect(updateSet).not.toHaveBeenCalled();
  });

  it('a row that is no longer "pending" (already posted/failed) is a silent no-op — prevents double-publish on a race', async () => {
    scheduledPostRow = { id: 'sp-1', publishStatus: 'posted', publishPlatform: 'linkedin', jobId: 'job-1' };
    const { processPublishJob } = await import('../../src/workers/publishWorker.js');
    await processPublishJob(makeJob({ scheduledPostId: 'sp-1' }));
    expect(publishToSocialPlatform).not.toHaveBeenCalled();
  });

  it('a row with no publishPlatform (reminder-only scheduling) is a silent no-op', async () => {
    scheduledPostRow = { id: 'sp-1', publishStatus: 'pending', publishPlatform: null, jobId: 'job-1' };
    const { processPublishJob } = await import('../../src/workers/publishWorker.js');
    await processPublishJob(makeJob({ scheduledPostId: 'sp-1' }));
    expect(publishToSocialPlatform).not.toHaveBeenCalled();
  });

  it('missing accessToken records a "failed" row instead of throwing unhandled', async () => {
    scheduledPostRow = { id: 'sp-1', publishStatus: 'pending', publishPlatform: 'linkedin', jobId: 'job-1' };
    contentJobRow = { id: 'job-1', userId: 'user-1' };
    outputRows = [{ agentName: 'writer', outputType: 'final', content: { hook: 'H', body: 'B', cta: 'C' } }];
    dbGetToken.mockResolvedValue(null);

    const { processPublishJob } = await import('../../src/workers/publishWorker.js');
    await expect(processPublishJob(makeJob({ scheduledPostId: 'sp-1' }))).resolves.toBeUndefined();

    expect(publishToSocialPlatform).not.toHaveBeenCalled();
    expect(updateSet).toHaveBeenCalledWith(expect.objectContaining({
      publishStatus: 'failed',
      publishError: expect.stringContaining('Not connected'),
    }));
  });

  it('a successful publish records "posted" with the returned postUrl', async () => {
    scheduledPostRow = { id: 'sp-1', publishStatus: 'pending', publishPlatform: 'linkedin', jobId: 'job-1' };
    contentJobRow = { id: 'job-1', userId: 'user-1' };
    outputRows = [{ agentName: 'writer', outputType: 'final', content: { hook: 'H', body: 'B', cta: 'C' } }];
    dbGetToken.mockResolvedValue({ accessToken: 'token-abc' });
    publishToSocialPlatform.mockResolvedValue({ postId: 'post-1', postUrl: 'https://linkedin.com/post/1' });

    const { processPublishJob } = await import('../../src/workers/publishWorker.js');
    await processPublishJob(makeJob({ scheduledPostId: 'sp-1' }));

    expect(updateSet).toHaveBeenCalledWith(expect.objectContaining({
      publishStatus: 'posted',
      postUrl: 'https://linkedin.com/post/1',
    }));
  });

  it('a publish-API failure is durably recorded as "failed", not rethrown as an unhandled rejection', async () => {
    scheduledPostRow = { id: 'sp-1', publishStatus: 'pending', publishPlatform: 'linkedin', jobId: 'job-1' };
    contentJobRow = { id: 'job-1', userId: 'user-1' };
    outputRows = [{ agentName: 'writer', outputType: 'final', content: { hook: 'H', body: 'B', cta: 'C' } }];
    dbGetToken.mockResolvedValue({ accessToken: 'token-abc' });
    publishToSocialPlatform.mockRejectedValue(new Error('LinkedIn API rate limited'));

    const { processPublishJob } = await import('../../src/workers/publishWorker.js');
    await expect(processPublishJob(makeJob({ scheduledPostId: 'sp-1' }))).resolves.toBeUndefined();

    expect(updateSet).toHaveBeenCalledWith(expect.objectContaining({
      publishStatus: 'failed',
      publishError: expect.stringContaining('LinkedIn API rate limited'),
    }));
  });

  it('a missing "final" output records a "failed" row rather than publishing draft/research content', async () => {
    scheduledPostRow = { id: 'sp-1', publishStatus: 'pending', publishPlatform: 'linkedin', jobId: 'job-1' };
    contentJobRow = { id: 'job-1', userId: 'user-1' };
    outputRows = [{ agentName: 'writer', outputType: 'draft', content: { hook: 'H' } }];

    const { processPublishJob } = await import('../../src/workers/publishWorker.js');
    await processPublishJob(makeJob({ scheduledPostId: 'sp-1' }));

    expect(publishToSocialPlatform).not.toHaveBeenCalled();
    expect(updateSet).toHaveBeenCalledWith(expect.objectContaining({
      publishStatus: 'failed',
      publishError: expect.stringContaining('No final content'),
    }));
  });
});
