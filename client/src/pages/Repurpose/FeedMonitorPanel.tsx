// FeedMonitorPanel — RSS/Atom subscriptions; server polls every 30 min → auto-repurpose.
import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@clerk/clerk-react';
import { Rss, PlusCircle, Trash2, Play, Pause, RefreshCw, X, ChevronDown, ChevronUp } from 'lucide-react';
import {
  getFeedMonitors, createFeedMonitor, toggleFeedMonitor,
  deleteFeedMonitor,
} from '../../api';
import { ConfirmDeleteModal } from '../../components/ConfirmDeleteModal';
import { SkeletonBlock } from '../../components/SkeletonCard';
import { ErrorState } from '../../components/ErrorState';
import { isSafeHttpUrl } from '../../lib/utils';
import { useFeedMonitorCheck } from './useFeedMonitorCheck';

const PLATFORMS = [
  { id: 'linkedin_post', label: 'LinkedIn Post' },
  { id: 'instagram_carousel', label: 'Instagram Carousel' },
  { id: 'twitter_thread', label: 'Twitter Thread' },
  { id: 'instagram_caption', label: 'Instagram Caption' },
];

const TONES = ['professional', 'casual', 'witty', 'educational', 'inspirational'];

interface AddFormState {
  feedUrl: string;
  platform: string;
  tone: string;
  targetAudience: string;
}

const DEFAULT_FORM: AddFormState = {
  feedUrl: '',
  platform: 'linkedin_post',
  tone: 'professional',
  targetAudience: '',
};

export function FeedMonitorPanel() {
  const queryClient = useQueryClient();
  const { isLoaded: authLoaded, isSignedIn, userId } = useAuth();
  const monitorsQuery = useQuery({
    queryKey: ['feedMonitors'],
    queryFn: getFeedMonitors,
    // WHY: gate like Create/Library — avoid an unauthenticated fetch before Clerk hydrates.
    enabled: authLoaded && isSignedIn,
  });
  const monitors = monitorsQuery.data?.monitors || [];
  // WHY: isPending, not isLoading: while Clerk hydrates the query is disabled and
  // isLoading is false — that flashed an empty list then skeletons (Dashboard pattern).
  const loading = monitorsQuery.isPending;
  const loadError = monitorsQuery.isError;

  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState<AddFormState>(DEFAULT_FORM);
  const [error, setError] = useState('');
  const [collapsed, setCollapsed] = useState(false);
  // WHY: confirm before delete: trash was one-click with no undo (Library pattern).
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  // WHY: sync gate — isPending only flips after re-render; double-click Subscribe
  // could fire two creates before React Query armed the button disable.
  const creatingRef = useRef(false);
  const { checkMutation, checkingId, checkError } = useFeedMonitorCheck();

  // WHY: account switch must not leave User A's draft URL / open add form /
  // delete-confirm modal on User B's panel.
  useEffect(() => {
    setForm(DEFAULT_FORM);
    setShowAdd(false);
    setError('');
    setDeleteConfirmId(null);
    creatingRef.current = false;
  }, [userId]);

  const createMutation = useMutation({
    mutationFn: createFeedMonitor,
    onSuccess: () => {
      Promise.allSettled([
        queryClient.invalidateQueries({ queryKey: ['feedMonitors'] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard', 'feedMonitors'] }),
      ]).catch(() => {});
      setForm(DEFAULT_FORM);
      setShowAdd(false);
      setError('');
    },
    onError: (err: unknown) => {
      // WHY: surface server probe reason (QA-FEED-001): create now validates the
      // feed is fetchable/parseable — Axios puts that message on response.data.error.
      const axiosErr = err as { response?: { data?: { error?: string } } };
      const serverMsg = axiosErr.response?.data?.error;
      setError(
        typeof serverMsg === 'string' && serverMsg.trim()
          ? serverMsg
          : 'Failed to subscribe — check the URL and try again.',
      );
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) => toggleFeedMonitor(id, active),
    onSuccess: () => {
      Promise.allSettled([
        queryClient.invalidateQueries({ queryKey: ['feedMonitors'] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard', 'feedMonitors'] }),
      ]).catch(() => {});
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteFeedMonitor(id),
    onSuccess: () => {
      Promise.allSettled([
        queryClient.invalidateQueries({ queryKey: ['feedMonitors'] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard', 'feedMonitors'] }),
      ]).catch(() => {});
    },
  });

  async function handleAdd() {
    if (createMutation.isPending || creatingRef.current) return;
    const trimmed = form.feedUrl.trim();
    if (!trimmed) { setError('Feed URL is required'); return; }
    // WHY: new URL alone accepts javascript:/ftp: — copy claims https; require http(s).
    if (!isSafeHttpUrl(trimmed)) { setError('Enter a valid https:// URL'); return; }
    creatingRef.current = true;
    setError('');
    createMutation.mutate(
      {
        feedUrl: trimmed,
        platform: form.platform,
        tone: form.tone,
        targetAudience: form.targetAudience.trim() || 'general audience',
      },
      {
        onSettled: () => {
          creatingRef.current = false;
        },
      },
    );
  }

  function handleToggle(id: string, current: boolean) {
    if (toggleMutation.isPending) return;
    toggleMutation.mutate({ id, active: !current });
  }

  function fmtDate(iso: string | null): string {
    if (!iso) return 'Never';
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  function hostOf(url: string): string {
    try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return url; }
  }

  return (
    <div style={{
      background: 'var(--bg-raised)', border: '1px solid var(--rule)',
      borderRadius: 16, overflow: 'hidden', flexShrink: 0,
    }}>
      <button
        type="button"
        onClick={() => setCollapsed((v) => !v)}
        aria-expanded={!collapsed}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          width: '100%', padding: '16px 20px', cursor: 'pointer', userSelect: 'none',
          background: 'transparent', border: 'none', color: 'inherit', textAlign: 'left',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <Rss size={14} color="var(--accent)" />
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1 }}>
            Feed Monitors
          </span>
          {monitors.length > 0 && (
            <span style={{
              fontSize: 10, fontFamily: 'var(--font-mono)', background: 'color-mix(in srgb, var(--accent) 10%, transparent)',
              border: '1px solid color-mix(in srgb, var(--accent) 20%, transparent)',
              color: 'var(--accent)', borderRadius: 10, padding: '1px 7px',
            }}>{monitors.length}</span>
          )}
        </div>
        {collapsed
          ? <ChevronDown size={13} color="var(--text-muted)" />
          : <ChevronUp size={13} color="var(--text-muted)" />}
      </button>

      {!collapsed && (
        <div style={{ padding: '0 20px 20px' }}>
          {loading && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }} aria-busy="true">
              {['a', 'b'].map((id) => (
                <div
                  key={id}
                  style={{
                    background: 'color-mix(in srgb, var(--text-primary) 2%, transparent)',
                    border: '1px solid var(--rule)',
                    borderRadius: 10,
                    padding: '10px 12px',
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    gap: 8,
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <SkeletonBlock width="48%" height={12} radius={4} />
                    <SkeletonBlock width="36%" height={11} radius={4} delay={0.08} style={{ marginTop: 6 }} />
                    <SkeletonBlock width="42%" height={10} radius={4} delay={0.12} style={{ marginTop: 6 }} />
                  </div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <SkeletonBlock width={22} height={22} radius={6} />
                    <SkeletonBlock width={22} height={22} radius={6} />
                    <SkeletonBlock width={22} height={22} radius={6} />
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loading && loadError && (
            <div style={{ marginBottom: 12 }}>
              <ErrorState
                message="We couldn't load your feed monitors. Please try again."
                onRetry={() => { monitorsQuery.refetch().catch(() => {}); }}
              />
            </div>
          )}

          {!loading && !loadError && monitors.length === 0 && !showAdd && (
            <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.55, marginBottom: 12 }}>
              Subscribe a blog or newsletter RSS feed — new articles are automatically repurposed.
            </p>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: monitors.length > 0 ? 12 : 0 }}>
            {monitors.map((m) => (
              <div
                key={m.id}
                style={{
                  background: 'color-mix(in srgb, var(--text-primary) 2%, transparent)',
                  border: `1px solid ${m.active ? 'color-mix(in srgb, var(--accent) 18%, transparent)' : 'var(--rule)'}`,
                  borderRadius: 10, padding: '10px 12px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: 12.5, fontWeight: 600, color: 'var(--text-primary)',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {hostOf(m.feedUrl)}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                      {PLATFORMS.find((p) => p.id === m.platform)?.label} · {m.tone}
                    </div>
                    <div style={{ fontSize: 10.5, color: 'var(--text-muted)', marginTop: 2 }}>
                      Last check: {fmtDate(m.lastCheckedAt)}
                    </div>
                    {m.lastError && (
                      <div style={{ fontSize: 10.5, color: 'var(--color-error)', marginTop: 2 }}>
                        {m.lastError}
                      </div>
                    )}
                    {checkError?.id === m.id && (
                      <div style={{ fontSize: 10.5, color: 'var(--color-error)', marginTop: 2 }}>
                        {checkError.message}
                      </div>
                    )}
                  </div>

                  <div className="fm-row-actions" style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                    <button
                      type="button"
                      className="fm-icon-btn"
                      onClick={() => checkMutation.mutate(m.id)}
                      disabled={checkingId === m.id}
                      title="Check now"
                      aria-label="Check feed now"
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer', padding: 4,
                        color: 'var(--text-muted)', display: 'flex', alignItems: 'center',
                        opacity: checkingId === m.id ? 0.4 : 1,
                      }}
                    >
                      <RefreshCw size={12} style={checkingId === m.id ? { animation: 'fm-spin 1s linear infinite' } : undefined} />
                    </button>
                    <button
                      type="button"
                      className="fm-icon-btn"
                      onClick={() => handleToggle(m.id, m.active)}
                      disabled={toggleMutation.isPending}
                      title={m.active ? 'Pause' : 'Resume'}
                      aria-label={m.active ? 'Pause feed monitor' : 'Resume feed monitor'}
                      style={{
                        background: 'none', border: 'none',
                        cursor: toggleMutation.isPending ? 'not-allowed' : 'pointer',
                        padding: 4,
                        color: m.active ? 'var(--accent)' : 'var(--text-muted)',
                        display: 'flex', alignItems: 'center',
                        opacity: toggleMutation.isPending ? 0.4 : 1,
                      }}
                    >
                      {m.active ? <Pause size={12} /> : <Play size={12} />}
                    </button>
                    <button
                      type="button"
                      className="fm-icon-btn"
                      onClick={() => setDeleteConfirmId(m.id)}
                      title="Remove monitor"
                      aria-label="Remove feed monitor"
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: 'var(--color-error)', display: 'flex', alignItems: 'center', opacity: 0.6 }}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {showAdd ? (
            <div style={{
              background: 'color-mix(in srgb, var(--accent) 4%, transparent)',
              border: '1px solid color-mix(in srgb, var(--accent) 15%, transparent)',
              borderRadius: 10, padding: '12px 14px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <span style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text-secondary)' }}>New feed monitor</span>
                <button onClick={() => { setShowAdd(false); setForm(DEFAULT_FORM); setError(''); }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: 'var(--text-muted)', display: 'flex' }}>
                  <X size={12} />
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <input
                  className="raw-input-focus-visible"
                  type="url"
                  placeholder="https://example.com/feed.xml"
                  value={form.feedUrl}
                  onChange={(e) => setForm((f) => ({ ...f, feedUrl: e.target.value }))}
                  style={{
                    width: '100%', boxSizing: 'border-box',
                    background: 'color-mix(in srgb, var(--text-primary) 3%, transparent)',
                    border: '1px solid var(--rule)', borderRadius: 8, padding: '8px 10px',
                    color: 'var(--color-text-primary)', fontSize: 12.5, outline: 'none',
                  }}
                />
                <select
                  className="raw-input-focus-visible"
                  value={form.platform}
                  onChange={(e) => setForm((f) => ({ ...f, platform: e.target.value }))}
                  style={{
                    background: 'color-mix(in srgb, var(--text-primary) 3%, transparent)',
                    border: '1px solid var(--rule)', borderRadius: 8, padding: '7px 10px',
                    color: 'var(--text-secondary)', fontSize: 12.5, outline: 'none', cursor: 'pointer',
                  }}
                >
                  {PLATFORMS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
                </select>
                <select
                  className="raw-input-focus-visible"
                  value={form.tone}
                  onChange={(e) => setForm((f) => ({ ...f, tone: e.target.value }))}
                  style={{
                    background: 'color-mix(in srgb, var(--text-primary) 3%, transparent)',
                    border: '1px solid var(--rule)', borderRadius: 8, padding: '7px 10px',
                    color: 'var(--text-secondary)', fontSize: 12.5, outline: 'none', cursor: 'pointer',
                    textTransform: 'capitalize',
                  }}
                >
                  {TONES.map((t) => <option key={t} value={t} style={{ textTransform: 'capitalize' }}>{t}</option>)}
                </select>
                <input
                  className="raw-input-focus-visible"
                  type="text"
                  placeholder="Target audience (optional)"
                  value={form.targetAudience}
                  onChange={(e) => setForm((f) => ({ ...f, targetAudience: e.target.value }))}
                  style={{
                    width: '100%', boxSizing: 'border-box',
                    background: 'color-mix(in srgb, var(--text-primary) 3%, transparent)',
                    border: '1px solid var(--rule)', borderRadius: 8, padding: '8px 10px',
                    color: 'var(--color-text-primary)', fontSize: 12.5, outline: 'none',
                  }}
                />
                {error && <p style={{ margin: 0, fontSize: 11.5, color: 'var(--color-error)' }}>{error}</p>}
                <button
                  onClick={handleAdd}
                  disabled={createMutation.isPending}
                  className="btn-primary"
                  style={{ width: '100%', justifyContent: 'center', fontSize: 12.5, padding: '8px 14px' }}
                >
                  {createMutation.isPending ? 'Subscribing…' : 'Subscribe to feed'}
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              className="fm-add-btn"
              onClick={() => setShowAdd(true)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                background: 'color-mix(in srgb, var(--accent) 5%, transparent)',
                border: '1px dashed color-mix(in srgb, var(--accent) 25%, transparent)',
                borderRadius: 9, padding: '8px 12px',
                color: 'var(--accent)', fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all .15s',
              }}
              onMouseEnter={(e) => { (e.currentTarget.style.background = 'color-mix(in srgb, var(--accent) 10%, transparent)'); }}
              onMouseLeave={(e) => { (e.currentTarget.style.background = 'color-mix(in srgb, var(--accent) 5%, transparent)'); }}
            >
              <PlusCircle size={13} /> Add feed monitor
            </button>
          )}
        </div>
      )}

      <style>{`
        @keyframes fm-spin { to { transform: rotate(360deg); } }
        /* WHY: icon-only feed actions were ~20×20; Add row ~37px on phones. */
        @media (max-width: 768px) {
          .fm-icon-btn {
            min-width: 44px !important;
            min-height: 44px !important;
            align-items: center !important;
            justify-content: center !important;
            padding: 0 !important;
            box-sizing: border-box;
          }
          .fm-add-btn {
            min-height: 44px;
            box-sizing: border-box;
          }
        }
      `}</style>

      {deleteConfirmId && (
        <ConfirmDeleteModal
          title="Remove this feed monitor?"
          message="New articles from this feed will no longer be auto-repurposed. Existing jobs are kept."
          confirmLabel="Remove"
          pendingLabel="Removing…"
          isPending={deleteMutation.isPending}
          onCancel={() => { if (!deleteMutation.isPending) setDeleteConfirmId(null); }}
          onConfirm={() => {
            deleteMutation.mutate(deleteConfirmId, { onSettled: () => setDeleteConfirmId(null) });
          }}
        />
      )}
    </div>
  );
}
