import { useState, useRef } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { useQuery } from '@tanstack/react-query';
import { Copy, Plus, RefreshCw } from 'lucide-react';
import { Button } from '../../../../components/Button';
import { researchHashtags } from '../../../../api';
import { useIsMountedRef, useTrackedTimeout } from '../../../../hooks/useTrackedTimeout';
import type { ContentJob, PlatformContent } from '../../../../types/job';
import type { ResultContent } from '../ContentColumn';

interface Props {
  jobData:  ContentJob | null;
  content:  ResultContent | undefined;
  onClose:  () => void;
  /** Merge researched tags into the final caption/post and persist (F8). */
  onInsertHashtags?: (tags: string[]) => Promise<void>;
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
  const { isLoaded: authLoaded, isSignedIn, userId } = useAuth();
  const [inserting, setInserting] = useState(false);
  // WHY: ref + inserting: inserting alone races a second click before re-render (Create pattern).
  const insertingRef = useRef(false);
  const [insertMsg, setInsertMsg] = useState('');
  const [insertError, setInsertError] = useState('');
  const [copied, setCopied] = useState(false);
  const isMountedRef = useIsMountedRef();
  const trackedTimeout = useTrackedTimeout();

  // WHY: React Query (not mount useEffect + useState): server state needs cache/
  // dedupe across remounts of the drawer; remount previously re-hit the LLM.
  const hashtagContent = content as unknown as PlatformContent | PlatformContent[] | undefined;
  // WHY: require jobData.id — after account switch jobData is cleared until
  // ownership revalidation succeeds; do not research against a stale body.
  const jobReady = Boolean(jobData?.id && jobData.topic && jobData.platform);
  const hashtagsQuery = useQuery({
    queryKey: ['hashtags', userId ?? 'anon', jobData?.id, jobData?.topic, jobData?.platform],
    queryFn: () => researchHashtags({
      topic: jobData!.topic,
      platform: jobData!.platform,
      content: hashtagContent,
    }),
    enabled: authLoaded && isSignedIn && jobReady,
    staleTime: 5 * 60 * 1000,
  });

  const data = hashtagsQuery.data ?? null;
  const loading = hashtagsQuery.isLoading || hashtagsQuery.isFetching;
  const error = insertError
    || (hashtagsQuery.isError ? 'Failed to research hashtags — please try again.' : '');

  async function handleInsertAll(): Promise<void> {
    if (!data || !onInsertHashtags || inserting || insertingRef.current) return;
    const tags = [...(data.broad || []), ...(data.niche || []), ...(data.branded || [])]
      .map((t) => t.trim())
      .filter(Boolean);
    if (tags.length === 0) return;
    insertingRef.current = true;
    setInserting(true);
    setInsertMsg('');
    setInsertError('');
    try {
      await onInsertHashtags(tags);
      if (!isMountedRef.current) return;
      setInsertMsg(`Added ${tags.length} hashtags to your post.`);
    } catch {
      if (!isMountedRef.current) return;
      setInsertMsg('');
      setInsertError('Could not save hashtags — please try again.');
    } finally {
      insertingRef.current = false;
      if (isMountedRef.current) setInserting(false);
    }
  }

  function copyAll(): void {
    if (!data) return;
    const all = [...(data.broad || []), ...(data.niche || []), ...(data.branded || [])].join(' ');
    navigator.clipboard.writeText(all).then(() => {
      setCopied(true);
      trackedTimeout.set(() => setCopied(false), 1800);
    }).catch(() => {});
  }

  const showInsert = Boolean(onInsertHashtags && canInsertInto(jobData?.platform) && data);

  return (
    <div className="rp-hashtag-panel">
      {loading && !data && (
        <div className="rp-panel-status">
          <span className="rp-panel-spinner" aria-hidden />
          <span>Researching hashtags…</span>
        </div>
      )}

      {!loading && error && (
        <div className="rp-panel-banner rp-panel-banner-error">
          <span>{error}</span>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              setInsertError('');
              hashtagsQuery.refetch().catch(() => {});
            }}
          >
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
                onClick={() => { hashtagsQuery.refetch().catch(() => {}); }}
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
                        key={`${key}-${tag}`}
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
                  onClick={() => { hashtagsQuery.refetch().catch(() => {}); }}
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
