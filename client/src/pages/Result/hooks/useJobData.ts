import { useState, useEffect, useCallback, useRef } from 'react';
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
  const queryClient = useQueryClient();
  const [jobData, setJobData]           = useState<JobData>(null);
  const [loadError, setLoadError]       = useState<'not_found' | 'error' | 'lost' | null>(null);
  const [regenerating, setRegenerating] = useState(false);
  // WHY: tracks the last time mergeSSEIntoJobData actually processed an event, so the
  // REST poll below can skip firing while SSE is demonstrably alive — see poll effect.
  const lastSSEEventAt = useRef<number>(0);
  // REL-001: durable pending never 404s — age against createdAt for client timeout.
  const jobCreatedAtMs = useRef<number | null>(null);
  // WHY consecutive 404s (CORR-001): a single mid-poll 404 after restart used to
  // clear jobData permanently; require several misses with no recent SSE first.
  const consecutivePoll404s = useRef(0);
  // WHY: poll 404s must distinguish "never owned this id" (not_found) from
  // "we had a job that vanished mid-run" (lost) — QA-C2-002.
  const hadJobDataRef = useRef(false);
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
      hadJobDataRef.current = true;
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
    jobCreatedAtMs.current = null;
    hadJobDataRef.current = false;
    consecutivePoll404s.current = 0;
    void loadJob();
  }, [jobId, loadJob]);

  useEffect(() => {
    if (!jobData?.createdAt) return;
    const ms = Date.parse(jobData.createdAt);
    if (Number.isFinite(ms)) jobCreatedAtMs.current = ms;
  }, [jobData?.createdAt]);

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
        // WHY accept id OR jobId (CORR-013): server state events spread the
        // memory job (`id`) and now also set `jobId` — either should bootstrap.
        const stateId = (data as { jobId?: unknown; id?: unknown }).jobId
          ?? (data as { id?: unknown }).id;
        if (data.type === 'state' && typeof stateId === 'string') {
          const state = data as unknown as ContentJob;
          hadJobDataRef.current = true;
          return { ...state, id: stateId, outputs: state.outputs || [], logs: state.logs || [] };
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
        // WHY also map 'failed': previously only 'done' updated status, so a
        // terminal failure left status as 'processing' and the Result page
        // kept the spinner for ~10s (poll skips while SSE is fresh).
        if (data.stage === 'done') next.status = 'done';
        else if (data.stage === 'failed') next.status = 'failed';
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

      let streamToken: string | undefined;
      try {
        const result = await getStreamToken(jobId);
        streamToken = result.token;
      } catch {
        // WHY no Clerk session JWT fallback: the server no longer accepts a
        // full session token in the EventSource query string (bearer credential
        // leakage via logs/history). REST polling below remains the backstop.
        streamToken = undefined;
      }

      if (cancelled) return;
      // WHY skip open when stream-token minting failed: connectToStream with no
      // token would 401 forever; the 2s poll below still advances the UI.
      if (!streamToken) return;
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
  }, [jobId, connectToStream, disconnectStream, mergeSSEIntoJobData]);

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
    // WHY: initial getJob 404 is definitive ownership/existence failure — keep
    // polling would reclassify it as "lost" after 5 ticks (QA-C2-002).
    if (loadError === 'not_found') return;
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
        consecutivePoll404s.current = 0;
        const isTerminal = (s.status === 'done' && s.hasFinal) || s.status === 'failed';
        if (!isTerminal) {
          // REL-001: durable pending rows never 404, so the consecutive-404
          // "lost" path never fires. If the job is older than the server's
          // stale sweep (~15 min) and SSE has been silent, surface lost here.
          const STALE_CLIENT_MS = 20 * 60 * 1000;
          const sseFresh = Date.now() - lastSSEEventAt.current < 15000;
          const createdMs = jobCreatedAtMs.current;
          const ageMs = createdMs != null ? Date.now() - createdMs : 0;
          if (ageMs > STALE_CLIENT_MS && !sseFresh) {
            // WHY not also force status:'failed': Result.tsx already shows the
            // "Generation lost" ErrorState from loadError — flipping status
            // stacked a second "Generation failed" + fake Regen (QA-C2-001).
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
          // WHY not treat bare status:'failed' as keep-prev: after a failed
          // regenerate the client cleared outputs on POST success; keeping that
          // empty failed snapshot blocked the poll from applying DB finals the
          // server rehydrated onto the failed memory row.
          const prevHasFinal = Array.isArray(prev?.outputs)
            && prev.outputs.some((o) => o.outputType === 'final');
          const nextHasFinal = Array.isArray(d.outputs)
            && d.outputs.some((o) => o.outputType === 'final');
          if (prev?.status === 'done' && prevHasFinal && !nextHasFinal) return prev;
          if (prev?.status === 'failed' && prevHasFinal && !nextHasFinal) return prev;
          return d;
        });
        setRegenerating(false);
        clearInterval(iv);
        // WHY: Library's job list (React Query) has no other trigger to refetch once this
        // job reaches a terminal state, so it stayed stale until its 30s staleTime expired.
        // WHY also invalidate calendar/dashboard: completion used to refresh
        // Library only, so a just-finished post stayed missing from Calendar
        // drag targets for up to five minutes.
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
            // WHY: "lost" is only for a job we already held that vanished mid-run.
            // Never-loaded / never-owned IDs stay not_found (QA-C2-002).
            setLoadError((prev) => {
              if (prev === 'not_found') return 'not_found';
              return hadJobDataRef.current ? 'lost' : 'not_found';
            });
            clearInterval(iv);
          }
        }
        /* poll is best-effort — next tick retries */
      }
    }, 2000);
    return () => clearInterval(iv);
  }, [jobId, queryClient, loadError]);

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
    // WHY keep previous outputs until POST succeeds: clearing first left the
    // page on "Generating…" with no error when regenerate failed (rate limit /
    // network), and the old post only returned when the poll was allowed to run.
    const previous = jobData;
    try {
      await regenerateJob(jobId, feedback);
      setJobData((p): JobData => (p ? { ...p, status: 'pending', outputs: [] } : p));

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
          streamToken = undefined;
        }
        if (!isMountedRef.current || !streamToken) return;
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
      if (previous) setJobData(previous);
      setRegenerating(false);
    }
  }

  return { jobData, setJobData, loadError, regenerating, setRegenerating, handleRegenerate, loadJob };
}
