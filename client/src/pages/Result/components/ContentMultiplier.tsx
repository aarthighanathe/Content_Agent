import { useEffect, useState, type CSSProperties } from 'react';
import { Instagram, Linkedin, XTwitter } from '../../../components/BrandIcons';
import {
  Sparkles, Check, AlertTriangle, Undo2, ExternalLink, RefreshCw, Clapperboard, Layers,
} from 'lucide-react';
import type { MultiplyEntry } from '../hooks/useMultiplier';
import type { ContentJob } from '../../../types/job';

const platforms = [
  { id: 'instagram_carousel', label: 'Instagram Carousel', short: 'Carousel', color: '#ec4899', Icon: Instagram },
  { id: 'linkedin_post',      label: 'LinkedIn Post',      short: 'LinkedIn', color: '#60a5fa', Icon: Linkedin },
  { id: 'twitter_thread',     label: 'Twitter Thread',     short: 'Twitter',  color: '#22d3ee', Icon: XTwitter },
  { id: 'instagram_caption',  label: 'Instagram Caption',  short: 'Caption',  color: '#a78bfa', Icon: Instagram },
  { id: 'video_script',       label: 'Video Script',       short: 'Video',    color: '#f97316', Icon: Clapperboard },
];

interface Props {
  jobData:      ContentJob | null;
  multiplyJobs: Record<string, MultiplyEntry>;
  onMultiply:   (platform: string) => void;
}

type RowKind = 'idle' | 'ready' | 'original' | 'working' | 'failed';

export function ContentMultiplier({ jobData, multiplyJobs, onMultiply }: Props) {
  const filtered = platforms.filter((p) => p.id !== jobData?.platform);
  const doneCount = Object.values(multiplyJobs).filter((j) => j.status === 'done').length;

  const [researchAgeDays, setResearchAgeDays] = useState<number | null>(null);
  useEffect(() => {
    if (!jobData?.createdAt) {
      setResearchAgeDays(null);
      return;
    }
    const created = new Date(jobData.createdAt).getTime();
    if (!Number.isFinite(created)) {
      setResearchAgeDays(null);
      return;
    }
    setResearchAgeDays(Math.floor((Date.now() - created) / 86_400_000));
  }, [jobData?.createdAt]);
  const isStale = researchAgeDays != null && researchAgeDays >= 7;

  return (
    <section id="rp-adapt" className="rp-side-card rp-adapt" aria-label="Adapt to another platform">
      <header className="rp-adapt-hd">
        <div className="rp-adapt-hd-top">
          <div className="rp-adapt-hd-icon" aria-hidden="true">
            <Layers size={14} />
          </div>
          <div className="rp-side-kicker">Adapt</div>
          {doneCount > 0 && (
            <span className="rp-adapt-badge">{doneCount} linked</span>
          )}
        </div>
        <p className="rp-side-help">
          Remix this research into another platform — Open jumps to a finished variant.
        </p>
      </header>

      {isStale && (
        <p className="rp-adapt-stale" role="status">
          <AlertTriangle size={13} aria-hidden="true" />
          <span>Research is {researchAgeDays} days old. Regen for fresher facts.</span>
        </p>
      )}

      <div className="rp-adapt-list" role="list">
        {filtered.map((p) => {
          const mj = multiplyJobs[p.id];
          const isOriginal =
            Boolean(mj?.isRoot) ||
            (p.id === jobData?.sourcePlatform && !!jobData?.sourceJobId);
          const openJobId =
            mj?.status === 'done' && mj.jobId
              ? mj.jobId
              : isOriginal && !mj?.jobId
                ? jobData?.sourceJobId
                : undefined;
          const isDone = Boolean(openJobId) || mj?.status === 'done';
          const isProc = mj?.status === 'processing';
          const isFailed = mj?.status === 'failed';
          const progress = mj?.progress ?? 15;

          let kind: RowKind = 'idle';
          if (isProc) kind = 'working';
          else if (isFailed) kind = 'failed';
          else if (isOriginal && isDone) kind = 'original';
          else if (isDone) kind = 'ready';

          const stateLabel =
            kind === 'working' ? `Working · ${progress}%`
            : kind === 'original' ? 'Original'
            : kind === 'ready' ? 'Ready to open'
            : kind === 'failed' ? 'Failed — retry'
            : 'Not started yet';

          const action =
            kind === 'working' ? 'Working'
            : kind === 'original' ? 'View'
            : kind === 'ready' ? 'Open'
            : kind === 'failed' ? 'Retry'
            : 'Adapt';

          return (
            <div
              key={p.id}
              role="listitem"
              className={`rp-adapt-tile rp-adapt-tile--${kind}`}
              style={{ '--adapt-accent': p.color } as CSSProperties}
            >
              <div className="rp-adapt-tile-icon" aria-hidden="true">
                <p.Icon size={16} color={p.color} />
              </div>
              <div className="rp-adapt-tile-copy">
                <div className="rp-adapt-name">{p.short}</div>
                <div className="rp-adapt-state">{stateLabel}</div>
                {kind === 'working' && (
                  <div className="rp-adapt-progress" aria-hidden="true">
                    <span style={{ width: `${Math.max(8, Math.min(100, progress))}%` }} />
                  </div>
                )}
              </div>
              {kind === 'ready' && (
                <span className="rp-adapt-check" aria-hidden="true">
                  <Check size={12} strokeWidth={2.5} />
                </span>
              )}
              <button
                type="button"
                className={`rp-adapt-go rp-adapt-go--${kind}`}
                aria-label={`${action} ${p.short}`}
                disabled={isProc}
                onClick={() => {
                  if (openJobId) {
                    window.open(`/result/${openJobId}`, '_blank', 'noopener,noreferrer');
                    return;
                  }
                  onMultiply(p.id);
                }}
              >
                {kind === 'working'
                  ? <RefreshCw size={12} className="rp-adapt-spin" />
                  : kind === 'original'
                    ? <Undo2 size={12} />
                    : kind === 'ready'
                      ? <ExternalLink size={12} />
                      : <Sparkles size={12} />}
                {action}
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}
