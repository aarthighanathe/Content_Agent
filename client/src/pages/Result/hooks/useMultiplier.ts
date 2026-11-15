import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@clerk/clerk-react';
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

function multiplyFlightKey(ownerJobId: string, platform: string): string {
  return `${ownerJobId}:${platform}`;
}

export function useMultiplier(jobId: string | undefined) {
  const { userId } = useAuth();
  const [multiplyJobs, setMultiplyJobs] = useState<Record<string, MultiplyEntry>>({});
  // WHY: Map by platform (not a bare Set): jobId changes clear by platform key, and
  // refreshFamily must not start a second interval for a platform already polling.
  const activeIntervals = useRef<Map<string, ReturnType<typeof setInterval>>>(new Map());
  const isMountedRef = useIsMountedRef();
  // WHY: ref: poll closures outlive renders; compare against the live jobId.
  const jobIdRef = useRef(jobId);
  const userIdRef = useRef(userId ?? null);
  useEffect(() => {
    jobIdRef.current = jobId;
  }, [jobId]);
  userIdRef.current = userId ?? null;
  // WHY: status==='processing' is React state, so a second Adapt click before
  // paint still sees idle and fires another POST. The ref flips synchronously.
  const inFlightPlatforms = useRef<Set<string>>(new Set());
  // WHY: a slow 409 can land after the winning POST stored a jobId. Keyed by
  // source job + platform so a navigation doesn't mix families.
  const acceptedJobIds = useRef<Map<string, string>>(new Map());

  const startPoll = useCallback((ownerJobId: string, platform: string, siblingJobId: string): void => {
    if (activeIntervals.current.has(platform)) return;

    const flightKey = multiplyFlightKey(ownerJobId, platform);
    acceptedJobIds.current.set(flightKey, siblingJobId);

    const startedAt = Date.now();
    // WHY: inFlight: a slow status/getJob call could overlap the next 2.5s tick
    // and apply results out of order or double-fire the terminal branch.
    let inFlight = false;
    // WHY: capture this poll's handle — stop() must only clearInterval/delete
    // when the map still holds *this* interval. After jobId A→B→A (or
    // clear+refreshFamily restart) a stale in-flight tick must not kill the
    // newer poll or write terminal state for the old siblingJobId.
    // NOTE: handle is assigned once below after setInterval (prefer-const).
    const pollOwner = {
      handle: undefined as ReturnType<typeof setInterval> | undefined,
    };

    const stillOwnsPoll = (): boolean => (
      pollOwner.handle !== undefined
      && activeIntervals.current.get(platform) === pollOwner.handle
      && acceptedJobIds.current.get(flightKey) === siblingJobId
    );

    const stop = (): void => {
      if (!stillOwnsPoll() || pollOwner.handle === undefined) return;
      clearInterval(pollOwner.handle);
      activeIntervals.current.delete(platform);
    };

    const applyTerminal = (
      status: 'done' | 'failed',
      content?: PlatformContent | PlatformContent[],
    ): void => {
      if (!stillOwnsPoll()) return;
      stop();
      if (acceptedJobIds.current.get(flightKey) === siblingJobId) {
        acceptedJobIds.current.delete(flightKey);
      }
      if (!isMountedRef.current || jobIdRef.current !== ownerJobId) return;
      setMultiplyJobs((p) => {
        if (p[platform]?.jobId !== siblingJobId) return p;
        return {
          ...p,
          [platform]: {
            jobId: siblingJobId,
            status,
            ...(status === 'done' ? { content, progress: 100 } : { progress: 0 }),
            fromFamily: p[platform]?.fromFamily,
            isRoot: p[platform]?.isRoot,
          },
        };
      });
    };

    const poll = setInterval(async () => {
      if (inFlight) return;
      // WHY: max duration: a lost job otherwise polled forever; mirror the
      // 20-min stale window used by useJobData.
      if (Date.now() - startedAt > MAX_POLL_MS) {
        applyTerminal('failed');
        return;
      }
      inFlight = true;
      try {
        const s = await getJobStatus(siblingJobId);
        // WHY: unmounted, navigated, or a newer poll replaced us — drop result.
        if (!isMountedRef.current || jobIdRef.current !== ownerJobId || !stillOwnsPoll()) {
          stop();
          return;
        }
        if (s?.status === 'done' && s.hasFinal) {
          // WHY: stop only after getJob succeeds — a throw keeps polling (until
          // MAX_POLL_MS) instead of leaving the card stuck processing forever.
          const d = await getJob(siblingJobId);
          if (!stillOwnsPoll()) return;
          const finalOutput = d?.outputs?.find((o) => o.outputType === 'final');
          const content = finalOutput ? asPlatformContent(finalOutput.content) : undefined;
          applyTerminal('done', content);
          if (isMountedRef.current && jobIdRef.current === ownerJobId) {
            void refreshFamilyRef.current(ownerJobId);
          }
        } else if (s?.status === 'failed') {
          applyTerminal('failed');
        } else if (s?.status === 'done' && !s.hasFinal) {
          // WHY: terminal done without a final output — treat as failed so Adapt
          // is not stuck on Working with no Open target.
          applyTerminal('failed');
        } else if (stillOwnsPoll()) {
          setMultiplyJobs((p) => {
            if (p[platform]?.jobId !== siblingJobId) return p;
            return {
              ...p,
              [platform]: {
                ...p[platform],
                progress: s?.progress ?? p[platform]?.progress ?? 10,
              },
            };
          });
        }
      } catch { /* keep polling */ } finally {
        inFlight = false;
      }
    }, 2500);
    pollOwner.handle = poll;
    activeIntervals.current.set(platform, poll);
  }, [isMountedRef]);

  // WHY: startPoll's done branch refreshes family; avoid a circular useCallback
  // dependency by calling through a ref updated after refreshFamily is defined.
  const refreshFamilyRef = useRef<(id: string) => Promise<void>>(async () => undefined);

  const refreshFamily = useCallback(async (id: string): Promise<void> => {
    try {
      const related = await getRelatedJobs(id);
      if (!isMountedRef.current || jobIdRef.current !== id) return;

      // WHY: compute toPoll outside the setState updater — React may re-run
      // updaters (Strict Mode); side effects belong after the state merge plan.
      let prevSnapshot: Record<string, MultiplyEntry> = {};
      setMultiplyJobs((prev) => {
        prevSnapshot = prev;
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

      for (const v of related.variants) {
        if (v.isCurrent) continue;
        if (v.status !== 'processing' && v.status !== 'pending') continue;
        if (activeIntervals.current.has(v.platform)) continue;
        const existing = prevSnapshot[v.platform];
        // WHY: resume after navigation (existing processing, no interval) or
        // start for a newly discovered in-flight sibling.
        if (!existing || existing.status === 'processing') {
          startPoll(id, v.platform, v.jobId);
        }
      }
    } catch {
      // Non-fatal — Adapt still works via session multiplyJobs alone.
    }
  }, [isMountedRef, startPoll]);

  refreshFamilyRef.current = refreshFamily;

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
    acceptedJobIds.current.clear();
    inFlightPlatforms.current.clear();
    setMultiplyJobs({});
    if (!jobId) return;
    void refreshFamily(jobId);
  }, [jobId, refreshFamily]);

  async function handleMultiply(targetPlatform: string): Promise<void> {
    if (!jobId) return;
    const key = multiplyFlightKey(jobId, targetPlatform);
    if (inFlightPlatforms.current.has(key)) return;

    // Already have a finished sibling in the family — just open it (caller
    // ContentMultiplier handles Open); treat Adapt click as no-op create.
    const existing = multiplyJobs[targetPlatform];
    if (existing?.status === 'processing') return;
    if (existing?.status === 'done' && existing.jobId) return;
    // WHY: lock is cleared in finally, which can run before paint. If this
    // platform already has an accepted jobId, ignore the click unless Retry.
    if (acceptedJobIds.current.has(key) && existing?.status !== 'failed') return;
    if (existing?.status === 'failed') acceptedJobIds.current.delete(key);

    inFlightPlatforms.current.add(key);
    setMultiplyJobs((p) => {
      const current = p[targetPlatform];
      // WHY: functional update — a duplicate click must not blank a jobId
      // that the winning POST already wrote.
      if (current?.jobId && (current.status === 'processing' || current.status === 'done')) {
        return p;
      }
      return {
        ...p,
        [targetPlatform]: { jobId: '', status: 'processing', progress: 5 },
      };
    });
    try {
      const { jobId: newJobId, reused } = await multiplyJob(jobId, targetPlatform);
      // WHY: user may have navigated to another job while POST was in flight —
      // writing now would put job A's Adapt result into job B's state.
      if (!isMountedRef.current || jobIdRef.current !== jobId) return;
      acceptedJobIds.current.set(key, newJobId);
      if (reused) {
        acceptedJobIds.current.delete(key);
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
      startPoll(jobId, targetPlatform, newJobId);
    } catch (err: unknown) {
      if (!isMountedRef.current || jobIdRef.current !== jobId) return;
      // WHY: the winning request may already have stored a jobId. A late 409
      // from the duplicate click must not replace that row with failed.
      if (acceptedJobIds.current.has(key)) return;
      const message = getSubmitError(err, 'Adapt failed — please try again.').message;
      setMultiplyJobs((p) => {
        const current = p[targetPlatform];
        if (current?.jobId) return p;
        if (current?.status === 'done') return p;
        return {
          ...p,
          [targetPlatform]: {
            jobId: '',
            status: 'failed',
            progress: 0,
            error: message,
          },
        };
      });
    } finally {
      inFlightPlatforms.current.delete(key);
    }
  }

  return { multiplyJobs, handleMultiply };
}
