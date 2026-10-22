import { Link } from 'react-router-dom';
import { RotateCcw, Copy, Download, ChevronLeft, ExternalLink, History, PenLine, Send, Hash, Layers } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { platNames } from '../constants';
import { Button } from '../../../components/Button';
import { QualityTierBadge } from '../../../components/QualityTierBadge';
import { isSafeHttpUrl } from '../../../lib/utils';
import { getJobVersions } from '../../../api';
import type { ContentJob, CriticResult } from '../../../types/job';
import type { SocialConnection } from '../../../types/api';
import type { ResultContent } from './ContentColumn';
import type { ActionTab } from './ActionDrawer';

interface Props {
  jobData:        ContentJob | null;
  content:        ResultContent | undefined;
  jobId?:         string;
  isDone:         boolean;
  regenerating:   boolean;
  isCarousel:     boolean;
  copied:         boolean;
  onCopyAll:      () => void;
  onExport:       () => void;
  onRegenerate:   (feedback?: string) => void;
  criticResult:   CriticResult | null | undefined;
  currentStage:   string;
  progress:       number;
  onOpenPanel:    (tab: ActionTab) => void;
  onToggleAdapt:  () => void;
  /** Highlights the open tool in the strip while its panel is showing. */
  activePanel?:   ActionTab | null;
  social: {
    socialConnections: SocialConnection[];
    postingTo:         string | null;
    postResult:        Record<string, 'ok' | 'error'>;
    handlePostNow:     (platform: string) => void;
  };
}

// WHY content/isCarousel/social stay unread: they're part of this component's
// stable prop contract (passed by Result.tsx) but genuinely not needed here —
// prefixed with `_` rather than dropped from Props to avoid changing the
// public interface without tracing every caller's intent. criticResult/
// currentStage/progress ARE read below (quality-tier badge + in-progress
// stage label), restoring the header-level status summary StatusDisplay.tsx
// used to provide before its removal.
export function ResultHeader({
  jobData,
  content: _content,
  jobId,
  isDone,
  regenerating,
  isCarousel: _isCarousel,
  copied,
  onCopyAll,
  onExport,
  onRegenerate,
  criticResult,
  currentStage,
  progress,
  onOpenPanel,
  onToggleAdapt,
  activePanel = null,
  social: _social,
}: Props) {
  const platform = (jobData?.platform && platNames[jobData.platform]) || jobData?.platform || '';
  const audience = jobData?.targetAudience || '';
  const tone     = jobData?.tone || '';
  const sourceUrl = jobData?.sourceUrl && isSafeHttpUrl(jobData.sourceUrl) ? jobData.sourceUrl : null;

  // WHY only when done: versions are snapshots taken on regenerate — empty while
  // the first generation is still running. Header affordance opens the History panel.
  const versionsQuery = useQuery({
    queryKey: ['jobVersions', jobId],
    queryFn: () => getJobVersions(jobId as string),
    enabled: Boolean(jobId) && isDone && !regenerating,
    staleTime: 30_000,
  });
  const versionCount = versionsQuery.data?.versions?.length ?? 0;

  return (
    <>
      <div className="rp-hd">
        <Link
          to="/library"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            fontSize: 12, color: 'var(--text-muted)', textDecoration: 'none',
            marginBottom: 6,
          }}
        >
          <ChevronLeft size={13} /> Library
        </Link>

        <div className="rp-title" style={{ display: 'flex', alignItems: 'flex-start', gap: 14, flexWrap: 'wrap' }}>
          <h1 className="rp-topic" style={{ flex: '1 1 auto' }}>
            {jobData?.topic || 'Generating content…'}
          </h1>
          {isDone && !regenerating && criticResult ? (
            <QualityTierBadge score={criticResult.totalScore} size="md" />
          ) : !isDone && currentStage ? (
            <span
              className="badge badge-blue"
              style={{
                fontSize: 10.5,
                fontFamily: 'var(--font-mono)',
                textTransform: 'capitalize',
                flexShrink: 0,
                marginTop: 8,
              }}
            >
              {currentStage} {progress > 0 ? `· ${progress}%` : ''}
            </span>
          ) : null}
        </div>

        {sourceUrl && (
          <a
            href={sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 6,
              fontSize: 11.5, color: 'var(--text-muted)', textDecoration: 'none',
            }}
          >
            <ExternalLink size={11} /> Repurposed from: {sourceUrl}
          </a>
        )}

        {/* WHY two groups: Copy/Export/Regen are immediate. Rewrite/Post/Hashtags/
            History open one focused panel each — not a second tab strip that
            duplicated these same labels (the old drawer tabs). Adapt scrolls
            to the on-page section. */}
        <div className="rp-hd-bottom">
          {(platform || audience || tone) && (
            <p className="rp-meta" style={{ margin: 0 }}>
              {[platform, audience ? `for ${audience}` : '', tone ? `${tone} tone` : '']
                .filter(Boolean)
                .join(' · ')}
            </p>
          )}

          {isDone && !regenerating && (
            <div className="rp-toolbar">
              <div className="rp-toolbar-group">
                <Button variant="secondary" size="sm" icon={<Copy size={12} />} onClick={onCopyAll}>
                  {copied ? 'Copied' : 'Copy'}
                </Button>
                <Button variant="primary" size="sm" icon={<Download size={12} />} onClick={onExport}>
                  Export
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  icon={<RotateCcw size={12} />}
                  onClick={() => onRegenerate()}
                >
                  Regen
                </Button>
              </div>

              <div className="rp-toolbar-sep" aria-hidden />

              <div className="rp-toolbar-tools" role="toolbar" aria-label="Content tools">
                <button
                  type="button"
                  className={'rp-tool-btn' + (activePanel === 'feedback' ? ' on' : '')}
                  aria-pressed={activePanel === 'feedback'}
                  onClick={() => onOpenPanel('feedback')}
                >
                  <PenLine size={13} aria-hidden />
                  Rewrite
                </button>
                <button
                  type="button"
                  className={'rp-tool-btn' + (activePanel === 'post' ? ' on' : '')}
                  aria-pressed={activePanel === 'post'}
                  onClick={() => onOpenPanel('post')}
                >
                  <Send size={13} aria-hidden />
                  Post
                </button>
                <button
                  type="button"
                  className={'rp-tool-btn' + (activePanel === 'hashtags' ? ' on' : '')}
                  aria-pressed={activePanel === 'hashtags'}
                  onClick={() => onOpenPanel('hashtags')}
                >
                  <Hash size={13} aria-hidden />
                  Hashtags
                </button>
                <button
                  type="button"
                  className={'rp-tool-btn' + (activePanel === 'history' ? ' on' : '')}
                  aria-pressed={activePanel === 'history'}
                  onClick={() => onOpenPanel('history')}
                >
                  <History size={13} aria-hidden />
                  {versionCount > 0 ? `History (${versionCount})` : 'History'}
                </button>
              </div>

              <div className="rp-toolbar-sep" aria-hidden />

              <Button
                variant="secondary"
                size="sm"
                icon={<Layers size={12} />}
                onClick={onToggleAdapt}
              >
                Adapt
              </Button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
