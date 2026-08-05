import { Link } from 'react-router-dom';
import { CheckSquare, Plus, BarChart2 } from 'lucide-react';

interface LibraryHeaderProps {
  total: number;
  manageMode: boolean;
  onToggleManageMode: () => void;
  showAnalytics: boolean;
  onToggleAnalytics: () => void;
}

export function LibraryHeader({ total, manageMode, onToggleManageMode, showAnalytics, onToggleAnalytics }: LibraryHeaderProps) {
  return (
    <>
      {/* ── Page Header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontFamily: "var(--font-heading)", fontSize: 'clamp(19px,5vw,25px)', fontWeight: 700, lineHeight: 1.1, color: 'var(--text-primary)', margin: 0 }}>
            Content Library
          </h1>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
            {total} generation{total !== 1 ? 's' : ''}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          <button
            onClick={onToggleAnalytics}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 14px',
              background: showAnalytics ? 'color-mix(in srgb, var(--accent-2) 10%, transparent)' : 'color-mix(in srgb, var(--text-primary) 4%, transparent)',
              border: `1px solid ${showAnalytics ? 'color-mix(in srgb, var(--accent-2) 35%, transparent)' : 'var(--rule)'}`,
              borderRadius: 10, cursor: 'pointer',
              color: showAnalytics ? 'var(--accent-2)' : 'var(--text-secondary)', fontSize: 12, fontWeight: 500,
            }}
          >
            <BarChart2 size={13} /> Analytics
          </button>
          <button
            onClick={onToggleManageMode}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 14px',
              background: manageMode ? 'color-mix(in srgb, var(--accent) 10%, transparent)' : 'color-mix(in srgb, var(--text-primary) 4%, transparent)',
              border: `1px solid ${manageMode ? 'color-mix(in srgb, var(--accent) 35%, transparent)' : 'var(--rule)'}`,
              borderRadius: 10, cursor: 'pointer',
              color: manageMode ? 'var(--accent)' : 'var(--text-secondary)', fontSize: 12, fontWeight: 500,
            }}
          >
            <CheckSquare size={13} /> {manageMode ? 'Done' : 'Manage'}
          </button>
          <Link to="/create" className="btn-primary" style={{ whiteSpace: 'nowrap' }}>
            <Plus size={13} /> New content
          </Link>
        </div>
      </div>
    </>
  );
}
