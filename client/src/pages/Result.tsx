import { useState, useRef, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
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
import { InsightsSidebar } from './Result/components/InsightsSidebar';
import { ActionDrawer }   from './Result/components/ActionDrawer';
import type { ActionTab } from './Result/components/ActionDrawer';
import { ExportModal }    from './Result/components/ExportModal';
import { useQualityAside } from './Result/hooks/useQualityAside';
import { useResultTemplate } from './Result/hooks/useResultTemplate';
import { Copy, RotateCcw, Download, MoreHorizontal } from 'lucide-react';
import type { PlatformContent } from '../types/job';
import type { SlideData } from './Result/components/content/carousel/IGSlide';
import { deriveResultContent } from './Result/lib/resultDerived';

export default function ResultPage() {
  const { jobId } = useParams<{ jobId: string }>();

  const { jobData, setJobData, loadError, regenerating, handleRegenerate, loadJob } = useJobData(jobId);

  // NOTE: the theme picker that called the setter lived in the removed AI-render UI.
  // The stored value still selects the palette for the preview and the PNG export.
  // WHY clamped to 0-8: THEME_KEYS (ExportModal.tsx) defines 9 valid theme
  // indices — an out-of-range or NaN stored value (e.g. left over from a
  // future version with more themes, or manual localStorage tampering) would
  // otherwise silently resolve to a theme the user never selected with no
  // error surfaced, causing the exported PNG to diverge from the live preview.
  const [colorTheme]                            = useState<number>(() => {
    try {
      const parsed = parseInt(localStorage.getItem('ca_carousel_theme') || '4', 10);
      return Number.isInteger(parsed) && parsed >= 0 && parsed <= 8 ? parsed : 4;
    } catch { return 4; }
  });
  const [currentSlide, setCurrentSlide]         = useState(0);
  const [mobileTab, setMobileTab]               = useState<'content' | 'insights'>('content');
  const [actionDrawerOpen, setActionDrawerOpen] = useState(false);
  // WHY null: mobile "More" opens the action menu; desktop tools pass a concrete tab.
  const [actionDrawerTab, setActionDrawerTab]   = useState<ActionTab | null>(null);
  // WHY: Insights “Fix with AI” passes a tip; Rewrite from the header starts blank.
  const [feedbackPrefill, setFeedbackPrefill]   = useState('');
  const [exportModalOpen, setExportModalOpen]   = useState(false);
  // Sidebar open by default so users notice the AI Quality Analysis is available;
  // still user-toggleable via the collapse button in InsightsSidebar.
  // Persist collapse state to localStorage so it survives page refreshes.
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try {
      return localStorage.getItem('ca_insights_sidebar_collapsed') === 'true';
    } catch { return false; }
  });
  const [saveError, setSaveError]               = useState('');
  const touchStartX = useRef<number | null>(null);
  const rpRef = useRef<HTMLDivElement | null>(null);
  // WHY content-width (not viewport): sidebar + DevTools leave the window wide
  // while .rp is narrow — one-screen lock + Quality side column only when the
  // Result workspace itself has room (≥1100px). See Result.css @container rp.
  const { layoutWide, asideAnimating, beginAsideToggle } = useQualityAside(rpRef);

  // Persist sidebar collapse state to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('ca_insights_sidebar_collapsed', String(sidebarCollapsed));
    } catch { /* ignore */ }
  }, [sidebarCollapsed]);

  // WHY: collapsed rail is a 48px side column — only valid in the 2-col layout.
  // On stacked mid-width, force the full Quality card so it isn't a thin strip.
  const effectiveSidebarCollapsed = layoutWide && sidebarCollapsed;

  const {
    content,
    isPartialFinal,
    criticResult,
    isDone,
    isFailed,
    progress,
    currentStage,
    stageMessage,
    isCarousel,
  } = deriveResultContent(jobData);

  const {
    templateId,
    paletteId,
    brandName,
    handle,
    colorSystem,
    designPreset,
    onTemplateSwitch,
  } = useResultTemplate(jobId, jobData, colorTheme, isCarousel, content, setSaveError);

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

  async function handleInsertHashtags(tags: string[]): Promise<void> {
    // WHY drop video scripts too: ResultContent includes VideoScriptContentData,
    // whose hook/cta are objects. Spreading that union is not a PlatformContent,
    // so tsc -b rejects the save (CI client build).
    if (!content || Array.isArray(content) || 'segments' in content) {
      throw new Error('Hashtag insert is only available for caption/LinkedIn posts');
    }
    const existing = Array.isArray(content.hashtags) ? content.hashtags : [];
    const normalized = tags.map((t) => (t.startsWith('#') ? t : `#${t}`));
    const merged = [...existing];
    for (const tag of normalized) {
      if (!merged.some((e) => e.toLowerCase() === tag.toLowerCase())) {
        merged.push(tag);
      }
    }
    await handleContentSave({ ...content, hashtags: merged });
  }

  function onRegenerate(feedback?: string) {
    setCurrentSlide(0);
    handleRegenerate(feedback);
  }

  function onSteer(prefill?: string) {
    setFeedbackPrefill(prefill?.trim() || '');
    setActionDrawerTab('feedback');
    setActionDrawerOpen(true);
  }

  function closeActionDrawer(): void {
    setActionDrawerOpen(false);
    setFeedbackPrefill('');
  }

  function toggleInsights(): void {
    beginAsideToggle(sidebarCollapsed);
    setSidebarCollapsed((collapsed) => !collapsed);
  }

  return (
    <div
      ref={rpRef}
      className={['rp', layoutWide ? 'rp-layout-wide' : ''].filter(Boolean).join(' ')}
    >
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
        loadError={loadError}
        social={social}
        activePanel={actionDrawerOpen ? actionDrawerTab : null}
        onOpenPanel={(tab) => {
          // WHY clear: header Rewrite is a blank form; Insights “Fix with AI”
          // sets feedbackPrefill via onSteer instead.
          if (tab === 'feedback') setFeedbackPrefill('');
          setActionDrawerTab(tab);
          setActionDrawerOpen(true);
        }}
        onToggleAdapt={() => {
          document.getElementById('rp-adapt')?.scrollIntoView({ block: 'nearest' });
        }}
      />

      {loadError && !regenerating && (
        <ErrorState
          title={
            loadError === 'not_found'
              ? 'Job not found'
              : loadError === 'lost'
                ? 'Generation lost'
                : 'Could not load job'
          }
          message={
            loadError === 'not_found'
              ? 'This job may have been deleted or you may not have access to it.'
              : loadError === 'lost'
                ? 'This generation was lost after a server restart. Please create it again.'
                : 'We could not load this job. Check your connection and try again.'
          }
          retryLabel={loadError === 'lost' ? undefined : 'Retry'}
          onRetry={loadError === 'lost' ? undefined : () => { void loadJob(); }}
        />
      )}
      {(loadError === 'not_found' || loadError === 'lost') && (
        <p style={{ textAlign: 'center', marginTop: '-0.5rem' }}>
          <Link to={loadError === 'lost' ? '/create' : '/library'}>
            {loadError === 'lost' ? 'Create again' : 'Back to Library'}
          </Link>
        </p>
      )}

      {((!content || regenerating) && !isFailed && !loadError) && (
        <LoadingView
          regenerating={regenerating}
          currentStage={currentStage}
          stageMessage={stageMessage}
          progress={progress}
          agentLogs={jobData?.agentLogs}
        />
      )}

      {/* WHY !loadError: the "lost"/"not_found" path already renders ErrorState
          above — pairing it with status:'failed' used to stack a second
          "Generation failed" + fake Regen (QA-C2-001). */}
      {isFailed && !loadError && (
        <ErrorState
          title="Generation failed"
          message={jobData?.error || 'An error occurred. Please try again.'}
          retryLabel="Try again"
          onRetry={() => onRegenerate()}
        />
      )}

      {content && !regenerating && (
        <>
          {isPartialFinal && (
            <div
              className="toast"
              style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem',
                background: 'color-mix(in srgb, var(--color-warning, #f59e0b) 12%, transparent)',
                border: '1px solid color-mix(in srgb, var(--color-warning, #f59e0b) 30%, transparent)',
                color: 'var(--text-secondary)',
              }}
            >
              Quality score stayed below the approval threshold — this is the best draft from the revision loop. You can regenerate with feedback.
            </div>
          )}
          {saveError && (
            <div className="toast toast-error" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {saveError}
            </div>
          )}
          <div className="rp-tabs" role="tablist" aria-label="Result views">
            <button
              type="button"
              role="tab"
              aria-selected={mobileTab === 'content'}
              className={'rp-tab' + (mobileTab === 'content'  ? ' on' : '')}
              onClick={() => setMobileTab('content')}
            >
              Content
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mobileTab === 'insights'}
              className={'rp-tab' + (mobileTab === 'insights' ? ' on' : '')}
              onClick={() => setMobileTab('insights')}
            >
              Insights
            </button>
          </div>

          <div
            className={[
              'rp-grid',
              effectiveSidebarCollapsed ? 'rp-grid-sidebar-collapsed' : '',
              asideAnimating ? 'rp-grid-aside-anim' : '',
            ].filter(Boolean).join(' ')}
          >
            <ContentColumn
              className={mobileTab === 'insights' ? 'rp-off' : undefined}
              jobData={jobData}
              content={content}
              currentSlide={currentSlide}
              setCurrentSlide={setCurrentSlide}
              touchStartX={touchStartX}
              onSave={handleContentSave}
              multiplyJobs={multiplyJobs}
              onMultiply={handleMultiply}
              slideRefs={isCarousel ? slideRefs : undefined}
              brandName={brandName}
              handle={handle}
              colorSystem={colorSystem}
              designPreset={designPreset}
              templateId={templateId}
              paletteId={paletteId}
              onTemplateChange={(t, p) => { onTemplateSwitch(t, p).catch(() => {}); }}
            />
            <InsightsSidebar
              criticResult={criticResult}
              className={mobileTab !== 'insights' ? 'rp-off' : undefined}
              onSteer={onSteer}
              collapsed={effectiveSidebarCollapsed}
              onToggle={toggleInsights}
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
              {/* WHY: the desktop Regen button unmounts while a run is in
                  progress, but this bar stays mounted, so disable it here too. */}
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
              <button
                className="rp-footer-bar-btn"
                onClick={() => {
                  setActionDrawerTab(null);
                  setActionDrawerOpen(true);
                }}
                title="More actions"
              >
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
        onClose={closeActionDrawer}
        jobData={jobData}
        content={content}
        onRegenerate={onRegenerate}
        onRestored={() => { loadJob().catch(() => {}); }}
        onInsertHashtags={handleInsertHashtags}
        defaultTab={actionDrawerTab}
        feedbackPrefill={feedbackPrefill}
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
        templateId={templateId}
        paletteId={paletteId}
      />
    </div>
  );
}
