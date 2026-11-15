import { useEffect, type MutableRefObject, type Dispatch, type SetStateAction } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getJob, getJobStatus } from '../../../api';
import type { ContentJob } from '../../../types/job';

type JobData = ContentJob | null;
type SetJobData = Dispatch<SetStateAction<JobData>>;
type SetLoadError = Dispatch<SetStateAction<'not_found' | 'error' | 'lost' | null>>;

interface JobStatusPollArgs {
  jobId: string | undefined;
  /** Job already loaded as done+final (or failed) — nothing left to poll for. */
  terminalWithFinal: boolean;
  loadError: 'not_found' | 'error' | 'lost' | null;
  regenerating: boolean;
  lastSSEEventAt: MutableRefObject<number>;
  /** Kept for caller compatibility; staleness now uses last observed progress. */
  jobCreatedAtMs?: MutableRefObject<number | null>;
  consecutivePoll404s: MutableRefObject<number>;
  hadJobDataRef: MutableRefObject<boolean>;
  pollInFlightRef: MutableRefObject<boolean>;
  setJobData: SetJobData;
  setLoadError: SetLoadError;
  clearRegenerating: () => void;
}

// WHY: extracted from useJobData so the poll inFlight + silence-gate stay
// testable and useJobData stays under the 400-line cap.
export function useJobStatusPoll({
  jobId,
  terminalWithFinal,
  loadError,
  regenerating,
  lastSSEEventAt,
  consecutivePoll404s,
  hadJobDataRef,
  pollInFlightRef,
  setJobData,
  setLoadError,
  clearRegenerating,
}: JobStatusPollArgs): void {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!jobId) return;
    // WHY: initial getJob 404 is definitive — keep polling would reclassify as
    // "lost" after 5 ticks (QA-C2-002).
    if (loadError === 'not_found') return;
    // WHY: opening a finished job needs no poll tick, and its terminal branch would
    // refetch + invalidate library/dashboard/calendar for nothing. Regenerate flips
    // status off terminal, which re-arms this effect via the deps below.
    if (terminalWithFinal && !regenerating) return;
    // WHY: effect-scoped flag — an in-flight getJobStatus/getJob for the previous jobId
    // still resolves after cleanup and must not write state for the new job (loadGen pattern).
    let cancelled = false;
    let lastProgressKey = '';
    let lastProgressAt = Date.now();
    const iv = setInterval(async () => {
      // WHY: keep interval at 2s but only hit REST when SSE has been silent —
      // EventSource OPEN ≠ events flowing; silence gate avoids duplicate work.
      if (Date.now() - lastSSEEventAt.current < 10000) return;
      // WHY: skip overlapping ticks — getJobStatus+getJob can outlast 2s
      // (BatchResult inFlight pattern).
      if (pollInFlightRef.current) return;
      pollInFlightRef.current = true;
      try {
        const s = await getJobStatus(jobId);
        if (cancelled) return;
        consecutivePoll404s.current = 0;
        const isTerminal = (s.status === 'done' && s.hasFinal) || s.status === 'failed';
        if (!isTerminal) {
          const STALE_CLIENT_MS = 20 * 60 * 1000;
          const sseFresh = Date.now() - lastSSEEventAt.current < 15000;
          const progressKey = `${s.status}|${s.stage ?? ''}|${s.progress ?? ''}`;
          if (progressKey !== lastProgressKey) {
            lastProgressKey = progressKey;
            lastProgressAt = Date.now();
          }
          const serverUpdatedMs = s.updatedAt ? Date.parse(s.updatedAt) : NaN;
          const activityMs = Number.isFinite(serverUpdatedMs)
            ? Math.max(serverUpdatedMs, lastProgressAt)
            : lastProgressAt;
          const ageMs = Date.now() - activityMs;
          // WHY: age from last observed progress, not createdAt — after a reload
          // mid-regenerate `regenerating` is false and createdAt is the original
          // create time, which would wrongly report an active regen as lost.
          // Clear regenerating on lost too: a hung regen used to keep the guard
          // forever and never surface ErrorState.
          if (ageMs > STALE_CLIENT_MS && !sseFresh) {
            setLoadError('lost');
            clearRegenerating();
            clearInterval(iv);
            return;
          }
          setJobData((prev): JobData => {
            if (!prev) return prev;
            const prevTerminal = prev.status === 'failed' || (
              prev.status === 'done'
              && Array.isArray(prev.outputs)
              && prev.outputs.some((o) => o.outputType === 'final')
            );
            if (prevTerminal) return prev;
            return {
              ...prev,
              status: s.status,
              stage: s.stage ?? prev.stage,
              progress: typeof s.progress === 'number' ? s.progress : prev.progress,
              topic: s.topic || prev.topic,
            };
          });
          return;
        }

        const d = await getJob(jobId);
        if (cancelled) return;
        consecutivePoll404s.current = 0;
        setJobData((prev): JobData => {
          const prevHasFinal = Array.isArray(prev?.outputs)
            && prev.outputs.some((o) => o.outputType === 'final');
          const nextHasFinal = Array.isArray(d.outputs)
            && d.outputs.some((o) => o.outputType === 'final');
          if (prev?.status === 'done' && prevHasFinal && !nextHasFinal) return prev;
          if (prev?.status === 'failed' && prevHasFinal && !nextHasFinal) return prev;
          return d;
        });
        clearRegenerating();
        clearInterval(iv);
        Promise.allSettled([
          queryClient.invalidateQueries({ queryKey: ['library', 'jobs'] }),
          queryClient.invalidateQueries({ queryKey: ['dashboard', 'jobs'] }),
          queryClient.invalidateQueries({ queryKey: ['calendar', 'jobs'] }),
        ]).catch(() => {});
      } catch (err: unknown) {
        if (cancelled) return;
        const status = (err as { response?: { status?: number } })?.response?.status;
        if (status === 404) {
          consecutivePoll404s.current += 1;
          const sseFresh = Date.now() - lastSSEEventAt.current < 15000;
          if (!sseFresh && consecutivePoll404s.current >= 5) {
            setLoadError((prev) => {
              if (prev === 'not_found') return 'not_found';
              return hadJobDataRef.current ? 'lost' : 'not_found';
            });
            clearInterval(iv);
          }
        }
      } finally {
        pollInFlightRef.current = false;
      }
    }, 2000);
    return () => {
      cancelled = true;
      clearInterval(iv);
      pollInFlightRef.current = false;
    };
    // WHY: regenerating in deps — terminal clears interval; regen must re-arm poll.
  }, [
    jobId,
    terminalWithFinal,
    queryClient,
    loadError,
    regenerating,
    clearRegenerating,
    lastSSEEventAt,
    consecutivePoll404s,
    hadJobDataRef,
    pollInFlightRef,
    setJobData,
    setLoadError,
  ]);
}
