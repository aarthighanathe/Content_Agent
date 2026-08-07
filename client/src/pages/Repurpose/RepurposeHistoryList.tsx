import { useNavigate } from 'react-router-dom';
import { History, CheckCircle2, XCircle, X, RotateCcw } from 'lucide-react';
import { timeAgo } from '../../lib/utils';
import { platformMeta } from '../../lib/platformMeta';
import type { RepurposeHistoryEntry } from './useRepurposeHistory';

interface RepurposeHistoryListProps {
  history: RepurposeHistoryEntry[];
  onRetry: (entry: RepurposeHistoryEntry) => void;
  onRemove: (id: string) => void;
}

// WHY its own sidebar card, not folded into "How It Works": recent attempts
// are actionable (retry a failure, jump back to a success), a meaningfully
// different kind of content than the static informational cards next to it.
// Hidden entirely when empty — a first-time user has nothing to show here.
export function RepurposeHistoryList({ history, onRetry, onRemove }: RepurposeHistoryListProps) {
  const navigate = useNavigate();
  if (history.length === 0) return null;

  return (
    <div style={{ background: 'var(--bg-raised)', border: '1px solid var(--rule)', borderRadius: 16, padding: '20px' }}>
      <p style={{ margin: '0 0 14px', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, display: 'flex', alignItems: 'center', gap: 6 }}>
        <History size={12} /> Recent Attempts
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {history.map((entry) => {
          const meta = platformMeta[entry.platform];
          return (
            <div
              key={entry.id}
              style={{
                display: 'flex', alignItems: 'flex-start', gap: 8,
                background: 'color-mix(in srgb, var(--text-primary) 2%, transparent)',
                border: '1px solid var(--rule)', borderRadius: 10, padding: '9px 10px',
              }}
            >
              {entry.outcome === 'success' ? (
                <CheckCircle2 size={13} style={{ color: 'var(--color-success)', flexShrink: 0, marginTop: 1 }} />
              ) : (
                <XCircle size={13} style={{ color: 'var(--color-error)', flexShrink: 0, marginTop: 1 }} />
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 11.5, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', wordBreak: 'break-all' }} title={entry.url}>
                  {entry.url}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3, flexWrap: 'wrap' }}>
                  {meta && (
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: meta.color }}>{meta.label}</span>
                  )}
                  <span style={{ fontSize: 9.5, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{timeAgo(entry.createdAt)}</span>
                </div>
                {entry.outcome === 'failed' && entry.errorMessage && (
                  <div style={{ fontSize: 10.5, color: 'var(--color-error)', marginTop: 3, lineHeight: 1.4 }}>{entry.errorMessage}</div>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flexShrink: 0 }}>
                {entry.outcome === 'success' && entry.jobId ? (
                  <button
                    type="button"
                    title="View result"
                    onClick={() => navigate(`/result/${entry.jobId}`)}
                    style={{ background: 'transparent', border: 'none', padding: 3, cursor: 'pointer', color: 'var(--accent)', display: 'flex' }}
                  >
                    <CheckCircle2 size={12} />
                  </button>
                ) : (
                  <button
                    type="button"
                    title="Retry this URL"
                    onClick={() => onRetry(entry)}
                    style={{ background: 'transparent', border: 'none', padding: 3, cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}
                  >
                    <RotateCcw size={12} />
                  </button>
                )}
                <button
                  type="button"
                  title="Remove from history"
                  onClick={() => onRemove(entry.id)}
                  style={{ background: 'transparent', border: 'none', padding: 3, cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}
                >
                  <X size={12} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
