import { useEffect, type MutableRefObject, type Dispatch, type SetStateAction } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getJob, getJobStatus } from '../../../api';
import type { ContentJob } from '../../../types/job';

type JobData = ContentJob | null;
type SetJobData = Dispatch<SetStateAction<JobData>>;
type SetLoadError = Dispatch<SetStateAction<'not_found' | 'error' | 'lost' | null>>;

interface JobStatusPollArgs {
  jobId: string | undefined;
  loadError: 'not_found' | 'error' | 'lost' | null;
  regenerating: boolean;
  lastSSEEventAt: MutableRefObject<number>;
  jobCreatedAtMs: MutableRefObject<number | null>;
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
  loadError,
  regenerating,
  lastSSEEventAt,
  jobCreatedAtMs,
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
        consecutivePoll404s.current = 0;
        const isTerminal = (s.status === 'done' && s.hasFinal) || s.status === 'failed';
        if (!isTerminal) {
          const STALE_CLIENT_MS = 20 * 60 * 1000;
          const sseFresh = Date.now() - lastSSEEventAt.current < 15000;
          const createdMs = jobCreatedAtMs.current;
          const ageMs = createdMs != null ? Date.now() - createdMs : 0;
          // WHY: !regenerating: createdAt is original create time — regen on an
          // old job would otherwise trip lost instantly.
          if (ageMs > STALE_CLIENT_MS && !sseFresh && !regenerating) {
            setLoadError('lost');
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
      clearInterval(iv);
      pollInFlightRef.current = false;
    };
    // WHY: regenerating in deps — terminal clears interval; regen must re-arm poll.
  }, [
    jobId,
    queryClient,
    loadError,
    regenerating,
    clearRegenerating,
    lastSSEEventAt,
    jobCreatedAtMs,
    consecutivePoll404s,
    hadJobDataRef,
    pollInFlightRef,
    setJobData,
    setLoadError,
  ]);
}
