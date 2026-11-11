import React, { useState, useEffect, useRef } from 'react';
import { X, Image, FileText, AlignLeft, Code, Download, CheckCircle, Loader } from 'lucide-react';
import { posthog } from '../../../main';
import { useFocusTrap } from '../../../hooks/useFocusTrap';
import { VisibleScroller } from '../../../components/VisibleScroller';
import type { ColorSystem } from '../../../lib/colorSystem';
import type { ContentJob } from '../../../types/job';
import type { ResultContent as ExportContent } from './ContentColumn';
import { exportPNG, exportPDF, exportText, exportHTML } from './exportDownloaders';

interface ExportFormat {
  id: 'png' | 'pdf' | 'txt' | 'html';
  label: string;
  icon: React.ElementType;
  description: string;
  recommended: string[];   // platform keys where this is the primary recommended format
}

const FORMATS: ExportFormat[] = [
  {
    id: 'png',
    label: 'PNG Slides (ZIP)',
    icon: Image,
    description: 'Best for Instagram & stories — 1080×1350px, matches your preview',
    recommended: ['instagram_carousel'],
  },
  {
    id: 'pdf',
    label: 'PDF Document',
    icon: FileText,
    description: 'Best for sharing presentations and long-form content',
    recommended: ['linkedin_post'],
  },
  {
    id: 'txt',
    label: 'Plain Text',
    icon: AlignLeft,
    description: 'Best for editing in any app — clean, copy-pasteable text',
    recommended: ['twitter_thread', 'linkedin_post', 'instagram_caption', 'video_script'],
  },
  {
    id: 'html',
    label: 'Slide Outline (HTML)',
    icon: Code,
    description: 'Readable HTML outline of slide headlines and body text — not the PNG layout source',
    recommended: [],
  },
];

interface Props {
  isOpen:      boolean;
  onClose:     () => void;
  jobData:     ContentJob | null;
  content:     ExportContent | undefined;
  colorTheme:  number;
  isCarousel:  boolean;
  /** Render inputs resolved in Result.tsx and shared with the on-screen preview —
   *  the server renders from these so the PNGs match exactly what is displayed. */
  brandName:   string;
  handle:      string;
  colorSystem: ColorSystem;
  designPreset: number;
  // New template system fields - optional for backward compatibility
  templateId?: string;
  paletteId?: string;
}

type ExportState = 'idle' | 'exporting' | 'done' | 'error';

export function ExportModal({ isOpen, onClose, jobData, content, colorTheme, isCarousel, brandName, handle, colorSystem, designPreset, templateId, paletteId }: Props) {
  const [exportState, setExportState] = useState<Record<string, ExportState>>({});
  const [exportErrors, setExportErrors] = useState<Record<string, string>>({});
  const platform: string = jobData?.platform || '';
  const modalRef = useRef<HTMLDivElement>(null);
  // WHY a ref-tracked Set, not bare setTimeout calls: handleExport fires from a
  // click handler, not an effect, so its 3s/4s "reset to idle" timers have no
  // natural cleanup point. Without tracking them, closing the modal and
  // reopening it within the delay window lets a stale timer reset the
  // freshly-reopened modal's state out from under it.
  const pendingTimers = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());

  // SECURITY/ACCESSIBILITY: Escape-to-close, cleaned up on unmount/deactivation.
  useEffect(() => {
    if (!isOpen) return undefined;
    function onKeyDown(e: KeyboardEvent): void {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  // WHY lock body scroll: same as ActionDrawer — page shouldn't scroll under the modal.
  useEffect(() => {
    if (!isOpen) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  // WHY this effect's cleanup runs on isOpen leaving true, not just on
  // unmount: this component stays mounted across opens/closes (Result.tsx
  // toggles `isOpen`, it doesn't remount the modal), so a plain unmount-only
  // cleanup would miss the close→reopen-within-3s case this fix exists for.
  // An effect that only "runs" while isOpen is true has its cleanup fire
  // exactly when isOpen flips to false (or the component unmounts) — either
  // way, pending timers from the session that's ending are cleared before a
  // fresh session (reopen, or unmount) begins.
  useEffect(() => {
    if (!isOpen) return undefined;
    return () => {
      pendingTimers.current.forEach(clearTimeout);
      pendingTimers.current.clear();
    };
  }, [isOpen]);

  useFocusTrap(modalRef, isOpen);

  if (!isOpen) return null;

  function isRecommended(formatId: string): boolean {
    const fmt = FORMATS.find((f) => f.id === formatId);
    return !!fmt?.recommended.includes(platform);
  }

  function getState(id: string): ExportState {
    return exportState[id] || 'idle';
  }

  async function handleExport(formatId: string) {
    if (getState(formatId) === 'exporting') return;
    setExportState((s) => ({ ...s, [formatId]: 'exporting' }));
    setExportErrors((s) => {
      const next = { ...s };
      delete next[formatId];
      return next;
    });

    const ctx = {
      content, jobData, colorTheme, brandName, handle, colorSystem, designPreset, templateId, paletteId,
    };
    try {
      if (formatId === 'png') {
        await exportPNG(ctx);
      } else if (formatId === 'txt') {
        exportText(ctx);
      } else if (formatId === 'pdf') {
        await exportPDF(ctx);
      } else if (formatId === 'html') {
        exportHTML(ctx);
      }
      setExportState((s) => ({ ...s, [formatId]: 'done' }));
      posthog?.capture?.('export_downloaded', { format: formatId, platform });
      const timer = setTimeout(() => {
        pendingTimers.current.delete(timer);
        setExportState((s) => ({ ...s, [formatId]: 'idle' }));
      }, 3000);
      pendingTimers.current.add(timer);
    } catch (err: unknown) {
      const message = err instanceof Error && err.message.trim().length > 0
        ? err.message
        : 'Export failed. Try again.';
      setExportErrors((s) => ({ ...s, [formatId]: message }));
      setExportState((s) => ({ ...s, [formatId]: 'error' }));
      const timer = setTimeout(() => {
        pendingTimers.current.delete(timer);
        setExportState((s) => ({ ...s, [formatId]: 'idle' }));
        setExportErrors((s) => {
          const next = { ...s };
          delete next[formatId];
          return next;
        });
      }, 6000);
      pendingTimers.current.add(timer);
    }
  }

  const visibleFormats = FORMATS.filter((f) => {
    if (f.id === 'png' && !isCarousel) return false;
    if (f.id === 'html' && !isCarousel) return false;
    return true;
  });

  // WHY the count lives in the description, not the button: the server renders
  // every slide and returns one ZIP, so there is no per-slide progress to show.
  // Putting "Rendering N slides…" inside the nowrap button stretched that row
  // to several lines. The known slide count stays visible as one short line.
  function exportingDetail(formatId: string): string {
    if (formatId === 'png' && Array.isArray(content)) {
      const n = content.length;
      return `Rendering ${n} slide${n === 1 ? '' : 's'}…`;
    }
    return 'Saving…';
  }

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'color-mix(in srgb, var(--bg-base) 70%, transparent)', backdropFilter: 'blur(4px)', zIndex: 1200 }}
      />

      {/* Modal */}
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="export-modal-title"
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'fixed', left: '50%', top: '50%',
          width: 'min(460px, calc(100vw - 32px))',
          maxHeight: 'calc(100vh - 32px)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          background: 'linear-gradient(135deg, var(--bg-raised) 0%, var(--bg-card) 100%)',
          border: '1px solid var(--rule)',
          borderRadius: 16, zIndex: 1201, boxShadow: '0 24px 60px rgba(0,0,0,0.6)',
          padding: 0,
          animation: 'rp-fadeUpCentered .22s cubic-bezier(.16,1,.3,1) both',
        }}>
        <VisibleScroller frameStyle={{ flex: '1 1 auto', minHeight: 0 }} gutter={false} style={{ padding: '20px 20px 24px' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <div>
            <div id="export-modal-title" style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>Export Content</div>
            <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 }}>
              {jobData?.topic?.slice(0, 48) || 'Choose a format'}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center', borderRadius: 6 }}
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        {/* Format cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {visibleFormats.map((fmt) => {
            const Icon = fmt.icon;
            const recommended = isRecommended(fmt.id);
            const state = getState(fmt.id);

            return (
              <div
                key={fmt.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  background: recommended ? 'color-mix(in srgb, var(--accent) 5%, transparent)' : 'color-mix(in srgb, var(--text-primary) 3%, transparent)',
                  border: `1px solid ${recommended ? 'color-mix(in srgb, var(--accent) 25%, transparent)' : 'var(--rule)'}`,
                  borderRadius: 12, padding: '12px 14px',
                  transition: 'border-color .18s, background .18s',
                }}
              >
                {/* Icon */}
                <div style={{
                  width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                  background: recommended ? 'color-mix(in srgb, var(--accent) 12%, transparent)' : 'color-mix(in srgb, var(--text-primary) 6%, transparent)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Icon size={16} style={{ color: recommended ? 'var(--accent)' : 'var(--text-secondary)' }} />
                </div>

                {/* Text */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)' }}>{fmt.label}</span>
                    {recommended && (
                      <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: 0.8, textTransform: 'uppercase', color: 'var(--accent)', background: 'color-mix(in srgb, var(--accent) 12%, transparent)', border: '1px solid color-mix(in srgb, var(--accent) 30%, transparent)', borderRadius: 4, padding: '1px 5px' }}>
                        Recommended
                      </span>
                    )}
                  </div>
                  <div style={{
                    fontSize: 11,
                    color: state === 'error'
                      ? 'var(--color-error)'
                      : state === 'exporting' ? 'var(--accent)' : 'var(--text-secondary)',
                    marginTop: 2,
                    lineHeight: 1.4,
                  }}>
                    {state === 'exporting'
                      ? exportingDetail(fmt.id)
                      : state === 'error'
                        ? (exportErrors[fmt.id] || 'Export failed. Try again.')
                        : fmt.description}
                  </div>
                </div>

                {/* Download button */}
                <button
                  onClick={() => handleExport(fmt.id)}
                  disabled={state === 'exporting'}
                  style={{
                    flexShrink: 0, display: 'flex', alignItems: 'center', gap: 5,
                    background: state === 'done' ? 'rgba(16,185,129,0.12)' : state === 'error' ? 'rgba(239,68,68,0.1)' : recommended ? 'color-mix(in srgb, var(--accent) 12%, transparent)' : 'color-mix(in srgb, var(--text-primary) 6%, transparent)',
                    border: `1px solid ${state === 'done' ? 'rgba(16,185,129,0.35)' : state === 'error' ? 'rgba(239,68,68,0.3)' : recommended ? 'color-mix(in srgb, var(--accent) 35%, transparent)' : 'var(--rule)'}`,
                    color: state === 'done' ? 'var(--color-success)' : state === 'error' ? 'var(--color-error)' : recommended ? 'var(--accent)' : 'var(--text-secondary)',
                    borderRadius: 8, padding: '6px 10px', cursor: state === 'exporting' ? 'wait' : 'pointer',
                    fontSize: 12, fontWeight: 600, transition: 'all .18s',
                    boxSizing: 'border-box', width: 124, minWidth: 124, maxWidth: 124,
                    justifyContent: 'center', whiteSpace: 'nowrap', overflow: 'hidden',
                  }}
                  aria-busy={state === 'exporting'}
                >
                  {state === 'exporting' && (
                    <>
                      <ExportSpinner />
                      {fmt.id === 'png' ? 'Rendering' : 'Saving'}
                    </>
                  )}
                  {state === 'done'      && <><CheckCircle size={11} /> Saved!</>}
                  {state === 'error'     && 'Error'}
                  {state === 'idle'      && <><Download size={11} /> Download</>}
                </button>
              </div>
            );
          })}
        </div>

        {/* Footer hint */}
        <div style={{ marginTop: 16, fontSize: 10.5, color: 'var(--text-muted)', textAlign: 'center', lineHeight: 1.5 }}>
          Files download directly to your device — nothing is uploaded.
        </div>
        </VisibleScroller>
      </div>
    </>
  );
}

function ExportSpinner() {
  return (
    <Loader size={11} style={{ animation: 'rp-spin .8s linear infinite' }} />
  );
}
