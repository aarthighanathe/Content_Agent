import { useCallback, useEffect, useRef, useState } from 'react';
import { getJob, getJobStatus, getRelatedJobs, multiplyJob } from '../../../api';
import type { PlatformContent } from '../../../types/job';

export type MultiplyEntry = {
  jobId: string;
  status: 'processing' | 'done' | 'failed';
  content?: PlatformContent | PlatformContent[];
  progress?: number;
  /** True when this row came from GET /related (family lineage), not this session's Adapt click. */
  fromFamily?: boolean;
  isRoot?: boolean;
};

// WHY guard: JobOutput.content is `unknown` (shape varies by outputType per job.ts).
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
  // WHY a ref set of interval handles, cleared on unmount: each handleMultiply call
  // creates its own setInterval (one per target platform) outside any useEffect, so
  // nothing previously cleaned them up if the user navigated away from Result before
  // a multiply job finished — the interval kept firing getJob() against an unmounted
  // component indefinitely (FUNCTIONAL_AUDIT_2026-07.md finding #14).
  const activeIntervals = useRef<Set<ReturnType<typeof setInterval>>>(new Set());

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

  // WHY reset + reload when jobId changes: Result reuses this component across
  // /result/:jobId navigations — leftover session state from job A would show
  // wrong Open links on job B.
  useEffect(() => {
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
      const poll = setInterval(async () => {
        try {
          const s = await getJobStatus(newJobId);
          if (s?.status === 'done' && s.hasFinal) {
            clearInterval(poll);
            activeIntervals.current.delete(poll);
            const d = await getJob(newJobId);
            const finalOutput = d?.outputs?.find((o) => o.outputType === 'final');
            const content = finalOutput ? asPlatformContent(finalOutput.content) : undefined;
            setMultiplyJobs((p) => ({
              ...p,
              [targetPlatform]: { jobId: newJobId, status: 'done', content, progress: 100 },
            }));
            void refreshFamily(jobId);
          } else if (s?.status === 'failed') {
            clearInterval(poll);
            activeIntervals.current.delete(poll);
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
        } catch { /* keep polling */ }
      }, 2500);
      activeIntervals.current.add(poll);
    } catch {
      setMultiplyJobs((p) => ({
        ...p,
        [targetPlatform]: { jobId: '', status: 'failed', progress: 0 },
      }));
    }
  }

  return { multiplyJobs, handleMultiply };
}
