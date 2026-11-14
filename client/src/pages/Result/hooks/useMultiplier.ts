import { useCallback, useEffect, useRef, useState } from 'react';
import { getJob, getJobStatus, getRelatedJobs, multiplyJob } from '../../../api';
import { useIsMountedRef } from '../../../hooks/useTrackedTimeout';
import { getSubmitError } from '../../../lib/errorMessages';
import type { PlatformContent } from '../../../types/job';

const MAX_POLL_MS = 20 * 60 * 1000;

export type MultiplyEntry = {
  jobId: string;
  status: 'processing' | 'done' | 'failed';
  content?: PlatformContent | PlatformContent[];
  progress?: number;
  /** True when this row came from GET /related (family lineage), not this session's Adapt click. */
  fromFamily?: boolean;
  isRoot?: boolean;
  /** Set when POST /multiply fails (e.g. 409 JOB_IN_PROGRESS). */
  error?: string;
};

// WHY: guard: JobOutput.content is `unknown` (shape varies by outputType per job.ts).
// A 'final' output's content is always an object (single PlatformContent) or an array of
// them (carousel slides) — narrow to that before trusting it as PlatformContent, matching
// the null-safety pattern used in historyHelpers.ts/dashboardTypes.ts.
function asPlatformContent(content: unknown): PlatformContent | PlatformContent[] | undefined {
  if (Array.isArray(content)) return content as PlatformContent[];
  if (typeof content === 'object' && content !== null) return content as PlatformContent;
  return undefined;
}

export function useMultiplier(jobId: string | undefined) {
  const [multiplyJobs, setMultiplyJobs] = useState<Record<string, MultiplyEntry>>({});
  // WHY: a ref set of interval handles, cleared on unmount: handleMultiply starts one
  // setInterval per platform outside any effect, so without tracking they would keep
  // polling getJob() after the user leaves Result.
  const activeIntervals = useRef<Set<ReturnType<typeof setInterval>>>(new Set());
  const isMountedRef = useIsMountedRef();
  // WHY: ref: poll closures outlive renders; compare against the live jobId.
  const jobIdRef = useRef(jobId);
  useEffect(() => {
    jobIdRef.current = jobId;
  }, [jobId]);

  const refreshFamily = useCallback(async (id: string): Promise<void> => {
    try {
      const related = await getRelatedJobs(id);
      setMultiplyJobs((prev) => {
        const next = { ...prev };
        for (const v of related.variants) {
          if (v.isCurrent) continue;
          // Don't clobber an in-flight Adapt poll for this platform.
          if (next[v.platform]?.status === 'processing') continue;
          if (v.status === 'done') {
            next[v.platform] = {
              jobId: v.jobId,
              status: 'done',
              progress: 100,
              fromFamily: true,
              isRoot: v.isRoot,
            };
          } else if (v.status === 'failed' && !next[v.platform]) {
            next[v.platform] = {
              jobId: v.jobId,
              status: 'failed',
              progress: 0,
              fromFamily: true,
              isRoot: v.isRoot,
            };
          } else if (
            (v.status === 'processing' || v.status === 'pending') &&
            !next[v.platform]
          ) {
            next[v.platform] = {
              jobId: v.jobId,
              status: 'processing',
              progress: 15,
              fromFamily: true,
              isRoot: v.isRoot,
            };
          }
        }
        return next;
      });
    } catch {
      // Non-fatal — Adapt still works via session multiplyJobs alone.
    }
  }, []);

  useEffect(() => {
    const intervals = activeIntervals.current;
    return () => {
      intervals.forEach((handle) => clearInterval(handle));
      intervals.clear();
    };
  }, []);

  // WHY: reset + reload when jobId changes: Result reuses this component across
  // /result/:jobId navigations — leftover session state from job A would show
  // wrong Open links on job B.
  // WHY: clear intervals here too: the unmount cleanup never runs on a same-
  // route jobId change (Result does not remount), so Adapt polls from job A
  // kept writing into job B's multiplyJobs after navigation.
  useEffect(() => {
    activeIntervals.current.forEach((handle) => clearInterval(handle));
    activeIntervals.current.clear();
    setMultiplyJobs({});
    if (!jobId) return;
    void refreshFamily(jobId);
  }, [jobId, refreshFamily]);

  async function handleMultiply(targetPlatform: string) {
    if (!jobId || multiplyJobs[targetPlatform]?.status === 'processing') return;

    // Already have a finished sibling in the family — just open it (caller
    // ContentMultiplier handles Open); treat Adapt click as no-op create.
    const existing = multiplyJobs[targetPlatform];
    if (existing?.status === 'done' && existing.jobId) return;

    setMultiplyJobs((p) => ({
      ...p,
      [targetPlatform]: { jobId: '', status: 'processing', progress: 5 },
    }));
    try {
      const { jobId: newJobId, reused } = await multiplyJob(jobId, targetPlatform);
      if (reused) {
        setMultiplyJobs((p) => ({
          ...p,
          [targetPlatform]: {
            jobId: newJobId,
            status: 'done',
            progress: 100,
            fromFamily: true,
          },
        }));
        void refreshFamily(jobId);
        return;
      }
      setMultiplyJobs((p) => ({
        ...p,
        [targetPlatform]: { jobId: newJobId, status: 'processing', progress: 10 },
      }));
      const startedAt = Date.now();
      // WHY: inFlight: a slow status/getJob call could overlap the next 2.5s tick
      // and apply results out of order or double-fire the terminal branch.
      let inFlight = false;
      const stop = (): void => {
        clearInterval(poll);
        activeIntervals.current.delete(poll);
      };
      const poll = setInterval(async () => {
        if (inFlight) return;
        // WHY: max duration: a lost job otherwise polled forever; mirror the
        // 20-min stale window used by useJobData.
        if (Date.now() - startedAt > MAX_POLL_MS) {
          stop();
          if (isMountedRef.current && jobIdRef.current === jobId) {
            setMultiplyJobs((p) => ({
              ...p,
              [targetPlatform]: { jobId: newJobId, status: 'failed', progress: 0 },
            }));
          }
          return;
        }
        inFlight = true;
        try {
          const s = await getJobStatus(newJobId);
          // WHY: unmounted or navigated to another job — drop the result.
          if (!isMountedRef.current || jobIdRef.current !== jobId) {
            stop();
            return;
          }
          if (s?.status === 'done' && s.hasFinal) {
            stop();
            const d = await getJob(newJobId);
            if (!isMountedRef.current || jobIdRef.current !== jobId) return;
            const finalOutput = d?.outputs?.find((o) => o.outputType === 'final');
            const content = finalOutput ? asPlatformContent(finalOutput.content) : undefined;
            setMultiplyJobs((p) => ({
              ...p,
              [targetPlatform]: { jobId: newJobId, status: 'done', content, progress: 100 },
            }));
            void refreshFamily(jobId);
          } else if (s?.status === 'failed') {
            stop();
            setMultiplyJobs((p) => ({
              ...p,
              [targetPlatform]: { jobId: newJobId, status: 'failed', progress: 0 },
            }));
          } else {
            setMultiplyJobs((p) => ({
              ...p,
              [targetPlatform]: {
                ...p[targetPlatform],
                progress: s?.progress ?? p[targetPlatform]?.progress ?? 10,
              },
            }));
          }
        } catch { /* keep polling */ } finally {
          inFlight = false;
        }
      }, 2500);
      activeIntervals.current.add(poll);
    } catch (err) {
      setMultiplyJobs((p) => ({
        ...p,
        [targetPlatform]: {
          jobId: '',
          status: 'failed',
          progress: 0,
          error: getSubmitError(err, 'Adapt failed — please try again.').message,
        },
      }));
    }
  }

  return { multiplyJobs, handleMultiply };
}
