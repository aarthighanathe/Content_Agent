import { migrateLegacyKey, userScopedKey } from './userScopedStorage';

export const BATCH_RESULT_KEY = 'ca_batch_result_v1';
const BATCH_TTL_MS = 24 * 60 * 60 * 1000;

export interface BatchJobRef {
  jobId: string;
  topic: string;
  platform: string;
}

export interface PersistedBatch {
  jobs: BatchJobRef[];
  creationFailedCount: number;
  savedAt: number;
}

function isBatchJobRef(value: unknown): value is BatchJobRef {
  if (!value || typeof value !== 'object') return false;
  const o = value as Record<string, unknown>;
  return typeof o.jobId === 'string'
    && o.jobId.length > 0
    && typeof o.topic === 'string'
    && typeof o.platform === 'string';
}

export function writeBatchResult(
  userId: string | null | undefined,
  payload: { jobs: BatchJobRef[]; creationFailedCount?: number },
): void {
  try {
    const body: PersistedBatch = {
      jobs: payload.jobs,
      creationFailedCount: payload.creationFailedCount ?? 0,
      savedAt: Date.now(),
    };
    sessionStorage.setItem(
      userScopedKey(BATCH_RESULT_KEY, userId),
      JSON.stringify(body),
    );
  } catch {
    // Private mode / quota — navigation state still carries the list.
  }
}

export function readBatchResult(userId: string | null | undefined): PersistedBatch | null {
  try {
    // WHY: older builds wrote an unscoped key. Hand it to this user once, then
    // drop it so the next account on this browser cannot read the batch.
    migrateLegacyKey(sessionStorage, BATCH_RESULT_KEY, userId);
    const key = userScopedKey(BATCH_RESULT_KEY, userId);
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    const obj = parsed as Record<string, unknown>;
    if (!Array.isArray(obj.jobs) || obj.jobs.length === 0 || !obj.jobs.every(isBatchJobRef)) {
      return null;
    }
    const savedAt = typeof obj.savedAt === 'number' ? obj.savedAt : 0;
    if (savedAt > 0 && Date.now() - savedAt > BATCH_TTL_MS) {
      sessionStorage.removeItem(key);
      return null;
    }
    return {
      jobs: obj.jobs,
      creationFailedCount: typeof obj.creationFailedCount === 'number'
        ? obj.creationFailedCount
        : 0,
      savedAt,
    };
  } catch {
    return null;
  }
}
