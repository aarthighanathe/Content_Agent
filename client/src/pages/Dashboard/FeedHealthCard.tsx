import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@clerk/clerk-react';
import { Rss, AlertCircle, CheckCircle2, PauseCircle, ChevronRight } from 'lucide-react';
import { getFeedMonitors } from '../../api';

function formatCheckAge(iso: string | null | undefined): string {
  if (!iso) return 'Never checked';
  const ms = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(ms) || ms < 0) return 'Unknown';
  const mins = Math.floor(ms / 60_000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 48) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

/** Compact feed-monitor health strip for Dashboard (F9). */
export function FeedHealthCard() {
  const { isLoaded: authLoaded, isSignedIn } = useAuth();
  const query = useQuery({
    queryKey: ['dashboard', 'feedMonitors'],
    queryFn: getFeedMonitors,
    enabled: authLoaded && isSignedIn,
    staleTime: 60_000,
  });

  // WHY hide while pending: a skeleton here used to reserve a row, then
  // disappear for anyone with no monitors and shove the rest of the page up.
  if (query.isPending || query.isError) return null;

  const monitors = query.data?.monitors ?? [];
  if (monitors.length === 0) return null;

  const errored = monitors.filter((m) => Boolean(m.lastError));
  const paused = monitors.filter((m) => !m.active);
  const healthy = monitors.filter((m) => m.active && !m.lastError);

  return (
    <div
      className="card"
      style={{ display: 'flex', alignItems: 'flex-start', gap: 14, padding: '14px 18px' }}
    >
      <div
        style={{
          width: 38, height: 38, borderRadius: 10, flexShrink: 0,
          background: errored.length > 0
            ? 'color-mix(in srgb, var(--color-error) 10%, transparent)'
            : 'color-mix(in srgb, var(--accent-2) 10%, transparent)',
          border: `1px solid ${errored.length > 0
            ? 'color-mix(in srgb, var(--color-error) 22%, transparent)'
            : 'color-mix(in srgb, var(--accent-2) 22%, transparent)'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: errored.length > 0 ? 'var(--color-error)' : 'var(--accent-2)',
        }}
      >
        <Rss size={17} />
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
              Feed monitors · {monitors.length}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, fontSize: 11, color: 'var(--text-muted)' }}>
              {healthy.length > 0 && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <CheckCircle2 size={11} style={{ color: 'var(--color-success)' }} />
                  {healthy.length} healthy
                </span>
              )}
              {errored.length > 0 && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--color-error)' }}>
                  <AlertCircle size={11} />
                  {errored.length} error{errored.length === 1 ? '' : 's'}
                </span>
              )}
              {paused.length > 0 && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <PauseCircle size={11} />
                  {paused.length} paused
                </span>
              )}
              {monitors[0]?.lastCheckedAt && (
                <span>· Last check {formatCheckAge(monitors[0].lastCheckedAt)}</span>
              )}
            </div>
            {errored[0]?.lastError && (
              <p
                style={{
                  fontSize: 11, color: 'var(--color-error)', margin: '6px 0 0',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}
                title={errored[0].lastError}
              >
                {errored[0].lastError}
              </p>
            )}
      </div>

      <Link
        to="/repurpose"
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 2, flexShrink: 0,
          fontSize: 11.5, color: 'var(--accent)', textDecoration: 'none', fontWeight: 600,
          marginTop: 8,
        }}
      >
        Manage <ChevronRight size={13} />
      </Link>
    </div>
  );
}
