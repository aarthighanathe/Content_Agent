import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@clerk/clerk-react';
import { Sparkles, Timer, CalendarDays, AlertTriangle } from 'lucide-react';
import { getJobStatus } from '../api';
import { platformMeta } from '../lib/platformMeta';
import { readBatchResult, type BatchJobRef } from '../lib/batchResultStorage';

interface BatchItem extends BatchJobRef {
  status: 'pending' | 'processing' | 'done' | 'failed';
  progress: number;
  score?: number;
}

interface BatchNavState {
  jobs?: BatchJobRef[];
  creationFailedCount?: number;
  submitterUserId?: string | null;
}

const BATCH_MAX_POLL_MS = 20 * 60 * 1000;

function pendingItems(jobs: BatchJobRef[]): BatchItem[] {
  return jobs.map((j) => ({ ...j, status: 'pending', progress: 0 }));
}

function httpStatusOf(err: unknown): number | undefined {
  if (typeof err !== 'object' || err === null || !('response' in err)) return undefined;
  const response = (err as { response?: { status?: unknown } }).response;
  return typeof response?.status === 'number' ? response.status : undefined;
}

// WHY: router state + user-scoped sessionStorage (L12): Create/Repurpose
// navigate with location.state. Hard refresh used to wipe that and show
// "No batch found". The stored list is per Clerk user so a shared browser
// doesn't restore someone else's batch.
export default function BatchResultPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isLoaded, userId } = useAuth();
  const navState = location.state as BatchNavState | null;
  const scopeKey = userId ?? '';
  const navSubmitter = navState?.submitterUserId ?? null;
  const navJobs = navState?.jobs;
  const hasNavJobs = (navJobs?.length ?? 0) > 0;
  // WHY: bind nav jobs to the first Clerk user that sees them — location.state
  // survives account switch, so a later userId must not keep the same list.
  const [navOwnerId, setNavOwnerId] = useState<string | null>(null);

  // WHY: a distinct name from the `failedCount` computed below: that one means
  // "jobs that were created but whose generation pipeline later failed" —
  // this is a different concept (items the server rejected before a job was
  // ever created, e.g. an empty-after-trim topic or a queueing error) and
  // previously vanished from the response with zero signal to the user.
  const [creationFailedCount, setCreationFailedCount] = useState(0);
  const [items, setItems] = useState<BatchItem[]>([]);
  const [restoredScope, setRestoredScope] = useState<string | null>(null);

  // WHY: copy during render (before paint) so a refresh doesn't flash empty.
  if (isLoaded && restoredScope !== scopeKey) {
    if (
      hasNavJobs
      && userId
      && (navSubmitter == null || navSubmitter === userId)
      && (navOwnerId == null || navOwnerId === userId)
    ) {
      if (navOwnerId == null) setNavOwnerId(navSubmitter ?? userId);
      setRestoredScope(scopeKey);
      setItems(pendingItems(navJobs ?? []));
      setCreationFailedCount(navState?.creationFailedCount ?? 0);
    } else {
      const persisted = readBatchResult(userId);
      if (navOwnerId != null && navOwnerId !== userId) setNavOwnerId(null);
      setRestoredScope(scopeKey);
      setItems(pendingItems(persisted?.jobs ?? []));
      setCreationFailedCount(persisted?.creationFailedCount ?? 0);
    }
  }
  const storageReady = isLoaded && restoredScope === scopeKey;

  // WHY: drop stale router state when the signed-in user is not the submitter.
  useEffect(() => {
    if (!isLoaded || !hasNavJobs) return;
    const ownerMismatch = (navSubmitter != null && userId != null && navSubmitter !== userId)
      || (navOwnerId != null && userId != null && navOwnerId !== userId);
    if (ownerMismatch) {
      navigate('.', { replace: true, state: null });
    }
  }, [isLoaded, userId, navSubmitter, navOwnerId, hasNavJobs, navigate]);

  // WHY: a ref, not `items` in the dependency array: the interval callback needs
  // the latest items to poll, but calling setItems() every tick changes the
  // `items` reference, which would re-run this effect and tear down/recreate
  // setInterval on every single tick instead of running on one stable interval.
  // Mirrors useMultiplier.ts's pattern of not letting a per-tick state update
  // destabilize the effect that owns the timer.
  const itemsRef = useRef(items);
  useEffect(() => {
    itemsRef.current = items;
  }, [items]);
  // WHY: poll callbacks close over render-time scopeKey — a ref keeps the live
  // account so late ticks after a switch do not write into the new user's list.
  const scopeKeyRef = useRef(scopeKey);
  scopeKeyRef.current = scopeKey;
  const allDone = items.length > 0 && items.every((i) => i.status === 'done' || i.status === 'failed');

  // WHY: invalidate when the batch settles (QA-LIB-001): Library may already
  // have cached Pending rows from an earlier visit during generation; without
  // this, "View in Library" shows stale Pending until a manual refetch.
  useEffect(() => {
    if (!allDone) return;
    Promise.allSettled([
      queryClient.invalidateQueries({ queryKey: ['library', 'jobs'] }),
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'jobs'] }),
      queryClient.invalidateQueries({ queryKey: ['calendar', 'jobs'] }),
    ]).catch(() => {});
  }, [allDone, queryClient]);

  useEffect(() => {
    if (!storageReady || items.length === 0 || allDone) return undefined;

    let cancelled = false;
    // WHY: capture poll scope at start — a late tick after account switch must
    // not write the previous user's job statuses onto the new user's list.
    const pollScope = scopeKey;
    // WHY: inFlight: 7 parallel status calls can outlast the 2.5s tick; overlapping
    // ticks would apply results out of order.
    let inFlight = false;
    const startedAt = Date.now();
    // WHY: const after setInterval — prefer-const; cleanup closes over this handle.
    let clearPoll: (() => void) | undefined;

    function poll(): void {
      if (inFlight) return;
      // WHY: max duration: a job that never reaches a terminal state would keep
      // this page polling forever — mark stragglers failed after 20 min.
      if (Date.now() - startedAt > BATCH_MAX_POLL_MS) {
        clearPoll?.();
        if (!cancelled && scopeKeyRef.current === pollScope) {
          setItems((prev) => prev.map((i) => (
            i.status === 'done' || i.status === 'failed' ? i : { ...i, status: 'failed' }
          )));
        }
        return;
      }
      inFlight = true;
      // WHY: Promise.allSettled instead of Promise.all: if one job's API call fails, we still want
      // to update state for the jobs that succeeded. Promise.all would reject the entire batch,
      // blocking all updates until the next interval.
      Promise.allSettled(
        itemsRef.current.map(async (item) => {
          if (item.status === 'done' || item.status === 'failed') return item;
          try {
            // WHY: the slim /status endpoint rather than getJob: the batch polls up to 7 jobs
            // every 2.5s and only ever consumes status/progress/score — the full payload
            // re-downloads every output's `content` jsonb (research report, whole carousel)
            // per tick for zero gain (perf audit). score comes from /status directly.
            const s = await getJobStatus(item.jobId);
            // WHY: done && hasFinal (mirrors useJobData): status can flip to
            // 'done' before the final output row is readable — treating that as
            // terminal showed "View →" while Result was still empty.
            const isSuccess = s.status === 'done' && s.hasFinal;
            return {
              ...item,
              topic: s.topic || item.topic,
              status: isSuccess ? 'done' : s.status === 'failed' ? 'failed' : 'processing',
              progress: isSuccess ? 100 : s.progress ?? (item.progress < 80 ? item.progress + 8 : item.progress),
              score: s.score,
            } as BatchItem;
          } catch (err: unknown) {
            // WHY: a deleted job 404s on every tick. Leaving it pending means
            // the batch spinner never settles.
            if (httpStatusOf(err) === 404) {
              return { ...item, status: 'failed', progress: 0 } as BatchItem;
            }
            return item;
          }
        }),
      ).then((results) => {
        const fulfilled = results.filter((r): r is PromiseFulfilledResult<BatchItem> => r.status === 'fulfilled');
        // WHY: drop results when scope ≠ request scope (account switched mid-poll).
        if (cancelled || scopeKeyRef.current !== pollScope) return;
        setItems(fulfilled.map((r) => r.value));
      }).catch(() => {}).finally(() => {
        inFlight = false;
      });
    }

    // WHY: poll once immediately — waiting 2.5s for the first tick left every
    // card stuck on "pending" even when jobs were already processing/done.
    poll();
    const interval = setInterval(poll, 2500);
    clearPoll = () => {
      clearInterval(interval);
      clearPoll = undefined;
    };

    return () => {
      cancelled = true;
      clearPoll?.();
    };
  }, [items.length, allDone, storageReady, scopeKey, userId]);

  const doneCount = items.filter((i) => i.status === 'done').length;
  const failedCount = items.filter((i) => i.status === 'failed').length;
  const totalDone = doneCount + failedCount;
  const allComplete = totalDone === items.length && items.length > 0;
  const overallPct = items.length ? Math.round((totalDone / items.length) * 100) : 0;

  if (!storageReady) {
    return (
      <div style={{
        padding: '64px 24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13,
      }}>
        Loading batch…
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '64px 24px', gap: 14 }}>
        <AlertTriangle size={36} style={{ color: 'var(--color-error)', opacity: 0.6 }} />
        <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>No batch found</h1>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', maxWidth: 360 }}>
          This page needs a batch submitted from Create or Repurpose. A hard refresh
          within 24 hours should still recover the list; if you opened a fresh tab,
          start a new batch instead.
        </p>
        <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
          <button className="btn-primary" onClick={() => navigate('/create')}>Create content</button>
          <button className="btn-secondary" onClick={() => navigate('/dashboard')}>Go to dashboard</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <style>{`
        @keyframes br-spin { to { transform: rotate(360deg); } }
        @keyframes br-fadeUp { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      <div style={{ paddingBottom: 18, borderBottom: '1px solid var(--rule)' }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: 3, textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ width: 18, height: 1, background: 'linear-gradient(90deg, var(--accent), transparent)', display: 'inline-block' }} />
          Batch Generation
        </div>
        <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 'clamp(18px,4vw,24px)', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.2 }}>
          {allComplete
            ? (doneCount === items.length
              ? <><Sparkles size={20} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 6 }} />All posts generated!</>
              : `Batch complete — ${doneCount}/${items.length} succeeded`)
            : 'Generating your posts…'}
        </h1>
        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
          {allComplete
            ? `${doneCount} posts ready · ${failedCount > 0 ? `${failedCount} failed` : 'all successful'}`
            : `${doneCount}/${items.length} posts done · ${items.length - totalDone} in progress`}
        </p>
        {creationFailedCount > 0 && (
          <p style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--color-error)', marginTop: 8 }}>
            <AlertTriangle size={13} />
            {creationFailedCount} item{creationFailedCount !== 1 ? 's' : ''} couldn't be submitted and{' '}
            {creationFailedCount !== 1 ? "weren't" : "wasn't"} included in this batch.
          </p>
        )}
      </div>

      {!allComplete && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)' }}>Overall progress</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--accent)' }}>{overallPct}%</span>
          </div>
          <div style={{ height: 4, background: 'var(--rule)', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{ height: '100%', background: 'linear-gradient(90deg, var(--accent), var(--accent-2))', borderRadius: 2, width: `${overallPct}%`, transition: 'width .6s ease' }} />
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {items.map((item, i) => {
          const meta = platformMeta[item.platform] || platformMeta.linkedin_post;
          const borderColor = item.status === 'done'
            ? 'color-mix(in srgb, var(--color-success) 25%, transparent)'
            : item.status === 'failed'
              ? 'color-mix(in srgb, var(--color-error) 20%, transparent)'
              : item.status === 'processing'
                ? 'color-mix(in srgb, var(--accent) 20%, transparent)'
                : 'var(--rule)';
          return (
            <div
              key={item.jobId}
              style={{
                background: 'var(--bg-raised)', border: `1px solid ${borderColor}`, borderRadius: 14,
                padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 12,
                animation: `br-fadeUp .25s ease ${i * 0.06}s both`, transition: 'border-color .2s',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 9, flexShrink: 0,
                  background: 'color-mix(in srgb, var(--accent) 8%, transparent)',
                  border: '1px solid color-mix(in srgb, var(--accent) 18%, transparent)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 700, color: 'var(--accent)',
                }}>
                  {i + 1}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {item.topic}
                  </div>
                  <span style={{
                    fontFamily: 'var(--font-mono)', fontSize: 9.5, color: meta.color, background: meta.bg,
                    border: `1px solid ${meta.border}`, padding: '1px 7px', borderRadius: 20,
                    display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 4,
                  }}>
                    <meta.Icon size={9} /> {meta.label}
                  </span>
                </div>

                <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                  {item.status === 'done' && (
                    <>
                      {item.score != null && (
                        <span style={{
                          fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 700,
                          color: item.score >= 80 ? 'var(--color-success)' : item.score >= 60 ? 'var(--accent)' : 'var(--color-error)',
                          background: item.score >= 80 ? 'color-mix(in srgb, var(--color-success) 10%, transparent)' : item.score >= 60 ? 'color-mix(in srgb, var(--accent) 10%, transparent)' : 'color-mix(in srgb, var(--color-error) 10%, transparent)',
                          border: `1px solid ${item.score >= 80 ? 'color-mix(in srgb, var(--color-success) 25%, transparent)' : item.score >= 60 ? 'color-mix(in srgb, var(--accent) 25%, transparent)' : 'color-mix(in srgb, var(--color-error) 25%, transparent)'}`,
                          borderRadius: 20, padding: '2px 9px',
                        }}>
                          {item.score}
                        </span>
                      )}
                      <button
                        className="btn-secondary"
                        onClick={() => navigate(`/result/${item.jobId}`)}
                        style={{ padding: '6px 13px', fontSize: 12 }}
                      >
                        View →
                      </button>
                    </>
                  )}
                  {item.status === 'failed' && (
                    <button
                      className="btn-secondary"
                      onClick={() => navigate(`/result/${item.jobId}`)}
                      style={{
                        padding: '5px 10px', fontSize: 11, color: 'var(--color-error)',
                        background: 'color-mix(in srgb, var(--color-error) 6%, transparent)',
                        border: '1px solid color-mix(in srgb, var(--color-error) 20%, transparent)',
                        borderRadius: 8, display: 'inline-flex', alignItems: 'center', gap: 5,
                      }}
                    >
                      <AlertTriangle size={10} /> See error
                    </button>
                  )}
                  {(item.status === 'processing' || item.status === 'pending') && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ width: 14, height: 14, border: '2px solid color-mix(in srgb, var(--accent) 20%, transparent)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'br-spin .8s linear infinite' }} />
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--accent)' }}>{item.progress || 0}%</span>
                    </div>
                  )}
                </div>
              </div>

              {(item.status === 'processing' || item.status === 'pending') && (
                <div style={{ height: 3, background: 'var(--rule)', borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{ height: '100%', background: `linear-gradient(90deg, ${meta.color}, ${meta.color}70)`, borderRadius: 2, width: `${item.progress || 5}%`, transition: 'width .6s ease' }} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {allComplete && (
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', animation: 'br-fadeUp .3s ease both' }}>
          <button className="btn-secondary" onClick={() => navigate('/library')} style={{ flex: 1, minWidth: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <Timer size={13} /> View in Library
          </button>
          <button className="btn-secondary" onClick={() => navigate('/calendar')} style={{ flex: 1, minWidth: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <CalendarDays size={13} /> View on Calendar
          </button>
          <button className="btn-primary" onClick={() => navigate('/create')} style={{ flex: 1, minWidth: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <Sparkles size={13} /> Create more
          </button>
        </div>
      )}
    </div>
  );
}
