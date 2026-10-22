import { useState, useEffect } from 'react';
import { Copy, Plus, RefreshCw } from 'lucide-react';
import { Button } from '../../../../components/Button';
import { researchHashtags } from '../../../../api';
import { useIsMountedRef } from '../../../../hooks/useTrackedTimeout';
import type { ContentJob, PlatformContent } from '../../../../types/job';
import type { ResultContent } from '../ContentColumn';

interface Props {
  jobData:  ContentJob | null;
  content:  ResultContent | undefined;
  onClose:  () => void;
  /** Merge researched tags into the final caption/post and persist (F8). */
  onInsertHashtags?: (tags: string[]) => Promise<void>;
}

interface HashtagResearch {
  broad: string[];
  niche: string[];
  branded: string[];
  strategy: string;
  reachTier?: 'large' | 'medium' | 'niche';
}

const tiers: { label: string; key: 'broad' | 'niche' | 'branded'; color: string }[] = [
  { label: 'Broad', key: 'broad', color: '#60A5FA' },
  { label: 'Niche', key: 'niche', color: '#22D3EE' },
  { label: 'Branded', key: 'branded', color: '#A78BFA' },
];

function canInsertInto(platform: string | undefined): boolean {
  return platform === 'linkedin_post' || platform === 'instagram_caption';
}

export function HashtagPanel({ jobData, content, onClose: _onClose, onInsertHashtags }: Props) {
  const [data, setData]       = useState<HashtagResearch | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [inserting, setInserting] = useState(false);
  const [insertMsg, setInsertMsg] = useState('');
  const [copied, setCopied] = useState(false);
  const isMountedRef = useIsMountedRef();

  function fetchHashtags(): void {
    if (!jobData) return;
    setLoading(true);
    setError('');
    const hashtagContent = content as unknown as PlatformContent | PlatformContent[] | undefined;
    researchHashtags({ topic: jobData.topic, platform: jobData.platform, content: hashtagContent })
      .then((result) => {
        if (!isMountedRef.current) return;
        setData(result);
      })
      .catch(() => {
        if (!isMountedRef.current) return;
        setError('Failed to research hashtags — please try again.');
      })
      .finally(() => {
        if (!isMountedRef.current) return;
        setLoading(false);
      });
  }

  useEffect(() => {
    if (!jobData || data || loading) return;
    const t = setTimeout(fetchHashtags, 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleInsertAll(): Promise<void> {
    if (!data || !onInsertHashtags) return;
    const tags = [...(data.broad || []), ...(data.niche || []), ...(data.branded || [])]
      .map((t) => t.trim())
      .filter(Boolean);
    if (tags.length === 0) return;
    setInserting(true);
    setInsertMsg('');
    try {
      await onInsertHashtags(tags);
      if (!isMountedRef.current) return;
      setInsertMsg(`Added ${tags.length} hashtags to your post.`);
    } catch {
      if (!isMountedRef.current) return;
      setInsertMsg('');
      setError('Could not save hashtags — please try again.');
    } finally {
      if (isMountedRef.current) setInserting(false);
    }
  }

  function copyAll(): void {
    if (!data) return;
    const all = [...(data.broad || []), ...(data.niche || []), ...(data.branded || [])].join(' ');
    navigator.clipboard.writeText(all).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    }).catch(() => {});
  }

  const showInsert = Boolean(onInsertHashtags && canInsertInto(jobData?.platform) && data);

  return (
    <div className="rp-hashtag-panel">
      {loading && (
        <div className="rp-panel-status">
          <span className="rp-panel-spinner" aria-hidden />
          <span>Researching hashtags…</span>
        </div>
      )}

      {!loading && error && (
        <div className="rp-panel-banner rp-panel-banner-error">
          <span>{error}</span>
          <Button variant="secondary" size="sm" onClick={fetchHashtags}>
            Retry
          </Button>
        </div>
      )}

      {data && (
        <div className="rp-hashtag-tiers">
          {tiers.every(({ key }) => (data[key] || []).length === 0) ? (
            <div className="rp-panel-empty">
              <p className="rp-panel-empty-title">No hashtags found</p>
              <p className="rp-panel-empty-blurb">
                Try Refresh, or regenerate the draft with a more specific topic.
              </p>
              <Button
                variant="secondary"
                size="sm"
                icon={<RefreshCw size={12} />}
                onClick={fetchHashtags}
                disabled={loading}
              >
                Refresh
              </Button>
            </div>
          ) : (
            <>
              {tiers.map(({ label, key, color }) => (
                <section key={key} className="rp-hashtag-tier">
                  <h3 className="rp-hashtag-tier-label">{label}</h3>
                  <div className="rp-hashtag-chips">
                    {(data[key] || []).map((tag: string) => (
                      <button
                        key={tag}
                        type="button"
                        className="rp-hashtag-chip"
                        style={{
                          color,
                          background: `${color}14`,
                          borderColor: `${color}30`,
                        }}
                        title="Click to copy"
                        onClick={() => {
                          navigator.clipboard.writeText(tag).catch(() => {});
                        }}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </section>
              ))}

              {data.strategy && (
                <p className="rp-hashtag-strategy">{data.strategy}</p>
              )}

              <div className="rp-panel-actions">
                <Button
                  variant="secondary"
                  size="sm"
                  icon={<Copy size={12} />}
                  onClick={copyAll}
                >
                  {copied ? 'Copied' : 'Copy all'}
                </Button>
                {showInsert && (
                  <Button
                    variant="primary"
                    size="sm"
                    icon={<Plus size={12} />}
                    disabled={inserting}
                    loading={inserting}
                    onClick={() => { void handleInsertAll(); }}
                  >
                    Add to post
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  icon={<RefreshCw size={12} />}
                  onClick={fetchHashtags}
                  disabled={loading}
                >
                  Refresh
                </Button>
              </div>

              {insertMsg && (
                <p className="rp-panel-success" role="status">{insertMsg}</p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
