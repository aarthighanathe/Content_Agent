import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { useQueryClient } from '@tanstack/react-query';
import { useAppStore } from '../../../store';
import { getJob, getJobStatus, regenerateJob, getStreamToken } from '../../../api';
import { useIsMountedRef } from '../../../hooks/useTrackedTimeout';
import type { ContentJob, SSEEvent } from '../../../types/job';

// WHY partial ContentJob: the SSE-bootstrapped shape (before the first REST getJob() lands)
// only has the fields the 'progress'/'state' events actually carry — agentLogs/outputs may
// be empty arrays rather than the full ContentJob. Consumers already null-check optional
// fields per CLAUDE.md null-safety rules, so a Partial is truer than asserting full ContentJob.
type JobData = ContentJob | null;

export function useJobData(jobId: string | undefined) {
  // WHY only socket actions from Zustand — progress UI reads jobData exclusively (M1).
  // Subscribing to currentJob here re-rendered Result on every SSE tick twice (store + jobData).
  const connectToStream    = useAppStore((s) => s.connectToStream);
  const disconnectStream   = useAppStore((s) => s.disconnectStream);
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  const [jobData, setJobData]           = useState<JobData>(null);
  const [loadError, setLoadError]       = useState<'not_found' | 'error' | null>(null);
  const [regenerating, setRegenerating] = useState(false);
  // WHY: tracks the last time mergeSSEIntoJobData actually processed an event, so the
  // REST poll below can skip firing while SSE is demonstrably alive — see poll effect.
  const lastSSEEventAt = useRef<number>(0);
  const isMountedRef = useIsMountedRef();
  // WHY a second, hook-scoped debounce flag (not shared with the mount effect's
  // local `reconnecting`): handleRegenerate's post-regenerate connectToStream
  // call lives outside any single effect's closure — it can be invoked many
  // times over the hook's lifetime (desktop toolbar, mobile footer,
  // FeedbackPanel's Apply, ErrorState's Try again), so its own onError
  // reconnect needs its own debounce state, not the mount effect's.
  const regenerateReconnecting = useRef(false);
  // WHY: avoid re-fetching full job on every jobData identity change while status
  // stays done (terminal refresh should fire once per transition to terminal).
  const terminalRefreshDone = useRef(false);

  const loadJob = useCallback(async () => {
    if (!jobId) return;
    try {
      const d = await getJob(jobId);
      setLoadError(null);
      setJobData(d);
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      setLoadError(status === 404 ? 'not_found' : 'error');
      setJobData(null);
    }
  }, [jobId]);

  useEffect(() => {
    if (!jobId) return;
    setJobData(null);
    setLoadError(null);
    setRegenerating(false);
    terminalRefreshDone.current = false;
    void loadJob();
  }, [jobId, loadJob]);

  const mergeSSEIntoJobData = useCallback((data: SSEEvent) => {
    if (!jobId) return;
    lastSSEEventAt.current = Date.now();
    setJobData((prev): JobData => {
      if (!prev) {
        // WHY a minimal shape guard before the cast: this bootstraps the entire
        // ContentJob shape off a same-origin SSE payload with only `type ===
        // 'state'` checked previously — defense-in-depth so a malformed/partial
        // 'state' event (e.g. missing jobId) doesn't silently become `jobData`
        // with undefined required fields.
        if (data.type === 'state' && typeof (data as { jobId?: unknown }).jobId === 'string') {
          const state = data as unknown as ContentJob;
          return { ...state, outputs: state.outputs || [], logs: state.logs || [] };
        }
        // WHY still use data.outputs/data.logs here (not always []): a 'state'
        // event with a missing/malformed jobId fails the guard above, but the
        // event can still carry valid outputs/logs — discarding them unconditionally
        // threw away real data the server already sent and left the UI on an
        // empty skeleton it never needed to show.
        return {
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
          agentLogs: data.agent ? [{ agentName: data.agent, action: data.message || data.stage || '', durationMs: data.durationMs }] : [],
        };
      }

      const next = { ...prev };
      if (data.stage) {
        next.status = data.stage === 'done' ? 'done' : next.status;
        next.stage = data.stage;
      }
      if (typeof data.progress === 'number') next.progress = data.progress;
      if (data.message) next.message = data.message;
      if (data.agent) {
        next.agentLogs = [
          ...(next.agentLogs || []),
          { agentName: data.agent, action: data.message || data.stage || '', durationMs: data.durationMs },
        ];
      }
      if (data.type === 'state') {
        if (data.outputs) next.outputs = data.outputs;
        if (data.logs) next.logs = data.logs;
      }
      return next;
    });
  }, [jobId]);

  useEffect(() => {
    if (!jobId) return;
    let cancelled = false;
    let reconnectTimer: ReturnType<typeof setTimeout> | undefined;
    // WHY tracked outside connect(): onError can fire repeatedly (the browser's
    // native EventSource keeps retrying on its own between our reconnects too) —
    // this debounces so a burst of error events triggers at most one fresh-token
    // reconnect per window instead of a storm of overlapping ones.
    let reconnecting = false;

    const connect = async () => {
      // WHY check job status before opening SSE: a job that's already terminal
      // (done/failed) has nothing left to stream — requireJobOwnership() on the
      // server evicts terminal jobs from its in-memory store after a 10-min TTL
      // (see CLAUDE.md §9), so calling stream-token for an old finished job can
      // 404 there even though the job itself still loads fine via REST. Skipping
      // the connect entirely for already-terminal jobs avoids that noisy, expected
      // 404 without masking a real ownership failure on in-progress jobs.
      const d = await getJob(jobId).catch(() => null);
      if (cancelled) return;
      if (d) setJobData(d);
      if (d && (d.status === 'done' || d.status === 'failed')) return;

      const rawToken = await getToken();
      let streamToken: string | undefined;

      try {
        const result = await getStreamToken(jobId);
        streamToken = result.token;
      } catch {
        streamToken = rawToken ?? undefined;
      }

      if (cancelled) return;
      // WHY onError re-runs connect() with a fresh token: EventSource's native
      // auto-reconnect keeps retrying the *same* (eventually stale) token forever
      // once the short-lived stream-token expires, silently 401ing on every retry
      // with no recovery. Re-fetching a token and reopening explicitly here means
      // SSE actually recovers on its own instead of leaning entirely on the
      // separate REST-polling backstop below (FUNCTIONAL_AUDIT_2026-07.md #27).
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
  }, [jobId, connectToStream, disconnectStream, getToken, mergeSSEIntoJobData]);

  // WHY jobData (not Zustand currentJob): sole progress source after M1 — when SSE
  // marks the job done, refresh full outputs from REST once.
  useEffect(() => {
    if (!jobId) return;
    const stage = jobData?.stage;
    const status = jobData?.status;
    if (stage !== 'done' && status !== 'done' && status !== 'failed') {
      terminalRefreshDone.current = false;
      return;
    }
    if (terminalRefreshDone.current) return;
    terminalRefreshDone.current = true;
    const t = setTimeout(() => {
      loadJob();
      setRegenerating(false);
    }, 0);
    return () => clearTimeout(t);
  }, [jobId, jobData?.stage, jobData?.status, loadJob]);

  useEffect(() => {
    if (!jobId) return;
    const iv = setInterval(async () => {
      // WHY: EventSource.readyState === OPEN only means the socket is connected —
      // it does NOT mean the server is actually delivering terminal events (a
      // stream-token race or a dropped stream can leave it OPEN but silent
      // forever). REST remains the source of truth as a fallback. But polling
      // unconditionally in parallel with a healthy SSE stream doubled up on
      // "don't clobber terminal state" logic (this effect had its own guard,
      // subtly different from the one in mergeSSEIntoJobData) and burned a
      // REST call every 2s for the whole job lifetime even when SSE was fine.
      // Keep the interval ticking every 2s (so a stalled SSE stream is picked
      // up quickly) but only actually hit the REST endpoint once SSE hasn't
      // reported anything recently.
      if (Date.now() - lastSSEEventAt.current < 10000) return;
      try {
        // WHY slim status first (O2): full getJob re-downloads every output's
        // content jsonb — only fetch that once the job is actually terminal.
        const s = await getJobStatus(jobId);
        const isTerminal = (s.status === 'done' && s.hasFinal) || s.status === 'failed';
        if (!isTerminal) {
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
        setJobData((prev): JobData => {
          const prevTerminal = prev?.status === 'failed' || (
            prev?.status === 'done'
            && Array.isArray(prev?.outputs)
            && prev.outputs.some((o) => o.outputType === 'final')
          );
          return prevTerminal ? prev : d;
        });
        setRegenerating(false);
        clearInterval(iv);
        // WHY: Library's job list (React Query) has no other trigger to refetch once this
        // job reaches a terminal state, so it stayed stale until its 30s staleTime expired.
        queryClient.invalidateQueries({ queryKey: ['library', 'jobs'] }).catch(() => {});
      } catch { /* poll is best-effort — next tick retries */ }
    }, 2000);
    return () => clearInterval(iv);
  }, [jobId, queryClient]);

  async function handleRegenerate(feedback?: string) {
    // WHY guarded here, not just by disabling individual buttons: this is called
    // from several surfaces (desktop toolbar, mobile footer, FeedbackPanel's
    // Apply, ErrorState's Try again) — the desktop toolbar unmounts itself once
    // `regenerating` flips true, but the mobile footer previously had no matching
    // guard, so a fast double-tap there could fire two concurrent regenerate
    // pipelines against the same job (FUNCTIONAL_AUDIT_2026-07.md finding #13).
    // Guarding in the one shared function fixes every call site at once.
    if (!jobId || regenerating) return;
    setRegenerating(true);
    terminalRefreshDone.current = false;
    setJobData((p): JobData => (p ? { ...p, status: 'pending', outputs: [] } : p));
    try {
      await regenerateJob(jobId, feedback);

      // WHY a local named function, not inlining connectToStream's onError:
      // openStream needs to call itself again on a fresh-token reconnect,
      // same as the mount effect's connect() below — without this, a post-
      // regenerate SSE error had no onError at all, so the browser's native
      // EventSource retry kept reusing the eventually-expired token forever
      // instead of recovering, falling back entirely on the 10-25s-delayed
      // REST poll (see the poll effect above) rather than reconnecting.
      const openStream = async () => {
        let streamToken: string | undefined;
        try {
          const result = await getStreamToken(jobId);
          streamToken = result.token;
        } catch {
          streamToken = await getToken() ?? undefined;
        }
        if (!isMountedRef.current) return;
        connectToStream(jobId, streamToken, mergeSSEIntoJobData, () => {
          if (!isMountedRef.current || regenerateReconnecting.current) return;
          regenerateReconnecting.current = true;
          setTimeout(() => {
            regenerateReconnecting.current = false;
            if (isMountedRef.current) openStream();
          }, 15000);
        });
      };
      // connect AFTER POST so server state is 'pending' when SSE opens; pass
      // mergeSSEIntoJobData same as the initial connect effect above — without it,
      // SSE events after a Regenerate were received but never merged into jobData.
      await openStream();
    } catch (_e) {
      // NOTE: Regenerate errors are handled by ErrorState component; no need for console.error
      setRegenerating(false);
    }
  }

  return { jobData, setJobData, loadError, regenerating, setRegenerating, handleRegenerate, loadJob };
}
