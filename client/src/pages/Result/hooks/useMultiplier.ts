import { useEffect, useRef, useState } from 'react';
import { getJob, multiplyJob } from '../../../api';
import type { PlatformContent } from '../../../types/job';

export type MultiplyEntry = {
  jobId: string;
  status: 'processing' | 'done' | 'failed';
  content?: PlatformContent | PlatformContent[];
  progress?: number;
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

  useEffect(() => {
    // WHY copied to a local: the cleanup closure should clear whatever intervals
    // are active *at unmount time*, not a stale snapshot from mount — capturing
    // the ref object itself (not its .current value) into `intervals` achieves
    // that while satisfying react-hooks/exhaustive-deps' preference for not
    // reading .current directly inside a cleanup function.
    const intervals = activeIntervals.current;
    return () => {
      intervals.forEach((id) => clearInterval(id));
      intervals.clear();
    };
  }, []);

  async function handleMultiply(targetPlatform: string) {
    if (!jobId || multiplyJobs[targetPlatform]?.status === 'processing') return;
    setMultiplyJobs((p) => ({ ...p, [targetPlatform]: { jobId: '', status: 'processing', progress: 5 } }));
    try {
      const { jobId: newJobId } = await multiplyJob(jobId, targetPlatform);
      setMultiplyJobs((p) => ({ ...p, [targetPlatform]: { jobId: newJobId, status: 'processing', progress: 10 } }));
      const poll = setInterval(async () => {
        try {
          const d           = await getJob(newJobId);
          const finalOutput = d?.outputs?.find((o) => o.outputType === 'final');
          if (d?.status === 'done' && finalOutput) {
            clearInterval(poll);
            activeIntervals.current.delete(poll);
            const content = asPlatformContent(finalOutput.content);
            setMultiplyJobs((p) => ({ ...p, [targetPlatform]: { jobId: newJobId, status: 'done', content, progress: 100 } }));
          } else if (d?.status === 'failed') {
            clearInterval(poll);
            activeIntervals.current.delete(poll);
            setMultiplyJobs((p) => ({ ...p, [targetPlatform]: { jobId: newJobId, status: 'failed', progress: 0 } }));
          } else {
            setMultiplyJobs((p) => ({ ...p, [targetPlatform]: { ...p[targetPlatform], progress: d?.progress ?? p[targetPlatform]?.progress ?? 10 } }));
          }
        } catch {}
      }, 2500);
      activeIntervals.current.add(poll);
    } catch {
      setMultiplyJobs((p) => ({ ...p, [targetPlatform]: { jobId: '', status: 'failed', progress: 0 } }));
    }
  }

  return { multiplyJobs, handleMultiply };
}
