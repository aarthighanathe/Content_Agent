import { useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import './Result/Result.css';
import { useJobData }    from './Result/hooks/useJobData';
import { useExport }     from './Result/hooks/useExport';
import { useMultiplier } from './Result/hooks/useMultiplier';
import { useSocial }     from './Result/hooks/useSocial';
import { updateJobContent } from '../api';
import { ResultHeader }   from './Result/components/ResultHeader';
import { LoadingView }    from './Result/components/LoadingView';
import { ErrorState }     from '../components/ErrorState';
import { ContentColumn }  from './Result/components/ContentColumn';
import type { ResultContent } from './Result/components/ContentColumn';
import { InsightsSidebar } from './Result/components/InsightsSidebar';
import { ActionDrawer }   from './Result/components/ActionDrawer';
import { ExportModal }    from './Result/components/ExportModal';
import { useCarouselDesignSeed } from './Result/hooks/useCarouselDesignSeed';
import { deriveColorSystem, THEME_ACCENTS } from '../lib/colorSystem';
import { useQuery } from '@tanstack/react-query';
import { getProfile } from '../api';
import { Copy, RotateCcw, Download, MoreHorizontal } from 'lucide-react';
import type { CriticResult, PlatformContent } from '../types/job';
import type { SlideData } from './Result/components/content/carousel/IGSlide';

type ActionTab = 'feedback' | 'post' | 'hashtags' | 'template' | null;

// WHY guard instead of trusting JobOutput.content: `content: unknown` (job.ts) varies by
// outputType; a 'critique' output's content is a CriticResult object with these fields —
// narrow before use rather than casting, matching the historyHelpers.ts/dashboardTypes.ts
// pattern used elsewhere for the same JobOutput.content: unknown field.
function isCriticResult(value: unknown): value is CriticResult {
  return (
    typeof value === 'object' &&
    value !== null &&
    'totalScore' in value &&
    'scores' in value
  );
}

export default function ResultPage() {
  const { jobId } = useParams<{ jobId: string }>();

  const { jobData, setJobData, regenerating, handleRegenerate, currentJob } = useJobData(jobId);

  // NOTE: the theme picker that called the setter lived in the removed AI-render UI.
  // The stored value still selects the palette for the preview and the PNG export.
  const [colorTheme]                            = useState<number>(() => {
    try { return parseInt(localStorage.getItem('ca_carousel_theme') || '4', 10); } catch { return 4; }
  });
  const [currentSlide, setCurrentSlide]         = useState(0);
  const [showMultiplier, setShowMultiplier]     = useState(false);
  const [mobileTab, setMobileTab]               = useState<'content' | 'insights'>('content');
  const [actionDrawerOpen, setActionDrawerOpen] = useState(false);
  const [actionDrawerTab, setActionDrawerTab]   = useState<ActionTab>('feedback');
  const [exportModalOpen, setExportModalOpen]   = useState(false);
  // Sidebar open by default so users notice the AI Quality Analysis is available;
  // still user-toggleable via the collapse button in InsightsSidebar.
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [saveError, setSaveError]               = useState('');
  const touchStartX = useRef<number | null>(null);

  // NOTE: always prefer outputType='final' for display. Other output types
  // (draft, research, critique) are intermediate pipeline artifacts — only
  // 'final' has passed the critic gate and has the quality score attached.
  const finalOutput  = jobData?.outputs?.find((o) => o.outputType === 'final');
  // WHY .pop(): a job can have multiple critique rows (one per retry cycle).
  // The last one is the final quality verdict; earlier ones are revision history.
  const criticOutput = jobData?.outputs?.filter((o) => o.outputType === 'critique')?.pop();
  // WHY isCriticResult guard: criticOutput.content is `unknown`; only trust it as
  // CriticResult once narrowed, matching the || criticOutput fallback the untyped
  // version relied on (some legacy rows may have the critic fields on the output
  // itself rather than nested under .content).
  const criticResult: CriticResult | undefined = isCriticResult(criticOutput?.content)
    ? criticOutput.content
    : isCriticResult(criticOutput)
    ? criticOutput
    : undefined;
  // WHY guard then cast: finalOutput.content is `unknown` (job.ts) — a 'final' output's
  // content is always an object (single PlatformContent/VideoScriptContentData) or an
  // array of slides (carousel), never a primitive, so a shape check is enough before
  // trusting it as ResultContent. The individual field reads below (content.hook,
  // content.tweets, etc.) are all optional-chained/guarded further, same as before typing.
  const rawContent = finalOutput?.content;
  const content: ResultContent | undefined =
    Array.isArray(rawContent) || (typeof rawContent === 'object' && rawContent !== null)
      ? (rawContent as ResultContent)
      : undefined;
  const isDone       = jobData?.status === 'done';
  const isFailed     = jobData?.status === 'failed';
  const progress     = jobData?.progress ?? currentJob?.progress ?? (isDone ? 100 : 0);
  const currentStage = jobData?.stage || jobData?.status || currentJob?.stage || 'pending';
  const stageMessage = jobData?.message ?? currentJob?.message ?? '';
  const isCarousel   = Array.isArray(content);

  // WHY: brand identity, palette and design preset are resolved once here and passed to
  // BOTH the on-screen preview and the PNG export. Deriving them separately in each place
  // is what caused downloaded slides to look nothing like the preview.
  //
  // brandName/handle are ONLY populated from the user's real Brand Voice settings
  // (GET /users/me) — never fabricated from the topic text. A carousel for a user who
  // hasn't set up a brand shouldn't display a made-up name/handle on the cover slide.
  const { data: profile } = useQuery({ queryKey: ['profile'], queryFn: getProfile, staleTime: 5 * 60 * 1000 });
  const brandName = profile?.brandName?.trim() || '';
  // NOTE: there's no separate "handle" setting anywhere in the schema — only brandName.
  // The handle is derived from it so it never shows without a real brand name behind it.
  const handle = brandName ? `@${brandName.toLowerCase().replace(/[^a-z0-9]/g, '')}` : '';
  const colorSystem  = deriveColorSystem(THEME_ACCENTS[colorTheme] ?? THEME_ACCENTS[0]);
  const designPreset = useCarouselDesignSeed(isCarousel ? content : undefined);

  const slideRefs = useRef<(HTMLDivElement | null)[]>([]);
  const { copied, copyAllText } = useExport(content);
  const { multiplyJobs, handleMultiply } = useMultiplier(jobId);
  const social = useSocial(content, jobId);

  async function handleContentSave(newContent: SlideData[] | PlatformContent): Promise<void> {
    if (!jobId) return;
    setSaveError('');
    try {
      // WHY unknown->PlatformContent[] cast: updateJobContent's declared param type
      // (PlatformContent | PlatformContent[] | string) predates carousel slide editing —
      // SlideData[] (carousel slides) is a real, guarded-by-the-caller value here, just a
      // narrower field set than PlatformContent's optional fields. The server PATCH route
      // stores whatever JSON is sent back as the final output content either way.
      await updateJobContent(jobId, newContent as unknown as PlatformContent | PlatformContent[]);
    } catch (err) {
      setSaveError('Failed to save your edit — please try again.');
      throw err;
    }
    setJobData((p) => {
      if (!p) return p;
      const i = p.outputs.findIndex((o) => o.outputType === 'final');
      if (i > -1) {
        const np = { ...p, outputs: [...p.outputs] };
        np.outputs[i] = { ...np.outputs[i], content: newContent };
        return np;
      }
      return p;
    });
  }

  function onRegenerate(feedback?: string) {
    setCurrentSlide(0);
    handleRegenerate(feedback);
  }

  function onSteer() {
    setActionDrawerTab('feedback');
    setActionDrawerOpen(true);
  }

  return (
    <div className="rp">
      <ResultHeader
        jobData={jobData}
        content={content}
        jobId={jobId}
        isDone={isDone}
        regenerating={regenerating}
        isCarousel={isCarousel}
        copied={copied}
        onCopyAll={copyAllText}
        onExport={() => setExportModalOpen(true)}
        onRegenerate={onRegenerate}
        criticResult={criticResult}
        currentStage={currentStage}
        progress={progress}
        social={social}
        onOpenActions={() => setActionDrawerOpen(true)}
      />

      {((!content || regenerating) && !isFailed) && (
        <LoadingView
          regenerating={regenerating}
          currentStage={currentStage}
          stageMessage={stageMessage}
          progress={progress}
          agentLogs={jobData?.agentLogs ?? currentJob?.agentLogs}
        />
      )}

      {isFailed && (
        <ErrorState
          title="Generation failed"
          message={jobData?.error || 'An error occurred. Please try again.'}
          retryLabel="Try again"
          onRetry={() => onRegenerate()}
        />
      )}

      {content && !regenerating && (
        <>
          {saveError && (
            <div className="toast toast-error" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {saveError}
            </div>
          )}
          <div className="rp-tabs">
            <button className={'rp-tab' + (mobileTab === 'content'  ? ' on' : '')} onClick={() => setMobileTab('content')}>Content</button>
            <button className={'rp-tab' + (mobileTab === 'insights' ? ' on' : '')} onClick={() => setMobileTab('insights')}>Insights</button>
          </div>

          <div className="rp-grid" style={{ gridTemplateColumns: sidebarCollapsed ? '1fr 48px' : '1fr 360px', transition: 'grid-template-columns 0.25s cubic-bezier(.16,1,.3,1)' }}>
            <ContentColumn
              className={mobileTab === 'insights' ? 'rp-off' : undefined}
              jobData={jobData}
              content={content}
              currentSlide={currentSlide}
              setCurrentSlide={setCurrentSlide}
              touchStartX={touchStartX}
              onSave={handleContentSave}
              showMultiplier={showMultiplier}
              setShowMultiplier={setShowMultiplier}
              multiplyJobs={multiplyJobs}
              onMultiply={handleMultiply}
              slideRefs={isCarousel ? slideRefs : undefined}
              brandName={brandName}
              handle={handle}
              colorSystem={colorSystem}
              designPreset={designPreset}
            />
            <InsightsSidebar
              criticResult={criticResult}
              className={mobileTab !== 'insights' ? 'rp-off' : undefined}
              onSteer={onSteer}
              collapsed={sidebarCollapsed}
              onToggle={() => setSidebarCollapsed(c => !c)}
            />
          </div>

          {/* Mobile sticky footer action bar */}
          {isDone && (
            <div className="rp-footer-bar">
              <button className="rp-footer-bar-btn" onClick={copyAllText} title="Copy all">
                <Copy size={16} />
                <span className="rp-footer-label">Copy</span>
              </button>
              <div className="rp-footer-sep" />
              {/* WHY disabled={regenerating}: the desktop toolbar's Regen button
                  unmounts entirely once regenerating flips true (see ResultHeader.tsx),
                  but this footer bar stayed mounted with no matching guard — a fast
                  double-tap here could fire two concurrent regenerate pipelines
                  (FUNCTIONAL_AUDIT_2026-07.md finding #13). handleRegenerate itself
                  is now also guarded at the source, but disabling here too keeps the
                  button visually honest about its state. */}
              <button className="rp-footer-bar-btn" onClick={() => onRegenerate()} disabled={regenerating} title="Regenerate">
                <RotateCcw size={16} />
                <span className="rp-footer-label">Regen</span>
              </button>
              <div className="rp-footer-sep" />
              <button className="rp-footer-bar-btn primary" onClick={() => setExportModalOpen(true)} title="Export content">
                <Download size={16} />
                <span className="rp-footer-label">Export</span>
              </button>
              <div className="rp-footer-sep" />
              <button className="rp-footer-bar-btn" onClick={() => setActionDrawerOpen(true)} title="More actions">
                <MoreHorizontal size={16} />
                <span className="rp-footer-label">More</span>
              </button>
            </div>
          )}
        </>
      )}

      {/* Action Drawer with tabbed panels */}
      <ActionDrawer
        isOpen={actionDrawerOpen}
        onClose={() => setActionDrawerOpen(false)}
        jobData={jobData}
        content={content}
        criticResult={criticResult}
        onRegenerate={onRegenerate}
        defaultTab={actionDrawerTab ?? 'feedback'}
        social={social}
      />

      {/* Export modal — all formats in one place */}
      <ExportModal
        isOpen={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
        jobData={jobData}
        content={content}
        colorTheme={colorTheme}
        isCarousel={isCarousel}
        brandName={brandName}
        handle={handle}
        colorSystem={colorSystem}
        designPreset={designPreset}
      />
    </div>
  );
}
