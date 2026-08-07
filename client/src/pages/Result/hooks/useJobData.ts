import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { useQueryClient } from '@tanstack/react-query';
import { useAppStore } from '../../../store';
import { getJob, regenerateJob, getStreamToken } from '../../../api';
import type { ContentJob, SSEEvent } from '../../../types/job';

// WHY partial ContentJob: the SSE-bootstrapped shape (before the first REST getJob() lands)
// only has the fields the 'progress'/'state' events actually carry — agentLogs/outputs may
// be empty arrays rather than the full ContentJob. Consumers already null-check optional
// fields per CLAUDE.md null-safety rules, so a Partial is truer than asserting full ContentJob.
type JobData = ContentJob | null;

export function useJobData(jobId: string | undefined) {
  // WHY slice selectors, not the whole-store no-selector form: subscribing with
  // no selector makes this hook (and the whole Result tree via Result.tsx) re-render
  // on every store mutation — theme switches, Ideate saves, userProfile updates —
  // not just on currentJob/SSE progress. Selecting the exact slices keeps Result
  // renders tied to the job stream (perf audit).
  const currentJob         = useAppStore((s) => s.currentJob);
  const connectToStream    = useAppStore((s) => s.connectToStream);
  const disconnectStream   = useAppStore((s) => s.disconnectStream);
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  const [jobData, setJobData]           = useState<JobData>(null);
  const [regenerating, setRegenerating] = useState(false);
  // WHY: tracks the last time mergeSSEIntoJobData actually processed an event, so the
  // REST poll below can skip firing while SSE is demonstrably alive — see poll effect.
  const lastSSEEventAt = useRef<number>(0);

  const loadJob = useCallback(async () => {
    if (!jobId) return;
    try { const d = await getJob(jobId); setJobData(d); } catch (_e) {
      // NOTE: Job fetch errors are handled by ErrorState component; no need for console.error
    }
  }, [jobId]);

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
          outputs: [],
          logs: [],
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

  useEffect(() => {
    if (currentJob?.stage === 'done' || currentJob?.status === 'done') {
      const t = setTimeout(() => {
        loadJob();
        setRegenerating(false);
      }, 0);
      return () => clearTimeout(t);
    }
  }, [currentJob?.stage, currentJob?.status, loadJob]);

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
        const d = await getJob(jobId);
        // WHY hasFinal: a job can briefly report status:'done' before its
        // 'final' output is attached (pipeline stages between critic approval
        // and DB persist). Treating that snapshot as terminal freezes the UI
        // on empty content — only stop polling once real output has arrived.
        const hasFinal = Array.isArray(d.outputs) && d.outputs.some((o) => o.outputType === 'final');
        const isTerminal = (d.status === 'done' && hasFinal) || d.status === 'failed';
        setJobData((prev): JobData => {
          const prevTerminal = prev?.status === 'failed' || (prev?.status === 'done' && Array.isArray(prev?.outputs) && prev.outputs.some((o) => o.outputType === 'final'));
          return prevTerminal ? prev : d;
        });
        if (isTerminal) {
          setRegenerating(false);
          clearInterval(iv);
          // WHY: Library's job list (React Query) has no other trigger to refetch once this
          // job reaches a terminal state, so it stayed stale until its 30s staleTime expired.
          queryClient.invalidateQueries({ queryKey: ['library', 'jobs'] }).catch(() => {});
        }
      } catch {}
    }, 2000);
    return () => clearInterval(iv);
  }, [jobId, queryClient]);

  async function handleRegenerate(feedback?: string) {
    // WHY guarded here, not just by disabling individual buttons: this is called
    // from several surfaces (desktop toolbar, mobile sticky footer, FeedbackPanel's
    // Apply, ErrorState's Try again) — the desktop toolbar unmounts itself once
    // `regenerating` flips true, but the mobile footer previously had no matching
    // guard, so a fast double-tap there could fire two concurrent regenerate
    // pipelines against the same job (FUNCTIONAL_AUDIT_2026-07.md finding #13).
    // Guarding in the one shared function fixes every call site at once.
    if (!jobId || regenerating) return;
    setRegenerating(true);
    setJobData((p): JobData => (p ? { ...p, status: 'pending', outputs: [] } : p));
    try {
      await regenerateJob(jobId, feedback);
      let streamToken: string | undefined;
      try {
        const result = await getStreamToken(jobId);
        streamToken = result.token;
      } catch {
        streamToken = await getToken() ?? undefined;
      }
      // connect AFTER POST so server state is 'pending' when SSE opens; pass
      // mergeSSEIntoJobData same as the initial connect effect above — without it,
      // SSE events after a Regenerate were received but never merged into jobData.
      connectToStream(jobId, streamToken, mergeSSEIntoJobData);
    } catch (_e) {
      // NOTE: Regenerate errors are handled by ErrorState component; no need for console.error
      setRegenerating(false);
    }
  }

  return { jobData, setJobData, regenerating, setRegenerating, handleRegenerate, currentJob, loadJob };
}
