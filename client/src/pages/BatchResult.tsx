import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Sparkles, Timer, CalendarDays, AlertTriangle } from 'lucide-react';
import { getJobStatus } from '../api';
import { platformMeta } from '../lib/platformMeta';

interface BatchJobRef {
  jobId: string;
  topic: string;
  platform: string;
}

interface BatchItem extends BatchJobRef {
  status: 'pending' | 'processing' | 'done' | 'failed';
  progress: number;
  score?: number;
}

// WHY router state, not URL params (rewritten 2026-08-04): the previous version
// of this page encoded the job list into a `?jobs=id|platform,...` query string,
// which meant a hard refresh or shared link could only ever replay stale
// pending/processing state. Reading `location.state` (the same CreateHandoff-
// style pattern the rest of the app uses for one-shot navigation payloads) is
// simpler and avoids re-deriving anything from a compact URL format — the
// tradeoff is that a hard refresh loses the list, same as any other
// state-only handoff in this app (e.g. Competitor.tsx's navigateToCreate).
export default function BatchResultPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const initialJobs = (location.state as { jobs?: BatchJobRef[] } | null)?.jobs || [];
  const [items, setItems] = useState<BatchItem[]>(() =>
    initialJobs.map((j) => ({ ...j, status: 'pending', progress: 0 })),
  );

  // WHY a ref, not `items` in the dependency array: the interval callback needs
  // the latest items to poll, but calling setItems() every tick changes the
  // `items` reference, which would re-run this effect and tear down/recreate
  // setInterval on every single tick instead of running on one stable interval.
  // Mirrors useMultiplier.ts's pattern of not letting a per-tick state update
  // destabilize the effect that owns the timer.
  const itemsRef = useRef(items);
  useEffect(() => {
    itemsRef.current = items;
  }, [items]);
  const allDone = items.length > 0 && items.every((i) => i.status === 'done' || i.status === 'failed');

  useEffect(() => {
    if (items.length === 0 || allDone) return undefined;

    const interval = setInterval(() => {
      // WHY Promise.allSettled instead of Promise.all: if one job's API call fails, we still want
      // to update state for the jobs that succeeded. Promise.all would reject the entire batch,
      // blocking all updates until the next interval.
      Promise.allSettled(
        itemsRef.current.map(async (item) => {
          if (item.status === 'done' || item.status === 'failed') return item;
          try {
            // WHY the slim /status endpoint rather than getJob: the batch polls up to 7 jobs
            // every 2.5s and only ever consumes status/progress/score — the full payload
            // re-downloads every output's `content` jsonb (research report, whole carousel)
            // per tick for zero gain (perf audit). score comes from /status directly.
            const s = await getJobStatus(item.jobId);
            return {
              ...item,
              topic: s.topic || item.topic,
              status: s.status === 'done' ? 'done' : s.status === 'failed' ? 'failed' : 'processing',
              progress: s.status === 'done' ? 100 : s.progress ?? (item.progress < 80 ? item.progress + 8 : item.progress),
              score: s.score,
            } as BatchItem;
          } catch {
            return item;
          }
        }),
      ).then((results) => {
        // Filter out rejected promises and only update with fulfilled results
        const fulfilled = results.filter((r): r is PromiseFulfilledResult<BatchItem> => r.status === 'fulfilled');
        setItems(fulfilled.map((r) => r.value));
      }).catch(() => {});
    }, 2500);

    return () => clearInterval(interval);
  }, [items.length, allDone]);

  const doneCount = items.filter((i) => i.status === 'done').length;
  const failedCount = items.filter((i) => i.status === 'failed').length;
  const totalDone = doneCount + failedCount;
  const allComplete = totalDone === items.length && items.length > 0;
  const overallPct = items.length ? Math.round((totalDone / items.length) * 100) : 0;

  if (items.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '64px 24px', gap: 14 }}>
        <AlertTriangle size={36} style={{ color: 'var(--color-error)', opacity: 0.6 }} />
        <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>No batch found</h1>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', maxWidth: 360 }}>
          This page needs a batch submitted from Create's "Plan multiple topics" mode — it doesn't
          work from a direct link or refresh. Start a new batch or head back to your dashboard.
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

      {/* Header */}
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
      </div>

      {/* Overall progress bar */}
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

      {/* Job cards */}
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
                    <span style={{
                      fontSize: 11, color: 'var(--color-error)', background: 'color-mix(in srgb, var(--color-error) 6%, transparent)',
                      border: '1px solid color-mix(in srgb, var(--color-error) 20%, transparent)', borderRadius: 8,
                      padding: '5px 10px', display: 'inline-flex', alignItems: 'center', gap: 5,
                    }}>
                      <AlertTriangle size={10} /> Failed
                    </span>
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
