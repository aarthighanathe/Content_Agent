// FeedMonitorPanel.tsx — RSS/Atom feed subscription manager in the Repurpose sidebar.
// Lets users subscribe a public feed URL; the server polls it every 30 min and
// auto-creates a repurpose job when a new item is found.
import { useState, useEffect, useCallback } from 'react';
import { Rss, PlusCircle, Trash2, Play, Pause, RefreshCw, X, ChevronDown, ChevronUp } from 'lucide-react';
import {
  getFeedMonitors, createFeedMonitor, toggleFeedMonitor,
  deleteFeedMonitor, checkFeedMonitorNow, type FeedMonitor,
} from '../../api';

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
  const [monitors, setMonitors] = useState<FeedMonitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState<AddFormState>(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [checkingId, setCheckingId] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(false);

  const loadMonitors = useCallback(async () => {
    try {
      const { monitors: rows } = await getFeedMonitors();
      setMonitors(rows);
    } catch {
      // Silently ignore on load; user still sees the empty state or previous list
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadMonitors(); }, [loadMonitors]);

  async function handleAdd() {
    if (!form.feedUrl.trim()) { setError('Feed URL is required'); return; }
    try { new URL(form.feedUrl); } catch { setError('Enter a valid https:// URL'); return; }
    setSaving(true);
    setError('');
    try {
      const { monitor } = await createFeedMonitor({
        feedUrl: form.feedUrl.trim(),
        platform: form.platform,
        tone: form.tone,
        targetAudience: form.targetAudience.trim() || 'general audience',
      });
      setMonitors((prev) => [monitor, ...prev]);
      setForm(DEFAULT_FORM);
      setShowAdd(false);
    } catch {
      setError('Failed to subscribe — check the URL and try again.');
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle(id: string, current: boolean) {
    try {
      const { monitor } = await toggleFeedMonitor(id, !current);
      setMonitors((prev) => prev.map((m) => (m.id === id ? monitor : m)));
    } catch { /* silently ignore */ }
  }

  async function handleDelete(id: string) {
    try {
      await deleteFeedMonitor(id);
      setMonitors((prev) => prev.filter((m) => m.id !== id));
    } catch { /* silently ignore */ }
  }

  async function handleCheck(id: string) {
    setCheckingId(id);
    try {
      await checkFeedMonitorNow(id);
      // Refresh after a brief pause so lastCheckedAt updates
      setTimeout(loadMonitors, 2000);
    } catch { /* silently ignore */ } finally {
      setCheckingId(null);
    }
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
      borderRadius: 16, overflow: 'hidden',
    }}>
      {/* Header */}
      <div
        onClick={() => setCollapsed((v) => !v)}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px', cursor: 'pointer', userSelect: 'none',
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
      </div>

      {!collapsed && (
        <div style={{ padding: '0 20px 20px' }}>
          {/* Monitor list */}
          {loading && <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '0 0 12px' }}>Loading…</p>}

          {!loading && monitors.length === 0 && !showAdd && (
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
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                    {/* Check now */}
                    <button
                      onClick={() => handleCheck(m.id)}
                      disabled={checkingId === m.id}
                      title="Check now"
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer', padding: 4,
                        color: 'var(--text-muted)', display: 'flex', alignItems: 'center',
                        opacity: checkingId === m.id ? 0.4 : 1,
                      }}
                    >
                      <RefreshCw size={12} style={checkingId === m.id ? { animation: 'fm-spin 1s linear infinite' } : undefined} />
                    </button>
                    {/* Pause / Resume */}
                    <button
                      onClick={() => handleToggle(m.id, m.active)}
                      title={m.active ? 'Pause' : 'Resume'}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: m.active ? 'var(--accent)' : 'var(--text-muted)', display: 'flex', alignItems: 'center' }}
                    >
                      {m.active ? <Pause size={12} /> : <Play size={12} />}
                    </button>
                    {/* Delete */}
                    <button
                      onClick={() => handleDelete(m.id)}
                      title="Remove monitor"
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: 'var(--color-error)', display: 'flex', alignItems: 'center', opacity: 0.6 }}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Add form */}
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
                  disabled={saving}
                  className="btn-primary"
                  style={{ width: '100%', justifyContent: 'center', fontSize: 12.5, padding: '8px 14px' }}
                >
                  {saving ? 'Subscribing…' : 'Subscribe to feed'}
                </button>
              </div>
            </div>
          ) : (
            <button
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

      <style>{`@keyframes fm-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
