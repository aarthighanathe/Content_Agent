import { useState, useEffect } from 'react';
import { Copy, X } from 'lucide-react';
import { researchHashtags } from '../../../../api';
import type { ContentJob, PlatformContent } from '../../../../types/job';
import type { ResultContent } from '../ContentColumn';

interface Props {
  jobData:  ContentJob | null;
  content:  ResultContent | undefined;
  onClose:  () => void;
}

interface HashtagResearch {
  broad: string[];
  niche: string[];
  branded: string[];
  strategy: string;
  reachTier?: 'large' | 'medium' | 'niche';
}

const tiers: { label: string; key: 'broad' | 'niche' | 'branded'; color: string }[] = [
  { label: 'Broad (1M+ posts)', key: 'broad',   color: '#60A5FA' },
  { label: 'Niche (10K–500K)',  key: 'niche',   color: '#22D3EE' },
  { label: 'Branded / Unique',  key: 'branded', color: '#A78BFA' },
];

export function HashtagPanel({ jobData, content, onClose }: Props) {
  const [data, setData]       = useState<HashtagResearch | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  function fetchHashtags() {
    if (!jobData) return;
    setLoading(true);
    setError('');
    // WHY unknown->PlatformContent cast: researchHashtags' content param predates carousel/
    // video-script hashtag research; content is forwarded to the server as-is regardless
    // of exact shape (same rationale as the identical cast in useSocial.ts/PostPanel.tsx).
    const hashtagContent = content as unknown as PlatformContent | PlatformContent[] | undefined;
    researchHashtags({ topic: jobData.topic, platform: jobData.platform, content: hashtagContent })
      .then(setData)
      .catch(() => setError('Failed to research hashtags — please try again.'))
      .finally(() => setLoading(false));
  }

  // WHY []: HashtagPanel is only ever rendered behind `activeTab === 'hashtags' &&`
  // in ActionDrawer.tsx, so React fully unmounts/remounts it each time the user
  // leaves and returns to this tab — jobData/content are fixed for the lifetime of
  // a single mount (the Result page doesn't swap jobs while the drawer is open).
  // A real dependency array (jobData, content, fetchHashtags) would re-fire this
  // effect on every parent re-render that produces a new `content` object identity,
  // re-triggering a paid hashtag-research API call the user never asked for.
  useEffect(() => {
    if (!jobData || data || loading) return;
    const t = setTimeout(fetchHashtags, 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={{ width: '100%', maxWidth: 500, background: 'rgba(34,211,238,0.04)', border: '1px solid rgba(34,211,238,0.18)', borderRadius: 10, padding: '14px 16px', animation: 'rp-fadeUp .2s ease both' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase', color: 'rgba(34,211,238,0.7)' }}>Hashtag Research</div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}><X size={14} /></button>
      </div>

      {loading && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0' }}>
          <div style={{ width: 12, height: 12, border: '1.5px solid rgba(34,211,238,0.3)', borderTopColor: '#22D3EE', borderRadius: '50%', animation: 'rp-spin .7s linear infinite', flexShrink: 0 }} />
          <span style={{ fontSize: 12, color: 'rgba(34,211,238,0.7)' }}>Researching hashtags…</span>
        </div>
      )}

      {!loading && error && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '8px 0' }}>
          <span style={{ fontSize: 12, color: 'var(--color-error)' }}>{error}</span>
          <button onClick={fetchHashtags} style={{ background: 'rgba(34,211,238,0.1)', border: '1px solid rgba(34,211,238,0.25)', borderRadius: 7, padding: '5px 11px', color: '#22D3EE', fontSize: 11.5, fontWeight: 600, cursor: 'pointer', flexShrink: 0 }}>
            Retry
          </button>
        </div>
      )}

      {data && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {tiers.map(({ label, key, color }) => (
            <div key={key}>
              <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.8 }}>{label}</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                {(data[key] || []).map((tag: string) => (
                  <button key={tag} onClick={() => { navigator.clipboard.writeText(tag).catch(() => {}); }} title="Click to copy"
                    style={{ background: `${color}12`, border: `1px solid ${color}28`, borderRadius: 20, padding: '3px 10px', fontSize: 11.5, color, cursor: 'pointer', transition: 'all .15s' }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = `${color}22`; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = `${color}12`; }}
                  >{tag}</button>
                ))}
              </div>
            </div>
          ))}
          {data.reachTier && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Reach tier: {data.reachTier}</div>}
          {data.strategy && <p style={{ fontSize: 11.5, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.6, borderTop: '1px solid var(--rule)', paddingTop: 8 }}>{data.strategy}</p>}
          <button onClick={() => { const all = [...(data.broad || []), ...(data.niche || []), ...(data.branded || [])].join(' '); navigator.clipboard.writeText(all).catch(() => {}); }} style={{ alignSelf: 'flex-start', display: 'inline-flex', alignItems: 'center', gap: 5, background: 'rgba(34,211,238,0.1)', border: '1px solid rgba(34,211,238,0.25)', borderRadius: 7, padding: '6px 12px', color: '#22D3EE', fontSize: 11.5, fontWeight: 600, cursor: 'pointer' }}>
            <Copy size={10} /> Copy all hashtags
          </button>
        </div>
      )}
    </div>
  );
}
