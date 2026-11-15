import type { ContentJob, JobLog, SSEEvent } from '../../../types/job';

type JobData = ContentJob | null;

/** Cap in-memory SSE agent timeline growth on long-running / reconnecting tabs (L1). */
const MAX_AGENT_LOGS = 50;

export interface MergeSSEResult {
  next: JobData;
  /** True when a full state event bootstrapped job data for the first time. */
  bootstrapped: boolean;
}

function isJobLog(value: unknown): value is JobLog {
  if (!value || typeof value !== 'object') return false;
  const row = value as Record<string, unknown>;
  return typeof row.agentName === 'string' && typeof row.action === 'string';
}

function capAgentLogs(logs: JobLog[]): JobLog[] {
  return logs.length <= MAX_AGENT_LOGS ? logs : logs.slice(-MAX_AGENT_LOGS);
}

function appendAgentLog(
  existing: JobLog[] | undefined,
  entry: JobLog,
): JobLog[] {
  return capAgentLogs([...(existing || []), entry]);
}

function normalizeAgentLogs(raw: unknown): JobLog[] {
  if (!Array.isArray(raw)) return [];
  return capAgentLogs(raw.filter(isJobLog));
}

/**
 * Pure SSE → jobData merge (extracted from useJobData under the 400-line cap).
 * Caller owns setState + lastSSEEventAt / hadJobDataRef updates.
 */
export function mergeSSEEventIntoJob(
  prev: JobData,
  data: SSEEvent,
  jobId: string,
): MergeSSEResult {
  if (!prev) {
    // WHY: a minimal shape guard before the cast: bootstraps ContentJob off a
    // same-origin SSE payload — defense-in-depth for malformed 'state' events.
    // WHY: accept id OR jobId (CORR-013): server state events spread memory job
    // (`id`) and may also set `jobId`.
    const stateId = (data as { jobId?: unknown; id?: unknown }).jobId
      ?? (data as { id?: unknown }).id;
    if (data.type === 'state' && typeof stateId === 'string') {
      const state = data as unknown as ContentJob;
      return {
        bootstrapped: true,
        next: {
          ...state,
          id: stateId,
          outputs: state.outputs || [],
          logs: state.logs || [],
          agentLogs: normalizeAgentLogs(state.agentLogs),
        },
      };
    }
    // WHY: still use data.outputs/data.logs: a 'state' event with a bad jobId
    // can still carry valid outputs/logs — don't discard them.
    return {
      bootstrapped: false,
      next: {
        id: jobId,
        userId: '',
        topic: '',
        platform: '',
        tone: '',
        targetAudience: '',
        brandVoice: '',
        status: data.stage || 'pending',
        progress: data.progress ?? 0,
        stage: data.stage || 'pending',
        message: data.message || '',
        retryCount: 0,
        deleted: 0,
        createdAt: '',
        updatedAt: '',
        outputs: (data.type === 'state' && data.outputs) || [],
        logs: (data.type === 'state' && data.logs) || [],
        criticResult: null,
        agentLogs: data.agent
          ? appendAgentLog(undefined, {
            agentName: data.agent,
            action: data.message || data.stage || '',
            durationMs: data.durationMs,
          })
          : [],
      },
    };
  }

  const next = { ...prev };
  if (data.stage) {
    // WHY: also map 'failed': only 'done' used to update status → spinner stuck.
    if (data.stage === 'done') next.status = 'done';
    else if (data.stage === 'failed') next.status = 'failed';
    next.stage = data.stage;
  }
  if (data.type === 'state') {
    // WHY: state events carry authoritative status; stage alone can lag a terminal status.
    const stateStatus = (data as { status?: unknown }).status;
    if (stateStatus === 'done' || stateStatus === 'failed') next.status = stateStatus;
  }
  if (typeof data.progress === 'number') next.progress = data.progress;
  if (data.message) next.message = data.message;
  if (data.agent) {
    next.agentLogs = appendAgentLog(next.agentLogs, {
      agentName: data.agent,
      action: data.message || data.stage || '',
      durationMs: data.durationMs,
    });
  }
  if (data.type === 'state') {
    if (data.outputs) next.outputs = data.outputs;
    if (data.logs) next.logs = data.logs;
    // NOTE: SSEEvent has no agentLogs field; state payloads may still carry them.
    const stateAgentLogs = (data as { agentLogs?: unknown }).agentLogs;
    if (Array.isArray(stateAgentLogs)) {
      next.agentLogs = normalizeAgentLogs(stateAgentLogs);
    }
  }
  return { next, bootstrapped: false };
}
