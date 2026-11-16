// WHY: extracted from Repurpose.tsx to stay under the 400-line cap.
// Single-URL input by default; batchMode swaps in a multi-URL textarea.
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
  const batchLineCount = batchUrls.split('\n').filter(l => l.trim().length > 0).length;
  // WHY: empty batch still shows "1" so the toggle doesn't read "Batch (0 URLs)",
  // but plural must use that same display count — raw 0 made "Batch (1 URLs)".
  const batchDisplayCount = batchLineCount || 1;
  const MAX_BATCH_LINES = 50;

  const handleBatchUrlsChange = (value: string) => {
    const lines = value.split('\n');
    if (lines.length > MAX_BATCH_LINES) {
      const truncated = lines.slice(0, MAX_BATCH_LINES).join('\n');
      onBatchUrlsChange(truncated);
    } else {
      onBatchUrlsChange(value);
    }
  };

  return (
    // WHY: 12 (was 24) — less gap before Target Platform so platform + submit
    // stay in the first viewport without the form scrolling.
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1 }}>
          Source URL{batchMode ? 's' : ''}
        </label>
        <button
          type="button"
          className="repurpose-mode-toggle"
          onClick={onToggleBatchMode}
          disabled={loading}
          style={{
            fontSize: 10.5, fontFamily: 'var(--font-mono)', padding: '8px 12px', borderRadius: 20,
            border: `1px solid ${batchMode ? 'color-mix(in srgb, var(--accent-2) 35%, transparent)' : 'var(--rule)'}`,
            background: batchMode ? 'color-mix(in srgb, var(--accent-2) 8%, transparent)' : 'transparent',
            color: batchMode ? 'var(--accent-2)' : 'var(--text-muted)',
            cursor: loading ? 'not-allowed' : 'pointer', transition: 'all .15s',
            minHeight: 44, boxSizing: 'border-box',
          }}
        >
          {batchMode
            ? `Batch (${batchDisplayCount} URL${batchDisplayCount !== 1 ? 's' : ''})`
            : 'Switch to Batch'}
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
