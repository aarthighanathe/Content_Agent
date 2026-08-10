// URL input section for Repurpose — split from Repurpose.tsx to stay under the 400-line rule.
// Renders either a single URL input (default) or a multi-URL textarea (batchMode).
import { Link2 } from 'lucide-react';

interface UrlInputProps {
  url: string;
  onUrlChange: (v: string) => void;
  batchMode: boolean;
  onToggleBatchMode: () => void;
  batchUrls: string;
  onBatchUrlsChange: (v: string) => void;
  loading: boolean;
}

export function UrlInput({
  url, onUrlChange, batchMode, onToggleBatchMode, batchUrls, onBatchUrlsChange, loading,
}: UrlInputProps) {
  // Count valid-looking lines for the batch count badge
  const batchLineCount = batchUrls.split('\n').filter(l => l.trim().length > 0).length;
  const MAX_BATCH_LINES = 50;

  // Handle batch URLs change with max-line guard
  const handleBatchUrlsChange = (value: string) => {
    const lines = value.split('\n');
    if (lines.length > MAX_BATCH_LINES) {
      // Truncate to max lines
      const truncated = lines.slice(0, MAX_BATCH_LINES).join('\n');
      onBatchUrlsChange(truncated);
    } else {
      onBatchUrlsChange(value);
    }
  };

  return (
    <div style={{ marginBottom: 24 }}>
      {/* Label row with single/batch toggle */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1 }}>
          Source URL{batchMode ? 's' : ''}
        </label>
        <button
          type="button"
          onClick={onToggleBatchMode}
          disabled={loading}
          style={{
            fontSize: 10.5, fontFamily: 'var(--font-mono)', padding: '3px 10px', borderRadius: 20,
            border: `1px solid ${batchMode ? 'color-mix(in srgb, var(--accent-2) 35%, transparent)' : 'var(--rule)'}`,
            background: batchMode ? 'color-mix(in srgb, var(--accent-2) 8%, transparent)' : 'transparent',
            color: batchMode ? 'var(--accent-2)' : 'var(--text-muted)',
            cursor: loading ? 'not-allowed' : 'pointer', transition: 'all .15s',
          }}
        >
          {batchMode ? `Batch (${batchLineCount || 1} URL${batchLineCount !== 1 ? 's' : ''})` : 'Switch to Batch'}
        </button>
      </div>

      {batchMode ? (
        <>
          <textarea
            className="raw-input-focus-visible"
            placeholder={'https://example.com/article-1\nhttps://example.com/article-2\nhttps://example.com/article-3'}
            value={batchUrls}
            onChange={e => handleBatchUrlsChange(e.target.value)}
            disabled={loading}
            rows={5}
            style={{
              width: '100%', boxSizing: 'border-box', resize: 'vertical',
              background: 'color-mix(in srgb, var(--text-primary) 3%, transparent)',
              border: '1px solid var(--rule)', borderRadius: 11, padding: '12px 14px',
              color: 'var(--color-text-primary)', fontSize: 13.5, fontFamily: 'var(--font-mono)',
              outline: 'none', transition: 'border-color .2s',
            }}
            onFocus={e => (e.target.style.borderColor = 'color-mix(in srgb, var(--accent) 35%, transparent)')}
            onBlur={e => (e.target.style.borderColor = 'var(--rule)')}
          />
          <p style={{ margin: '6px 0 0', fontSize: 11.5, color: 'var(--text-muted)' }}>
            One URL per line. Each URL generates a separate job — results open in Batch Results.
          </p>
        </>
      ) : (
        <>
          <div style={{ position: 'relative' }}>
            <Link2 size={15} color="var(--text-muted)" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
            <input
              className="raw-input-focus-visible"
              type="url"
              placeholder="https://example.com/article-or-blog-post"
              value={url}
              onChange={e => onUrlChange(e.target.value)}
              disabled={loading}
              style={{
                width: '100%', boxSizing: 'border-box',
                background: 'color-mix(in srgb, var(--text-primary) 3%, transparent)',
                border: '1px solid var(--rule)', borderRadius: 11, padding: '12px 14px 12px 40px',
                color: 'var(--color-text-primary)', fontSize: 14, outline: 'none', transition: 'border-color .2s',
              }}
              onFocus={e => (e.target.style.borderColor = 'color-mix(in srgb, var(--accent) 35%, transparent)')}
              onBlur={e => (e.target.style.borderColor = 'var(--rule)')}
            />
          </div>
          <p style={{ margin: '6px 0 0', fontSize: 11.5, color: 'var(--text-muted)' }}>
            Supports: blog posts, Medium articles, newsletters
          </p>
        </>
      )}
    </div>
  );
}
