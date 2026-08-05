import { useState } from 'react';
import { Bookmark, ChevronDown, ChevronUp, Smartphone, X } from 'lucide-react';
import { platformMeta } from '../../lib/platformMeta';
import { timeAgo } from '../../lib/utils';
import type { IdeatedIdea, SavedIdea } from '../../store';

interface SavedIdeasSectionProps {
  savedIdeas: SavedIdea[];
  onUse: (idea: IdeatedIdea) => void;
  onRemove: (title: string) => void;
}

export function SavedIdeasSection({ savedIdeas, onUse, onRemove }: SavedIdeasSectionProps) {
  const [expanded, setExpanded] = useState(false);

  if (savedIdeas.length === 0) return null;

  return (
    <div style={{
      background: 'var(--bg-raised)', border: '1px solid var(--rule)',
      borderRadius: 13, marginBottom: 20, overflow: 'hidden',
    }}>
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 16px', background: 'transparent', border: 'none', cursor: 'pointer',
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
          <Bookmark size={14} color="var(--accent)" />
          Saved ideas ({savedIdeas.length})
        </span>
        {expanded ? <ChevronUp size={16} color="var(--text-muted)" /> : <ChevronDown size={16} color="var(--text-muted)" />}
      </button>

      {expanded && (
        <div style={{ padding: '0 16px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {savedIdeas.map((idea) => {
            const meta = platformMeta[idea.platform] || { label: idea.platform, Icon: Smartphone, color: '#8B5CF6', bg: 'rgba(139,92,246,0.10)' };
            return (
              <div
                key={idea.title}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  border: '1px solid var(--rule)', borderRadius: 10, padding: '10px 12px',
                }}
              >
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  background: meta.bg, border: `1px solid ${meta.color}28`,
                  borderRadius: 20, padding: '2px 8px', fontSize: 10, fontWeight: 600,
                  color: meta.color, flexShrink: 0,
                }}>
                  <meta.Icon size={9} /> {meta.label}
                </span>
                <button
                  type="button"
                  onClick={() => onUse(idea)}
                  style={{
                    flex: 1, minWidth: 0, textAlign: 'left', background: 'transparent', border: 'none',
                    cursor: 'pointer', fontSize: 13, color: 'var(--text-primary)', fontWeight: 500,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}
                  title={idea.title}
                >
                  {idea.title}
                </button>
                <span style={{ fontSize: 10.5, color: 'var(--text-muted)', flexShrink: 0 }}>
                  {timeAgo(idea.savedAt)}
                </span>
                <button
                  type="button"
                  aria-label="Remove saved idea"
                  title="Remove saved idea"
                  onClick={() => onRemove(idea.title)}
                  style={{ background: 'transparent', border: 'none', padding: 4, cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', flexShrink: 0 }}
                >
                  <X size={13} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
