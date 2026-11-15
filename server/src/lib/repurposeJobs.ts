import { v4 as uuidv4 } from 'uuid';
import { setJobInStore } from './jobStore.js';
import { addJobToQueue } from './queue.js';
import { insertPendingJobRow } from './persistJob.js';
import { runPipelineDirect } from './pipelineDirect.js';
import { buildSourceMaterial, type ExtractedArticle } from './articleExtract.js';
import type { UserProfile } from './profileStore.js';
import type { PipelineJob } from './pipeline.js';
import { TOPIC_MAX_LENGTH } from '../schemas/index.js';
import { logger } from './logger.js';
import {
  insertPendingJobAndAdvanceCursor,
  type AdvanceFeedCursor,
} from './feedMonitorCheck.js';

// WHY: extracted from routes/content/repurpose.ts so feedMonitorWorker can
// create repurpose jobs without importing the Express route module.

export async function createJobsForPlatforms(
  userId: string,
  userProfile: UserProfile,
  url: string,
  article: ExtractedArticle,
  targetPlatforms: string[],
  tone: string,
  targetAudience: string,
  opts?: { advanceFeedCursor?: AdvanceFeedCursor },
): Promise<Array<{ jobId: string; platform: string; topic: string }>> {
  const settled = await Promise.allSettled(
    targetPlatforms.map(async (targetPlatform) => {
      const jobId = uuidv4();
      const sourceMaterial = buildSourceMaterial(url, targetPlatform, article.text);
      const topic = article.topicSentence.slice(0, TOPIC_MAX_LENGTH);

      const job: PipelineJob = {
        id: jobId,
        userId,
        topic,
        platform: targetPlatform,
        tone,
        targetAudience,
        brandVoice: userProfile.brandVoice || 'professional',
        phrasesUse: userProfile.phrasesUse || '',
        phrasesAvoid: userProfile.phrasesAvoid || '',
        contentDna: userProfile.contentDna || null,
        sourceUrl: url,
        sourceMaterial,
        status: 'pending',
        retryCount: 0,
        deleted: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // WHY: persist first so a failed insert never leaves a phantom job in memory.
      // WHY: check the boolean — reject this platform so createJobsForPlatforms
      // omits it rather than enqueueing a phantom (same as multiplyAdapt).
      // FLOW: feed monitors pass advanceFeedCursor so lastItemGuid moves in the
      // same txn as the pending insert (no crash-window duplicate).
      const inserted = opts?.advanceFeedCursor
        ? await insertPendingJobAndAdvanceCursor(job, opts.advanceFeedCursor)
        : await insertPendingJobRow(job);
      if (!inserted) {
        logger.error('Repurpose pending row insert failed; not enqueueing', {
          jobId,
          platform: targetPlatform,
        });
        throw new Error('Pending job row insert failed');
      }
      setJobInStore(jobId, job);
      const queued = await addJobToQueue(jobId, { ...job });
      if (!queued) {
        runPipelineDirect(jobId, job).catch((err: unknown) => {
          logger.error('Repurpose direct pipeline failed', {
            jobId,
            platform: targetPlatform,
            error: err instanceof Error ? err.message : String(err),
          });
        });
      }
      return { jobId, platform: targetPlatform, topic };
    }),
  );
  return settled
    .filter(
      (r): r is PromiseFulfilledResult<{ jobId: string; platform: string; topic: string }> =>
        r.status === 'fulfilled',
    )
    .map((r) => r.value);
}
