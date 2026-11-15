import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { useQueryClient } from '@tanstack/react-query';
import { useAppStore } from '../../../store';
import { getJob, regenerateJob, getStreamToken } from '../../../api';
import { useIsMountedRef } from '../../../hooks/useTrackedTimeout';
import { getSubmitError } from '../../../lib/errorMessages';
import type { ContentJob, SSEEvent } from '../../../types/job';
import { mergeSSEEventIntoJob } from './mergeSSEIntoJobData';
import { useJobStatusPoll } from './useJobStatusPoll';

// WHY: partial ContentJob: the SSE-bootstrapped shape (before the first REST getJob() lands)
// only has the fields the 'progress'/'state' events actually carry — agentLogs/outputs may
// be empty arrays rather than the full ContentJob. Consumers already null-check optional
// fields per CLAUDE.md null-safety rules, so a Partial is truer than asserting full ContentJob.
type JobData = ContentJob | null;

export function useJobData(jobId: string | undefined) {
  // WHY: only socket actions from Zustand — progress UI reads jobData exclusively (M1).
  // Subscribing to currentJob here re-rendered Result on every SSE tick twice (store + jobData).
  const connectToStream    = useAppStore((s) => s.connectToStream);
  const disconnectStream   = useAppStore((s) => s.disconnectStream);
  const { userId } = useAuth();
  // WHY: live id for regenerate after await — ignore success/error UI if switched.
  const userIdRef = useRef(userId ?? null);
  userIdRef.current = userId ?? null;
  const queryClient = useQueryClient();
  const [jobData, setJobData]           = useState<JobData>(null);
  const [loadError, setLoadError]       = useState<'not_found' | 'error' | 'lost' | null>(null);
  // WHY: regenerate catch used to restore previous job silently — 409
  // JOB_IN_PROGRESS looked like a no-op. Surface via Result toast.
  const [actionError, setActionError]   = useState<string | null>(null);
  const [regenerating, setRegenerating] = useState(false);
  // WHY: regenerating state is async — double-tap can pass `if (regenerating)`
  // before the first setState lands. Flip this ref synchronously (Create's
  // submittingRef pattern) so only one regenerate pipeline starts.
  const regeneratingRef = useRef(false);
  // WHY: tracks the last time mergeSSEIntoJobData actually processed an event, so the
  // REST poll below can skip firing while SSE is demonstrably alive — see poll effect.
  const lastSSEEventAt = useRef<number>(0);
  // REL-001: durable pending never 404s — age against createdAt for client timeout.
  const jobCreatedAtMs = useRef<number | null>(null);
  // WHY: consecutive 404s (CORR-001): a single mid-poll 404 after restart used to
  // clear jobData permanently; require several misses with no recent SSE first.
  const consecutivePoll404s = useRef(0);
  // WHY: poll 404s must distinguish "never owned this id" (not_found) from
  // "we had a job that vanished mid-run" (lost) — QA-C2-002.
  const hadJobDataRef = useRef(false);
  const isMountedRef = useIsMountedRef();
  const loadGen = useRef(0);
  // WHY: getJobStatus/getJob can outlast the 2s tick — overlapping polls apply
  // status out of order (BatchResult inFlight pattern).
  const pollInFlightRef = useRef(false);
  // WHY: mount loadJob + SSE connect both called getJob — share the first
  // in-flight promise so reconnect still fetches fresh (see SSE effect).
  const bootstrapJobRef = useRef<Promise<ContentJob | null> | null>(null);
  // WHY: a second, hook-scoped debounce flag (not shared with the mount effect's
  // local `reconnecting`): handleRegenerate's post-regenerate connectToStream
  // call lives outside any single effect's closure — it can be invoked many
  // times over the hook's lifetime (desktop toolbar, mobile footer,
  // FeedbackPanel's Apply, ErrorState's Try again), so its own onError
  // reconnect needs its own debounce state, not the mount effect's.
  const regenerateReconnecting = useRef(false);
  // WHY: tracked: post-regenerate SSE onError used an untracked setTimeout —
  // navigate away mid-reconnect could call openStream after unmount.
  const regenerateReconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // WHY: avoid re-fetching full job on every jobData identity change while status
  // stays done (terminal refresh should fire once per transition to terminal).
  const terminalRefreshDone = useRef(false);

  const clearRegenerating = useCallback((): void => {
    regeneratingRef.current = false;
    setRegenerating(false);
  }, []);

  // WHY: ref mirror of jobId so async regenerate continuations can detect navigation.
  const jobIdRef = useRef(jobId);

  useEffect(() => {
    jobIdRef.current = jobId;
    // WHY: stale SSE timestamp from job A would suppress job B's REST poll silence gate.
    lastSSEEventAt.current = 0;
    // WHY: runs per jobId (cleanup on change too) — a pending reconnect for the old job
    // must not fire after navigation.
    return () => {
      if (regenerateReconnectTimer.current) {
        clearTimeout(regenerateReconnectTimer.current);
        regenerateReconnectTimer.current = null;
      }
      regenerateReconnecting.current = false;
    };
  }, [jobId]);

  const loadJob = useCallback(async () => {
    if (!jobId) return;
    // WHY: generation counter: a slow getJob for a previous jobId (or after
    // unmount) must not overwrite state for the current job (C6). Newer calls
    // and jobId changes bump the counter, invalidating older in-flight ones.
    const myGen = ++loadGen.current;
    const isStale = (): boolean => myGen !== loadGen.current || !isMountedRef.current;
    // WHY: expose the soft-null sibling to SSE mount connect so first paint
    // shares one getJob; reconnects fetch fresh (see SSE effect).
    const raw = getJob(jobId);
    bootstrapJobRef.current = raw.then((d): ContentJob | null => d).catch((): ContentJob | null => null);
    try {
      const d = await raw;
      if (isStale()) return;
      hadJobDataRef.current = true;
      setLoadError(null);
      setJobData(d);
    } catch (err: unknown) {
      if (isStale()) return;
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 404) {
        setLoadError('not_found');
        setJobData(null);
        return;
      }
      // WHY: keep jobData on transient errors (C5): a network blip during a
      // terminal refresh used to blank an already-completed job. Only surface
      // the soft error when there is nothing to show.
      if (!hadJobDataRef.current) {
        setLoadError('error');
        setJobData(null);
      }
    }
  }, [jobId, isMountedRef]);

  useEffect(() => {
    if (!jobId) return;
    loadGen.current += 1;
    bootstrapJobRef.current = null;
    setJobData(null);
    setLoadError(null);
    // WHY: regenerate toast from job A must not linger on job B.
    setActionError(null);
    regeneratingRef.current = false;
    setRegenerating(false);
    terminalRefreshDone.current = false;
    jobCreatedAtMs.current = null;
    hadJobDataRef.current = false;
    consecutivePoll404s.current = 0;
    pollInFlightRef.current = false;
    void loadJob();
    // WHY: also on userId — account switch must drop the previous user's jobData
    // and re-fetch under the new JWT (ownership 404 → not_found, not stale body).
  }, [jobId, userId, loadJob]);

  useEffect(() => {
    if (!jobData?.createdAt) return;
    const ms = Date.parse(jobData.createdAt);
    if (Number.isFinite(ms)) jobCreatedAtMs.current = ms;
  }, [jobData?.createdAt]);

  const mergeSSEIntoJobData = useCallback((data: SSEEvent) => {
    if (!jobId) return;
    lastSSEEventAt.current = Date.now();
    setJobData((prev): JobData => {
      const { next, bootstrapped } = mergeSSEEventIntoJob(prev, data, jobId);
      if (bootstrapped) hadJobDataRef.current = true;
      return next;
    });
  }, [jobId]);

  useEffect(() => {
    if (!jobId) return;
    let cancelled = false;
    let reconnectTimer: ReturnType<typeof setTimeout> | undefined;
    // WHY: tracked outside connect(): onError can fire repeatedly (the browser's
    // native EventSource keeps retrying on its own between our reconnects too) —
    // this debounces so a burst of error events triggers at most one fresh-token
    // reconnect per window instead of a storm of overlapping ones.
    let reconnecting = false;
    // WHY: first connect shares loadJob's in-flight getJob; onError reconnect
    // must fetch fresh so a job that went terminal while disconnected skips SSE.
    let reuseBootstrap = true;

    const connect = async () => {
      // WHY: check job status before opening SSE: a job that's already terminal
      // (done/failed) has nothing left to stream — requireJobOwnership() on the
      // server evicts terminal jobs from its in-memory store after a 10-min TTL
      // (see CLAUDE.md §9), so calling stream-token for an old finished job can
      // 404 there even though the job itself still loads fine via REST. Skipping
      // the connect entirely for already-terminal jobs avoids that noisy, expected
      // 404 without masking a real ownership failure on in-progress jobs.
      let d: ContentJob | null;
      if (reuseBootstrap && bootstrapJobRef.current) {
        d = await bootstrapJobRef.current;
      } else {
        d = await getJob(jobId).catch((): ContentJob | null => null);
      }
      reuseBootstrap = false;
      if (cancelled) return;
      if (d) setJobData(d);
      if (d && (d.status === 'done' || d.status === 'failed')) return;

      let streamToken: string | undefined;
      try {
        const result = await getStreamToken(jobId);
        streamToken = result.token;
      } catch {
        // WHY: no Clerk session JWT fallback: the server no longer accepts a
        // full session token in the EventSource query string (bearer credential
        // leakage via logs/history). REST polling below remains the backstop.
        streamToken = undefined;
      }

      if (cancelled) return;
      // WHY: skip open when stream-token minting failed: connectToStream with no
      // token would 401 forever; the 2s poll below still advances the UI.
      if (!streamToken) return;
      // WHY: onError re-runs connect() with a fresh token: the store closes the ES first
      // (stopping native retry on the expired URL), then this mints a token and reopens
      // so SSE recovers instead of leaning only on REST polling.
      connectToStream(jobId, streamToken, mergeSSEIntoJobData, () => {
        if (cancelled || reconnecting) return;
        reconnecting = true;
        reconnectTimer = setTimeout(() => {
          reconnecting = false;
          if (!cancelled) connect();
        }, 15000);
      });
    };

    connect();
    return () => {
      cancelled = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      disconnectStream();
    };
    // WHY: userId — drop the previous account's EventSource and re-mint under the new JWT.
  }, [jobId, userId, connectToStream, disconnectStream, mergeSSEIntoJobData]);

  // WHY: jobData (not Zustand currentJob): sole progress source after M1 — when SSE
  // marks the job done, refresh full outputs from REST once.
  useEffect(() => {
    if (!jobId) return;
    const stage = jobData?.stage;
    const status = jobData?.status;
    if (stage !== 'done' && status !== 'done' && status !== 'failed') {
      terminalRefreshDone.current = false;
      return;
    }
    // WHY: belt-and-suspenders with handleRegenerate's stage reset — while a regenerate
    // is in flight, a leftover stage:'done' alone must not count as terminal; only a real
    // status transition (SSE/poll) may end it.
    if (regeneratingRef.current && status !== 'done' && status !== 'failed') return;
    if (terminalRefreshDone.current) return;
    terminalRefreshDone.current = true;
    // WHY: opened an already-finished job (no SSE this session, final output loaded):
    // the initial fetch is current, so skip the redundant refetch + list invalidation.
    const alreadyComplete = lastSSEEventAt.current === 0
      && !regeneratingRef.current
      && (status === 'failed'
        || (Array.isArray(jobData?.outputs)
          && jobData.outputs.some((o) => o.outputType === 'final')));
    if (alreadyComplete) return;
    const t = setTimeout(() => {
      loadJob();
      clearRegenerating();
      // WHY: SSE-completed jobs never pass through the poll path's invalidation,
      // so Library/Dashboard/Calendar stayed stale until staleTime expired (C1).
      Promise.allSettled([
        queryClient.invalidateQueries({ queryKey: ['library', 'jobs'] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard', 'jobs'] }),
        queryClient.invalidateQueries({ queryKey: ['calendar', 'jobs'] }),
      ]).catch(() => {});
    }, 0);
    return () => clearTimeout(t);
  }, [jobId, jobData, loadJob, queryClient, clearRegenerating]);

  const terminalWithFinal = jobData?.status === 'failed' || (
    jobData?.status === 'done'
    && Array.isArray(jobData.outputs)
    && jobData.outputs.some((o) => o.outputType === 'final')
  );

  useJobStatusPoll({
    jobId,
    terminalWithFinal,
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
  });

  async function handleRegenerate(feedback?: string): Promise<void> {
    // WHY: regeneratingRef flipped sync before await — React state alone cannot
    // stop a double-tap from two surfaces (toolbar / footer / FeedbackPanel).
    if (!jobId || regeneratingRef.current) return;
    regeneratingRef.current = true;
    const startedFor = jobId;
    // WHY: capture at start — success/error UI must not paint after account switch.
    const requestUserId = userIdRef.current;
    setRegenerating(true);
    setActionError(null);
    terminalRefreshDone.current = false;
    // WHY: clear silence gate — leftover lastSSEEventAt from the prior run kept
    // REST poll skipped for up to ~10s if post-regenerate SSE was slow.
    lastSSEEventAt.current = 0;
    // WHY: keep previous outputs until POST succeeds: clearing first left the
    // page on "Generating…" with no error when regenerate failed (rate limit /
    // network), and the old post only returned when the poll was allowed to run.
    const previous = jobData;
    try {
      await regenerateJob(jobId, feedback);
      if (jobIdRef.current !== startedFor) return;
      if (userIdRef.current !== requestUserId) {
        clearRegenerating();
        return;
      }
      // WHY: reset stage/progress/message too — a leftover stage:'done' made the
      // terminal-refresh effect fire immediately and clear `regenerating` early.
      setJobData((p): JobData => (
        p
          ? { ...p, status: 'pending', stage: 'pending', progress: 0, message: '', outputs: [] }
          : p
      ));

      // WHY: a local named function, not inlining connectToStream's onError:
      // openStream needs to call itself again on a fresh-token reconnect,
      // same as the mount effect's connect() below — without this, a post-
      // regenerate SSE error had no onError at all, so the browser's native
      // EventSource retry kept reusing the eventually-expired token forever
      // instead of recovering, falling back entirely on the 10-25s-delayed
      // REST poll (see the poll effect above) rather than reconnecting.
      const openStream = async (): Promise<void> => {
        let streamToken: string | undefined;
        try {
          const result = await getStreamToken(jobId);
          streamToken = result.token;
        } catch {
          streamToken = undefined;
        }
        // WHY: navigation / account switch during the token await must not let
        // this job's late stream replace the new session's connection.
        if (
          !isMountedRef.current
          || !streamToken
          || jobIdRef.current !== startedFor
          || userIdRef.current !== requestUserId
        ) return;
        connectToStream(jobId, streamToken, mergeSSEIntoJobData, () => {
          if (
            !isMountedRef.current
            || jobIdRef.current !== startedFor
            || userIdRef.current !== requestUserId
            || regenerateReconnecting.current
          ) return;
          regenerateReconnecting.current = true;
          if (regenerateReconnectTimer.current) {
            clearTimeout(regenerateReconnectTimer.current);
          }
          regenerateReconnectTimer.current = setTimeout(() => {
            regenerateReconnectTimer.current = null;
            regenerateReconnecting.current = false;
            if (
              isMountedRef.current
              && jobIdRef.current === startedFor
              && userIdRef.current === requestUserId
            ) {
              void openStream();
            }
          }, 15000);
        });
      };
      // connect AFTER POST so server state is 'pending' when SSE opens; pass
      // mergeSSEIntoJobData same as the initial connect effect above — without it,
      // SSE events after a Regenerate were received but never merged into jobData.
      await openStream();
    } catch (err) {
      if (jobIdRef.current !== startedFor) return;
      if (userIdRef.current !== requestUserId) {
        clearRegenerating();
        return;
      }
      if (previous) setJobData(previous);
      clearRegenerating();
      setActionError(
        getSubmitError(err, 'Regenerate failed — please try again.').message,
      );
    }
  }

  return {
    jobData,
    setJobData,
    loadError,
    actionError,
    regenerating,
    setRegenerating,
    handleRegenerate,
    loadJob,
  };
}
