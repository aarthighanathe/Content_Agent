// WHY: (R5): Adapt multiply single-flight + insert lives here so regenerate.ts
// stays under the 400-line cap; Redis lock + sibling check must stay together.
import { v4 as uuidv4 } from 'uuid';
import type { Response } from 'express';
import type { ResearchResult } from '../../agents/researcher.js';
import {
  buildTargetPlatformTaskPlan,
  getPlatformRules,
} from '../../agents/orchestrator.js';
import type { PipelineJob } from '../../lib/pipeline.js';
import type { AssembledJob, MemoryJob } from './ownership.js';
import { setJobInStore } from './ownership.js';
import { collectRelatedVariants, pickVariantForPlatform } from './related.js';
import { runPipelineDirect } from './create.js';
import { addJobToQueueDetailed } from '../../lib/queue.js';
import { insertPendingJobRow } from '../../lib/persistJob.js';
import { getUserProfile } from '../users.js';
import { logger } from '../../lib/logger.js';
import {
  MULTIPLY_LOCK_RENEW_MS,
  MULTIPLY_LOCK_TTL_SECONDS,
  multiplyLockKey,
  tryAcquireRedisLock,
  type AcquiredRedisLock,
} from '../../lib/contentJobLock.js';
import { isSiblingActivelyGenerating } from '../../lib/regenerateClaim.js';
import { isUsableSkipResearch } from '../../lib/contentJobPayload.js';
import type { SkipResearchOpts } from '../../lib/pipelineTypes.js';
import { env } from '../../config.js';

// WHY: process-local multiply mutex only when Redis is intentionally unset
// (local direct-mode). Production / Redis-configured must fail closed —
// process-local alone cannot serialize Adapt across API instances (same
// philosophy as feedMonitorWorker check locks).
const localMultiplyLocks = new Set<string>();

function mustFailClosedOnMultiplyLockUnavailable(): boolean {
  if (env.NODE_ENV === 'production') return true;
  return Boolean(env.UPSTASH_REDIS_URL || env.REDIS_URL);
}

async function findGeneratingSiblingJobId(params: {
  sourceJob: MemoryJob | AssembledJob;
  sourceJobId: string;
  userId: string;
  targetPlatform: string;
  res: Response;
}): Promise<string | undefined> {
  const family = await collectRelatedVariants(
    params.sourceJob,
    params.userId,
    params.res,
  );
  if (params.res.headersSent || !family) return undefined;
  const existing = pickVariantForPlatform(
    family.variants,
    params.targetPlatform,
    params.sourceJobId,
  );
  if (
    existing
    && isSiblingActivelyGenerating(existing.jobId, existing.status)
  ) {
    return existing.jobId;
  }
  return undefined;
}

export type MultiplyAdaptResult =
  | { kind: 'created'; jobId: string }
  | { kind: 'reused'; jobId: string }
  | { kind: 'in_progress'; jobId?: string }
  | { kind: 'persist_failed' }
  | { kind: 'lock_unavailable' }
  | { kind: 'family_incomplete' }
  | { kind: 'headers_sent' };

export async function createMultiplyAdaptJob(params: {
  sourceJob: MemoryJob | AssembledJob;
  sourceJobId: string;
  userId: string;
  targetPlatform: string;
  cachedResearch: ResearchResult;
  res: Response;
}): Promise<MultiplyAdaptResult> {
  const {
    sourceJob,
    sourceJobId,
    userId,
    targetPlatform,
    cachedResearch,
    res,
  } = params;

  // WHY: root id for the lock key — siblings Adapt'd from different members of
  // the same family must serialize on one key, not sourceJobId alone (R5).
  // WHY: refuse when the related-family scan fails — a partial tree under the
  // lock could miss a done sibling and insert a duplicate platform variant.
  const familyForRoot = await collectRelatedVariants(sourceJob, userId, res);
  if (res.headersSent) return { kind: 'headers_sent' };
  if (!familyForRoot) return { kind: 'family_incomplete' };
  const rootJobId = familyForRoot.rootJobId;
  const lockKey = multiplyLockKey(rootJobId, targetPlatform);

  let redisLock: AcquiredRedisLock | null = null;
  let localLockHeld = false;
  const lockResult = await tryAcquireRedisLock(
    lockKey,
    MULTIPLY_LOCK_TTL_SECONDS,
    MULTIPLY_LOCK_RENEW_MS,
  );
  if (lockResult.status === 'held') {
    // WHY: client needs jobId to open Result / poll — look up the generating
    // sibling when the lock is already held by another Adapt request.
    const jobId = await findGeneratingSiblingJobId({
      sourceJob,
      sourceJobId,
      userId,
      targetPlatform,
      res,
    });
    if (res.headersSent) return { kind: 'headers_sent' };
    return { kind: 'in_progress', ...(jobId ? { jobId } : {}) };
  }
  if (lockResult.status === 'acquired') {
    redisLock = lockResult.lock;
  } else if (lockResult.status === 'unavailable') {
    // SECURITY: without a cross-process lock, concurrent Adapt requests on
    // different instances can both miss the sibling check and insert duplicates.
    if (mustFailClosedOnMultiplyLockUnavailable()) {
      logger.warn('Multiply Redis lock unavailable — refusing Adapt (fail closed)', {
        rootJobId,
        targetPlatform,
      });
      return { kind: 'lock_unavailable' };
    }
    if (localMultiplyLocks.has(lockKey)) {
      const jobId = await findGeneratingSiblingJobId({
        sourceJob,
        sourceJobId,
        userId,
        targetPlatform,
        res,
      });
      if (res.headersSent) return { kind: 'headers_sent' };
      return { kind: 'in_progress', ...(jobId ? { jobId } : {}) };
    }
    localMultiplyLocks.add(lockKey);
    localLockHeld = true;
  }

  try {
    // SECURITY: sibling check under the lock so two concurrent Adapts cannot
    // both miss each other and insert duplicate platform variants (R5).
    const family = await collectRelatedVariants(sourceJob, userId, res);
    if (res.headersSent) return { kind: 'headers_sent' };
    if (!family) return { kind: 'family_incomplete' };
    const existing = pickVariantForPlatform(family.variants, targetPlatform, sourceJobId);
    if (existing && existing.status === 'done') {
      return { kind: 'reused', jobId: existing.jobId };
    }
    if (existing && isSiblingActivelyGenerating(existing.jobId, existing.status)) {
      return { kind: 'in_progress', jobId: existing.jobId };
    }

    const newJobId = uuidv4();
    const userProfile = await getUserProfile(userId);
    const newJob: PipelineJob = {
      id: newJobId,
      userId,
      topic: sourceJob.topic,
      platform: targetPlatform,
      tone: sourceJob.tone ?? undefined,
      targetAudience: sourceJob.targetAudience ?? undefined,
      brandVoice: userProfile.brandVoice || sourceJob.brandVoice || 'professional',
      phrasesUse: userProfile.phrasesUse || sourceJob.phrasesUse || '',
      phrasesAvoid: userProfile.phrasesAvoid || sourceJob.phrasesAvoid || '',
      contentDna: userProfile.contentDna || sourceJob.contentDna || null,
      sourceJobId,
      sourcePlatform: sourceJob.platform,
      status: 'pending',
      retryCount: 0,
      deleted: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // WHY: persist first so a failed insert never leaves a phantom job in memory.
    // WHY: check the boolean: insertPendingJobRow swallows DB errors and returns false —
    // enqueueing anyway would run a full pipeline whose result can't persist a durable row.
    const inserted = await insertPendingJobRow(newJob);
    if (!inserted) {
      logger.error('Multiply pending row insert failed; not enqueueing', { jobId: newJobId });
      return { kind: 'persist_failed' };
    }
    setJobInStore(newJobId, newJob);

    // WHY: target-platform plan/rules only — never reuse source orchestrator
    // (LinkedIn plan must not steer a Twitter Adapt). Thin research omits
    // skipResearch so BullMQ parseSkipResearch and direct mode both re-research.
    const skipResearch: SkipResearchOpts | undefined = isUsableSkipResearch(cachedResearch)
      ? {
          researchResult: cachedResearch,
          taskPlan: buildTargetPlatformTaskPlan({
            platform: targetPlatform,
            topic: sourceJob.topic,
            targetAudience: sourceJob.targetAudience,
          }),
          platformRules: getPlatformRules(targetPlatform),
        }
      : undefined;

    const queueResult = await addJobToQueueDetailed(newJobId, {
      ...newJob,
      ...(skipResearch ? { skipResearch } : {}),
    });
    if (queueResult !== 'queued') {
      if (queueResult === 'active') {
        logger.warn('Multiply queue returned active for a new jobId; using direct mode', {
          jobId: newJobId,
        });
      }
      runPipelineDirect(
        newJobId,
        newJob,
        skipResearch ? { skipResearch } : undefined,
      ).catch((err: unknown) => {
        logger.error('Multiply pipeline failed', {
          jobId: newJobId,
          error: err instanceof Error ? err.message : String(err),
        });
      });
    }

    return { kind: 'created', jobId: newJobId };
  } finally {
    if (redisLock) {
      await redisLock.release();
    }
    if (localLockHeld) {
      localMultiplyLocks.delete(lockKey);
    }
  }
}
