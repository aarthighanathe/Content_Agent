// WHY: (R5): Adapt multiply single-flight + insert lives here so regenerate.ts
// stays under the 400-line cap; Redis lock + sibling check must stay together.
import { v4 as uuidv4 } from 'uuid';
import type { Response } from 'express';
import type { ResearchResult } from '../../agents/researcher.js';
import type { OrchestratorResult } from '../../agents/orchestrator.js';
import type { PipelineJob } from '../../lib/pipeline.js';
import type { AssembledJob, MemoryJob } from './ownership.js';
import { getJobFromStore, jobsMemory, setJobInStore } from './ownership.js';
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
import { isJobGeneratingStatus } from '../../lib/regenerateClaim.js';

// WHY: process-local multiply mutex when Redis is down — single-process direct
// mode still needs to serialize Adapt for the same root+platform.
const localMultiplyLocks = new Set<string>();

function isMemoryInProgress(jobId: string): boolean {
  const mem = getJobFromStore(jobId) || jobsMemory.get(jobId);
  if (!mem) return false;
  const status = mem.status;
  return status === 'pending' || status === 'processing'
    || status === 'researching' || status === 'writing'
    || status === 'formatting' || status === 'critiquing';
}

export type MultiplyAdaptResult =
  | { kind: 'created'; jobId: string }
  | { kind: 'reused'; jobId: string }
  | { kind: 'in_progress'; jobId?: string }
  | { kind: 'headers_sent' };

export async function createMultiplyAdaptJob(params: {
  sourceJob: MemoryJob | AssembledJob;
  sourceJobId: string;
  userId: string;
  targetPlatform: string;
  cachedResearch: ResearchResult;
  cachedOrchestrator: OrchestratorResult | undefined;
  res: Response;
}): Promise<MultiplyAdaptResult> {
  const {
    sourceJob,
    sourceJobId,
    userId,
    targetPlatform,
    cachedResearch,
    cachedOrchestrator,
    res,
  } = params;

  // WHY: root id for the lock key — siblings Adapt'd from different members of
  // the same family must serialize on one key, not sourceJobId alone (R5).
  const familyForRoot = await collectRelatedVariants(sourceJob, userId, res);
  if (res.headersSent) return { kind: 'headers_sent' };
  const rootJobId = familyForRoot?.rootJobId ?? sourceJob.id;
  const lockKey = multiplyLockKey(rootJobId, targetPlatform);

  let redisLock: AcquiredRedisLock | null = null;
  let localLockHeld = false;
  const lockResult = await tryAcquireRedisLock(
    lockKey,
    MULTIPLY_LOCK_TTL_SECONDS,
    MULTIPLY_LOCK_RENEW_MS,
  );
  if (lockResult.status === 'held') {
    return { kind: 'in_progress' };
  }
  if (lockResult.status === 'acquired') {
    redisLock = lockResult.lock;
  } else if (localMultiplyLocks.has(lockKey)) {
    return { kind: 'in_progress' };
  } else {
    localMultiplyLocks.add(lockKey);
    localLockHeld = true;
  }

  try {
    // SECURITY: sibling check under the lock so two concurrent Adapts cannot
    // both miss each other and insert duplicate platform variants (R5).
    const family = await collectRelatedVariants(sourceJob, userId, res);
    if (res.headersSent) return { kind: 'headers_sent' };
    if (family) {
      const existing = pickVariantForPlatform(family.variants, targetPlatform, sourceJobId);
      if (existing && existing.status === 'done') {
        return { kind: 'reused', jobId: existing.jobId };
      }
      if (
        existing
        && (isMemoryInProgress(existing.jobId) || isJobGeneratingStatus(existing.status))
      ) {
        return { kind: 'in_progress', jobId: existing.jobId };
      }
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
    await insertPendingJobRow(newJob);
    setJobInStore(newJobId, newJob);

    const skipResearch = {
      researchResult: cachedResearch,
      taskPlan: cachedOrchestrator?.taskPlan
        || `Create engaging ${targetPlatform.replace(/_/g, ' ')} content about: ${sourceJob.topic}`,
      platformRules: cachedOrchestrator?.platformRules || {},
    };

    const queueResult = await addJobToQueueDetailed(newJobId, {
      ...newJob,
      skipResearch,
    });
    if (queueResult !== 'queued') {
      if (queueResult === 'active') {
        logger.warn('Multiply queue returned active for a new jobId; using direct mode', {
          jobId: newJobId,
        });
      }
      runPipelineDirect(newJobId, newJob, { skipResearch }).catch((err: unknown) => {
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
