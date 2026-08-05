import { Link } from 'react-router-dom';
import { RotateCcw, Copy, Download, Zap, ChevronLeft, ExternalLink } from 'lucide-react';
import { platNames } from '../constants';
import { Button } from '../../../components/Button';
import { QualityTierBadge } from '../../../components/QualityTierBadge';
import { isSafeHttpUrl } from '../../../lib/utils';
import type { ContentJob, CriticResult } from '../../../types/job';
import type { SocialConnection } from '../../../types/api';
import type { ResultContent } from './ContentColumn';

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
  onOpenActions:  () => void;
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
export function ResultHeader({ jobData, content: _content, jobId: _jobId, isDone, regenerating, isCarousel: _isCarousel, copied, onCopyAll, onExport, onRegenerate, criticResult, currentStage, progress, onOpenActions, social: _social }: Props) {
  const platform = (jobData?.platform && platNames[jobData.platform]) || jobData?.platform || '';
  const audience = jobData?.targetAudience || '';
  const tone     = jobData?.tone || '';
  const sourceUrl = jobData?.sourceUrl && isSafeHttpUrl(jobData.sourceUrl) ? jobData.sourceUrl : null;

  return (
    <>
      <div className="rp-hd">
        {/* Breadcrumb back-link to Library */}
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

        {/* Full-width title */}
        <div className="rp-title" style={{ display: 'flex', alignItems: 'flex-start', gap: 14, flexWrap: 'wrap' }}>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: 'clamp(24px,4vw,48px)', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.15, margin: '4px 0 0', letterSpacing: '-0.5px', flex: '1 1 auto' }}>
            {jobData?.topic || 'Generating content…'}
          </h1>
          {/* Header-level status summary: quality tier once scored, or the
              current pipeline stage while still in progress. */}
          {isDone && !regenerating && criticResult ? (
            <QualityTierBadge score={criticResult.totalScore} size="md" />
          ) : !isDone && currentStage ? (
            <span
              className="badge badge-blue"
              style={{ fontSize: 10.5, fontFamily: 'var(--font-mono)', textTransform: 'capitalize', flexShrink: 0, marginTop: 8 }}
            >
              {currentStage} {progress > 0 ? `· ${progress}%` : ''}
            </span>
          ) : null}
        </div>

        {/* Repurpose lineage — only present on jobs created from Repurpose's
            "paste a URL" flow (see routes/content/repurpose.ts's sourceUrl). */}
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

        {/* Bottom row: meta pills + toolbar */}
        <div className="rp-hd-bottom">
          <div className="rp-meta-pills">
            {platform && <span className="badge badge-gold"   style={{ fontSize: 10 }}>{platform}</span>}
            {audience && <span className="badge badge-purple" style={{ fontSize: 10 }}>{audience}</span>}
            {tone     && <span className="badge badge-blue"   style={{ fontSize: 10, textTransform: 'capitalize' }}>{tone}</span>}
          </div>

          {isDone && !regenerating && (
            <div className="rp-toolbar">
              <div className="rp-toolbar-group">
                <Button variant="secondary" size="sm" icon={<Copy size={10} />} onClick={onCopyAll}>
                  {copied ? 'Copied!' : 'Copy'}
                </Button>
                <Button variant="secondary" size="sm" icon={<RotateCcw size={10} />} onClick={() => onRegenerate()}>
                  Regen
                </Button>
              </div>

              <div className="rp-toolbar-sep" />

              {/* Single Export button opens the modal for all formats */}
              <div className="rp-toolbar-group">
                <Button variant="primary" size="sm" icon={<Download size={10} />} onClick={onExport}>
                  Export
                </Button>
              </div>

              <div className="rp-toolbar-sep" />

              <div className="rp-toolbar-group">
                <Button variant="secondary" size="sm" icon={<Zap size={10} />} onClick={onOpenActions}>
                  Actions
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
