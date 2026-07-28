import { useNavigate } from 'react-router-dom';
import { RotateCcw, Copy, Download, ChevronLeft, Zap, Check } from 'lucide-react';
import { platNames } from '../constants';
import { StatusDisplay } from './StatusDisplay';
import { Button } from '../../../components/Button';
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

// WHY unused params kept in the signature: content/jobId/isCarousel/social are part of
// this component's stable prop contract (passed by Result.tsx) but not currently read in
// the body — prefixed with `_` rather than dropped from Props to avoid changing the public
// interface without tracing every caller's intent.
export function ResultHeader({ jobData, content: _content, jobId: _jobId, isDone, regenerating, isCarousel: _isCarousel, copied, onCopyAll, onExport, onRegenerate, criticResult, currentStage, progress, onOpenActions, social: _social }: Props) {
  const navigate = useNavigate();

  const platform = (jobData?.platform && platNames[jobData.platform]) || jobData?.platform || '';
  const audience = jobData?.targetAudience || '';
  const tone     = jobData?.tone || '';

  return (
    <>
      <div className="rp-hd">
        {/* Breadcrumb */}
        <div className="rp-breadcrumb">
          <button onClick={() => navigate('/library')}>
            <ChevronLeft size={8} /> History
          </button>
          <span className="rp-breadcrumb-sep">/</span>
          <span>Result</span>
          {isDone && !regenerating && <span className="rp-badge rp-badge-done" style={{ marginLeft: 6, display: 'inline-flex', alignItems: 'center', gap: 4 }}><Check size={9} /> Done</span>}
          {((!isDone) || regenerating) && (
            <span className="rp-badge rp-badge-gen" style={{ marginLeft: 6 }}>
              <span className="rp-badge-dot" style={{ animation: 'rp-pulse 1.2s infinite' }} />
              Generating
            </span>
          )}
        </div>

        {/* Full-width title */}
        <div className="rp-title">
          <div className="rp-eyebrow">
            <span style={{ width: 16, height: 1, background: 'linear-gradient(90deg,#F59E0B,transparent)', display: 'inline-block' }} />
            Content Result
          </div>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: 'clamp(24px,4vw,48px)', fontWeight: 700, color: 'rgba(255,255,255,0.96)', lineHeight: 1.15, margin: '4px 0 0', letterSpacing: '-0.5px' }}>
            {jobData?.topic || 'Generating content…'}
          </h1>
        </div>

        {/* Status display: stage, progress bar, quality tier */}
        <StatusDisplay
          isDone={isDone}
          regenerating={regenerating}
          currentStage={currentStage}
          progress={progress}
          criticResult={criticResult}
        />

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
