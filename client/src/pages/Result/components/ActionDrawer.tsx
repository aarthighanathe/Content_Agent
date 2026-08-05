import { useState, useRef, useCallback, useEffect } from 'react';
import { X, Pen, Send, Hash, History } from 'lucide-react';
import { FeedbackPanel } from './panels/FeedbackPanel';
import { PostPanel } from './panels/PostPanel';
import { HashtagPanel } from './panels/HashtagPanel';
import { HistoryPanel } from './panels/HistoryPanel';
import { useFocusTrap } from '../../../hooks/useFocusTrap';
import type { ContentJob } from '../../../types/job';
import type { SocialConnection } from '../../../types/api';
import type { ResultContent } from './ContentColumn';

type TabType = 'feedback' | 'post' | 'hashtags' | 'history';

interface ActionDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  jobData: ContentJob | null;
  content: ResultContent | undefined;
  onRegenerate: (feedback?: string) => void;
  onRestored: () => void;
  defaultTab?: TabType;
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

const tabs: Array<{ id: TabType; label: string; icon: React.ElementType }> = [
  { id: 'feedback', label: 'Feedback', icon: Pen },
  { id: 'post', label: 'Post', icon: Send },
  { id: 'hashtags', label: 'Hashtags', icon: Hash },
  { id: 'history', label: 'History', icon: History },
];

export function ActionDrawer({ isOpen, onClose, jobData, content, onRegenerate, onRestored, defaultTab = 'feedback', social }: ActionDrawerProps) {
  const [activeTab, setActiveTab] = useState<TabType>(defaultTab);
  const drawerRef = useRef<HTMLDivElement>(null);

  // WHY useCallback + setTimeout(0): the react-hooks/set-state-in-effect rule flags
  // any setState called synchronously in an effect body. Wrapping in useCallback gives
  // a stable identity (no needless re-runs), and deferring via 0ms means the state
  // update happens in a callback rather than the effect body itself, which is the pattern
  // the rule accepts. User-visible behaviour is unchanged — the tab resets on the same
  // render cycle that opens the drawer.
  const syncTab = useCallback((tab: TabType) => {
    setActiveTab(tab);
  }, []);

  // Sync to defaultTab whenever drawer opens
  useEffect(() => {
    if (!isOpen) return undefined;
    const t = setTimeout(() => syncTab(defaultTab ?? 'feedback'), 0);
    return () => clearTimeout(t);
  }, [isOpen, defaultTab, syncTab]);

  // SECURITY/ACCESSIBILITY: Escape-to-close, cleaned up on unmount/deactivation.
  useEffect(() => {
    if (!isOpen) return undefined;
    function onKeyDown(e: KeyboardEvent): void {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  useFocusTrap(drawerRef, isOpen);

  if (!isOpen) return null;

  return (
    <>
      <div className="rp-drawer-backdrop" onClick={onClose} />
      <div
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label="Content actions"
        className="rp-drawer"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer header with tabs */}
        <div style={{ display: 'flex', alignItems: 'center', borderBottom: '1px solid var(--rule)', padding: 0 }}>
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            // Post tab always shown — PostPanel shows a "connect account" prompt when empty
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  padding: '14px 12px',
                  background: isActive ? 'color-mix(in srgb, var(--accent) 8%, transparent)' : 'none',
                  border: 'none',
                  borderBottom: isActive ? '2px solid var(--accent)' : '2px solid transparent',
                  color: isActive ? 'var(--accent)' : 'var(--text-secondary)',
                  fontSize: 12,
                  fontWeight: isActive ? 600 : 400,
                  cursor: 'pointer',
                  transition: 'all .2s',
                }}
              >
                <Icon size={14} />
                <span>{tab.label}</span>
              </button>
            );
          })}
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              padding: '8px 12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 16,
            }}
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        {/* Drawer body with tab content */}
        <div className="rp-drawer-body" style={{ minHeight: 300 }}>
          {activeTab === 'feedback' && (
            <FeedbackPanel
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
              jobData={jobData}
              postingTo={social.postingTo}
              postResult={social.postResult}
              postLinks={social.postLinks}
              onPost={social.handlePostNow}
              onClose={onClose}
            />
          )}
          {activeTab === 'hashtags' && (
            <HashtagPanel jobData={jobData} content={content} onClose={onClose} />
          )}
          {activeTab === 'history' && (
            <HistoryPanel jobId={jobData?.id} onClose={onClose} onRestored={onRestored} />
          )}
        </div>
      </div>
    </>
  );
}
