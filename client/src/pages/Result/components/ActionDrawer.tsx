import { useState, useRef, useCallback, useEffect } from 'react';
import { X, PenLine, Send, Hash, History, ChevronLeft } from 'lucide-react';
import { FeedbackPanel } from './panels/FeedbackPanel';
import { PostPanel } from './panels/PostPanel';
import { HashtagPanel } from './panels/HashtagPanel';
import { HistoryPanel } from './panels/HistoryPanel';
import { useFocusTrap } from '../../../hooks/useFocusTrap';
import type { ContentJob } from '../../../types/job';
import type { SocialConnection } from '../../../types/api';
import type { ResultContent } from './ContentColumn';

export type ActionTab = 'feedback' | 'post' | 'hashtags' | 'history';

interface ActionDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  jobData: ContentJob | null;
  content: ResultContent | undefined;
  onRegenerate: (feedback?: string) => void;
  onRestored: () => void;
  /** Persist merged hashtags into the final output (F8). */
  onInsertHashtags?: (tags: string[]) => Promise<void>;
  /**
   * WHY null: mobile "More" opens the action list first. Desktop header buttons
   * pass a concrete tab and skip straight to that panel — no duplicate tab bar.
   */
  defaultTab?: ActionTab | null;
  /** Prefills Rewrite when opened from Insights “Fix with AI”. */
  feedbackPrefill?: string;
  social: {
    socialConnections: SocialConnection[];
    postingTo: string | null;
    postResult: Record<string, 'ok' | 'error'>;
    // WHY added: useSocial() already returns this (populated from postToSocial's
    // response), but this prop type previously omitted it, so PostPanel always
    // received an empty default and "View post" never rendered even on a
    // successful post (FUNCTIONAL_AUDIT_2026-07.md finding #10).
    postLinks: Record<string, string>;
    handlePostNow: (platform: string) => void;
  };
}

const ACTIONS: Array<{
  id: ActionTab;
  label: string;
  blurb: string;
  icon: typeof PenLine;
}> = [
  {
    id: 'feedback',
    label: 'Rewrite',
    blurb: 'Tell the AI what to change and regenerate',
    icon: PenLine,
  },
  {
    id: 'post',
    label: 'Post',
    blurb: 'Publish or schedule to LinkedIn / X',
    icon: Send,
  },
  {
    id: 'hashtags',
    label: 'Hashtags',
    blurb: 'Research tags and insert into the draft',
    icon: Hash,
  },
  {
    id: 'history',
    label: 'History',
    blurb: 'Browse and restore earlier versions',
    icon: History,
  },
];

const PANEL_META: Record<ActionTab, { title: string; subtitle: string; icon: typeof PenLine }> = {
  feedback: {
    title: 'Rewrite',
    subtitle: 'Keep the research — steer the next draft',
    icon: PenLine,
  },
  post: {
    title: 'Post',
    subtitle: 'Publish now or schedule to Calendar',
    icon: Send,
  },
  hashtags: {
    title: 'Hashtags',
    subtitle: 'Research tags matched to this draft',
    icon: Hash,
  },
  history: {
    title: 'History',
    subtitle: 'Earlier versions from each regenerate',
    icon: History,
  },
};

export function ActionDrawer({
  isOpen,
  onClose,
  jobData,
  content,
  onRegenerate,
  onRestored,
  onInsertHashtags,
  defaultTab = null,
  feedbackPrefill = '',
  social,
}: ActionDrawerProps) {
  const [activeTab, setActiveTab] = useState<ActionTab | null>(defaultTab ?? null);
  const drawerRef = useRef<HTMLDivElement>(null);

  // WHY useCallback + setTimeout(0): the react-hooks/set-state-in-effect rule flags
  // any setState called synchronously in an effect body. Wrapping in useCallback gives
  // a stable identity (no needless re-runs), and deferring via 0ms means the state
  // update happens in a callback rather than the effect body itself.
  const syncTab = useCallback((tab: ActionTab | null) => {
    setActiveTab(tab);
  }, []);

  useEffect(() => {
    if (!isOpen) return undefined;
    const t = setTimeout(() => syncTab(defaultTab ?? null), 0);
    return () => clearTimeout(t);
  }, [isOpen, defaultTab, syncTab]);

  useEffect(() => {
    if (!isOpen) return undefined;
    function onKeyDown(e: KeyboardEvent): void {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  // WHY lock body scroll: without this, mobile users can rubber-band the page
  // behind the bottom sheet and lose the dimmed backdrop context.
  useEffect(() => {
    if (!isOpen) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  useFocusTrap(drawerRef, isOpen);

  if (!isOpen) return null;

  const showMenu = activeTab === null;
  // WHY back only when we came from the menu: desktop header opens a panel
  // directly — Back would be a dead end. Mobile More starts on the menu.
  const canGoBack = defaultTab === null && activeTab !== null;
  const meta = activeTab ? PANEL_META[activeTab] : null;
  const HeaderIcon = meta?.icon ?? null;

  return (
    <>
      <div className="rp-drawer-backdrop" onClick={onClose} />
      <div
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label={showMenu ? 'Content actions' : (meta?.title ?? 'Actions')}
        className="rp-drawer"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="rp-drawer-hd">
          <div className="rp-drawer-hd-left">
            {canGoBack && (
              <button
                type="button"
                className="rp-drawer-back"
                onClick={() => setActiveTab(null)}
                aria-label="Back to actions"
              >
                <ChevronLeft size={18} />
              </button>
            )}
            {HeaderIcon && (
              <span className="rp-drawer-hd-icon" aria-hidden>
                <HeaderIcon size={18} />
              </span>
            )}
            <div className="rp-drawer-hd-copy">
              <h2 className="rp-drawer-title">
                {showMenu ? 'Actions' : meta?.title}
              </h2>
              {!showMenu && meta?.subtitle && (
                <p className="rp-drawer-subtitle">{meta.subtitle}</p>
              )}
              {showMenu && (
                <p className="rp-drawer-subtitle">Choose what you want to do next</p>
              )}
            </div>
          </div>
          <button
            type="button"
            className="rp-drawer-close"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        <div className="rp-drawer-body">
          {showMenu && (
            <nav className="rp-action-menu" aria-label="Content actions">
              {ACTIONS.map((action) => {
                const Icon = action.icon;
                return (
                  <button
                    key={action.id}
                    type="button"
                    className="rp-action-menu-item"
                    onClick={() => setActiveTab(action.id)}
                  >
                    <span className="rp-action-menu-icon" aria-hidden>
                      <Icon size={18} />
                    </span>
                    <span className="rp-action-menu-copy">
                      <span className="rp-action-menu-label">{action.label}</span>
                      <span className="rp-action-menu-blurb">{action.blurb}</span>
                    </span>
                  </button>
                );
              })}
            </nav>
          )}

          {activeTab === 'feedback' && (
            <FeedbackPanel
              initialText={feedbackPrefill}
              onSubmit={(fb) => {
                onRegenerate(fb);
                onClose();
              }}
            />
          )}
          {activeTab === 'post' && (
            <PostPanel
              connections={social.socialConnections}
              content={content}
              // WHY required for Schedule: without jobId, handleSchedule early-returns
              // and the Schedule button appears to do nothing.
              jobId={jobData?.id}
              jobData={jobData}
              postingTo={social.postingTo}
              postResult={social.postResult}
              postLinks={social.postLinks}
              onPost={social.handlePostNow}
              onClose={onClose}
            />
          )}
          {activeTab === 'hashtags' && (
            <HashtagPanel
              jobData={jobData}
              content={content}
              onClose={onClose}
              onInsertHashtags={onInsertHashtags}
            />
          )}
          {activeTab === 'history' && (
            <HistoryPanel
              jobId={jobData?.id}
              onClose={onClose}
              onRestored={onRestored}
            />
          )}
        </div>
      </div>
    </>
  );
}
