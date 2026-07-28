import { Link } from 'react-router-dom';
import { CheckSquare, Plus, Clock, BookMarked } from 'lucide-react';
import type { Tab } from './libraryHelpers';

interface LibraryHeaderProps {
  total: number;
  templateCount: number;
  manageMode: boolean;
  onToggleManageMode: () => void;
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
}

export function LibraryHeader({ total, templateCount, manageMode, onToggleManageMode, activeTab, onTabChange }: LibraryHeaderProps) {
  return (
    <>
      {/* ── Page Header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: 3, textTransform: 'uppercase', color: '#F59E0B', marginBottom: 7 }}>
            Library
          </div>
          <h1 style={{ fontFamily: "var(--font-heading)", fontSize: 'clamp(19px,5vw,25px)', fontWeight: 700, lineHeight: 1.1, color: 'rgba(255,255,255,0.92)', margin: 0 }}>
            Content Library
          </h1>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.28)', marginTop: 4 }}>
            {total} generation{total !== 1 ? 's' : ''} · {templateCount} template{templateCount !== 1 ? 's' : ''}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          <button
            onClick={onToggleManageMode}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 14px',
              background: manageMode ? 'rgba(245,158,11,0.1)' : 'rgba(255,255,255,0.04)',
              border: `1px solid ${manageMode ? 'rgba(245,158,11,0.35)' : 'rgba(255,255,255,0.08)'}`,
              borderRadius: 10, cursor: 'pointer',
              color: manageMode ? '#F59E0B' : 'rgba(255,255,255,0.45)', fontSize: 12, fontWeight: 500,
            }}
          >
            <CheckSquare size={13} /> {manageMode ? 'Done' : 'Manage'}
          </button>
          <Link to="/create" className="btn-primary" style={{ whiteSpace: 'nowrap' }}>
            <Plus size={13} /> New content
          </Link>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div style={{ display: 'flex', gap: 6, borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: 12 }}>
        <button className={`lib-tab${activeTab === 'content' ? ' active' : ''}`} onClick={() => onTabChange('content')}>
          <Clock size={12} />
          Recent Content
          {total > 0 && <span style={{ fontSize: 10, opacity: 0.6, fontFamily: "var(--font-mono)" }}>{total}</span>}
        </button>
        <button className={`lib-tab${activeTab === 'templates' ? ' active' : ''}`} onClick={() => onTabChange('templates')}>
          <BookMarked size={12} />
          Saved Templates
          {templateCount > 0 && <span style={{ fontSize: 10, opacity: 0.6, fontFamily: "var(--font-mono)" }}>{templateCount}</span>}
        </button>
      </div>
    </>
  );
}
