import * as Sentry from '@sentry/node';
import { Worker, Job } from 'bullmq';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load env from root
config({ path: resolve(process.cwd(), '.env') });
config({ path: resolve(process.cwd(), '../.env') });

import { createRedisConnection } from '../lib/queue.js';
import { env } from '../config.js';
import { sseManager } from '../lib/sse.js';
import { runAndPersistPipeline } from '../lib/pipeline.js';
import { logger } from '../lib/logger.js';

// In-memory job store for when DB is not available
const jobStore = new Map<string, any>();

export function getJobFromStore(jobId: string) {
  return jobStore.get(jobId);
}

export function setJobInStore(jobId: string, data: any) {
  if (data === undefined) {
    jobStore.delete(jobId);
  } else {
    jobStore.set(jobId, data);
  }
}

async function processContentJob(job: Job) {
  const {
    jobId, userId, topic, platform, tone, targetAudience,
    brandVoice, phrasesUse, phrasesAvoid, contentDna, initialFeedback,
  } = job.data;

  logger.info('Processing job', { jobId, topic, platform });

  const jobData: any = {
    id: jobId,
    userId,
    topic,
    platform,
    tone,
    targetAudience,
    brandVoice,
    phrasesUse,
    phrasesAvoid,
    contentDna,
    initialFeedback,
    status: 'pending',
    retryCount: 0,
  };

  function emitProgress(stage: string, progress: number, agent: string, message: string, durationMs?: number) {
    // WHY read-through from the store: mutating the local `jobData` closure
    // variable and writing it back would clobber any richer snapshot (e.g. one
    // with `outputs` attached) that a later store.set() call already wrote —
    // this caused jobs to poll as status:'done' with no outputs forever.
    // Merging onto the current store value keeps whichever fields the last
    // writer added instead of reverting them.
    const current = getJobFromStore(jobId) || jobData;
    current.status = stage === 'done' ? 'done' : 'processing';
    current.stage = stage;
    current.progress = progress;
    setJobInStore(jobId, { ...current });
    sseManager.sendEvent(jobId, { type: 'progress', stage, progress, agent, message, durationMs });
  }

  // NOTE: emit immediately when the worker picks up the job so SSE clients aren't
  // staring at a blank screen for 2-5s while the orchestrator spins up.
  // BullMQ may queue a job for seconds before a worker slot is free; this event
  // signals "your job is now running" vs "your job is queued".
  sseManager.sendEvent(jobId, {
    type: 'progress', stage: 'planning', progress: 1,
    agent: 'system', message: 'Job picked up by worker…',
  });

  await runAndPersistPipeline(jobData, emitProgress, {
    set: (id, data) => setJobInStore(id, data),
    evict: (id) => setJobInStore(id, undefined),
  });
}

// Create and start worker
let worker: Worker | null = null;

export function startWorker() {
  // Only start worker if Redis URL is configured
  const hasRedis = env.UPSTASH_REDIS_URL || env.REDIS_URL;
  if (!hasRedis) {
    logger.warn('No Redis configured — BullMQ worker disabled');
    logger.warn('Jobs will run directly in the Express process (development mode)');
    return null;
  }

  try {
    // WHY separate connection: BullMQ's Queue and Worker must not share the same
  // Redis connection. The Worker uses blocking commands (BRPOP) that would
  // block the connection and prevent the Queue from sending new jobs.
    worker = new Worker('content-generation', processContentJob, {
      connection: createRedisConnection(),
      concurrency: 2,
    });

    worker.on('completed', (job) => {
      logger.info('Job completed', { jobId: job.id });
    });

    worker.on('failed', (job, err) => {
      console.error(`Job ${job?.id} failed:`, err.message);
      Sentry.captureException(err, { tags: { jobId: job?.id, action: 'worker-failed' } });
    });

    worker.on('error', (err) => {
      // Suppress Redis connection errors
      if (err.message.includes('ECONNREFUSED') || err.message.includes('Connection is closed')) return;
      console.error('Worker error:', err.message);
      Sentry.captureException(err, { tags: { action: 'worker-error' } });
    });

    logger.info('Content generation worker started');
    return worker;
  } catch (error) {
    logger.warn('BullMQ worker not available — using direct pipeline');
    return null;
  }
}

// WHY: BullMQ's Worker.close() waits for the current job to finish (or requeues
// it) before resolving, instead of killing it mid-flight. Called from index.ts's
// coordinated shutdown sequence — never call process.exit() directly on signal
// receipt, or an in-flight LLM pipeline job gets abruptly terminated.
export async function stopWorker(): Promise<void> {
  if (worker) {
    await worker.close();
    worker = null;
  }
}
