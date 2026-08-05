import { Plus, Trash2, Sparkles, AlertCircle } from 'lucide-react';
import { Dropdown } from '../../components/Dropdown';
import { platforms } from './platforms';

export interface BatchRow {
  id: string;
  topic: string;
  platform: string;
}

const PLATFORM_OPTIONS = platforms.map((p) => ({ value: p.id, label: p.label }));
export const MAX_BATCH_ROWS = 7;

interface BatchTopicListProps {
  rows: BatchRow[];
  onRowsChange: (rows: BatchRow[]) => void;
  tone: string;
  onToneChange: (tone: string) => void;
  targetAudience: string;
  onTargetAudienceChange: (audience: string) => void;
  loading: boolean;
  errorMsg: string;
  onSubmit: () => void;
}

// WHY a flat list of topic+platform rows, not reusing TopicStep's full platform
// card grid per row: TopicStep's grid is designed for one big decision on a full
// page; up to 7 of those stacked would be an enormous scroll. A compact dropdown
// per row (same Dropdown component IdeateControls.tsx already uses for platform
// filters) keeps the whole batch visible at once, which matters when the user is
// comparing/editing several rows together before submitting.
export function BatchTopicList({
  rows, onRowsChange, tone, onToneChange, targetAudience, onTargetAudienceChange,
  loading, errorMsg, onSubmit,
}: BatchTopicListProps) {
  function updateRow(id: string, patch: Partial<BatchRow>): void {
    onRowsChange(rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  function addRow(): void {
    if (rows.length >= MAX_BATCH_ROWS) return;
    onRowsChange([...rows, { id: crypto.randomUUID(), topic: '', platform: 'instagram_carousel' }]);
  }

  function removeRow(id: string): void {
    onRowsChange(rows.filter((r) => r.id !== id));
  }

  const validRowCount = rows.filter((r) => r.topic.trim().length >= 3).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {rows.map((row, i) => (
          <div
            key={row.id}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              background: 'var(--bg-raised)', border: '1px solid var(--rule)',
              borderRadius: 11, padding: '10px 12px',
            }}
          >
            <div style={{
              width: 24, height: 24, borderRadius: 7, flexShrink: 0,
              background: 'color-mix(in srgb, var(--accent) 8%, transparent)',
              border: '1px solid color-mix(in srgb, var(--accent) 16%, transparent)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--accent)', fontWeight: 600,
            }}>
              {i + 1}
            </div>
            <input
              className="input"
              value={row.topic}
              onChange={(e) => updateRow(row.id, { topic: e.target.value })}
              maxLength={250}
              placeholder="Topic for this post…"
              style={{ flex: 1, minWidth: 0 }}
            />
            <div style={{ flexShrink: 0 }}>
              <Dropdown
                value={row.platform}
                options={PLATFORM_OPTIONS}
                onChange={(v) => updateRow(row.id, { platform: v })}
                label="Platform"
                size="sm"
              />
            </div>
            <button
              type="button"
              aria-label="Remove this topic"
              title="Remove this topic"
              onClick={() => removeRow(row.id)}
              disabled={rows.length <= 1}
              style={{
                flexShrink: 0, background: 'transparent', border: 'none', borderRadius: 6, padding: 6,
                color: rows.length <= 1 ? 'color-mix(in srgb, var(--text-muted) 40%, transparent)' : 'var(--text-muted)',
                cursor: rows.length <= 1 ? 'not-allowed' : 'pointer', display: 'flex',
              }}
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={addRow}
        disabled={rows.length >= MAX_BATCH_ROWS}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 6, alignSelf: 'flex-start',
          background: 'transparent', border: '1px dashed var(--rule)', borderRadius: 9,
          padding: '8px 14px', color: rows.length >= MAX_BATCH_ROWS ? 'var(--text-muted)' : 'var(--accent)',
          fontSize: 12.5, fontWeight: 600, cursor: rows.length >= MAX_BATCH_ROWS ? 'not-allowed' : 'pointer',
        }}
      >
        <Plus size={13} /> Add topic {rows.length >= MAX_BATCH_ROWS ? `(max ${MAX_BATCH_ROWS})` : `(${rows.length}/${MAX_BATCH_ROWS})`}
      </button>

      {/* Shared tone/audience — applied to every row that doesn't need per-row
          overrides; the server schema (POST /jobs/batch) already accepts these
          as batch-level defaults. */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }} className="batch-shared-grid">
        <div>
          <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 6, fontFamily: 'var(--font-mono)' }}>
            Tone (applies to all)
          </label>
          <input
            className="input"
            value={tone}
            onChange={(e) => onToneChange(e.target.value)}
            placeholder="e.g. professional"
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 6, fontFamily: 'var(--font-mono)' }}>
            Target audience (applies to all)
          </label>
          <input
            className="input"
            value={targetAudience}
            onChange={(e) => onTargetAudienceChange(e.target.value)}
            placeholder="e.g. small business owners"
          />
        </div>
      </div>

      {errorMsg && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: 'var(--color-error)' }}>
          <AlertCircle size={13} /> {errorMsg}
        </div>
      )}

      <button
        type="button"
        className="btn-primary"
        onClick={onSubmit}
        disabled={loading || validRowCount === 0}
        style={{ alignSelf: 'flex-start' }}
      >
        {loading ? (
          <>
            <div style={{ width: 16, height: 16, border: '2px solid color-mix(in srgb, var(--on-accent) 20%, transparent)', borderTopColor: 'var(--on-accent)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
            Generating {validRowCount} posts…
          </>
        ) : (
          <><Sparkles size={14} /> Generate {validRowCount || ''} {validRowCount === 1 ? 'post' : 'posts'}</>
        )}
      </button>

      <style>{`
        @media (max-width: 480px) {
          .batch-shared-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
