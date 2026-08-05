import React, { useState, useEffect, useRef } from 'react';
import { X, Image, FileText, AlignLeft, Code, Download, CheckCircle, Loader } from 'lucide-react';
import { api } from '../../../api';
import { posthog } from '../../../main';
import { useFocusTrap } from '../../../hooks/useFocusTrap';
import { flattenContentToText } from '../../../lib/contentFlattener.js';
import type { ColorSystem } from '../../../lib/colorSystem';
import type { ContentJob } from '../../../types/job';
import type { ResultContent as ExportContent } from './ContentColumn';

const THEME_KEYS = ['aurora','magazine','split','bold','minimal','neon','violet','crimson','rose'] as const;

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
    label: 'HTML Source',
    icon: Code,
    description: 'For developers — raw slide HTML for custom rendering',
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
}

type ExportState = 'idle' | 'exporting' | 'done' | 'error';

export function ExportModal({ isOpen, onClose, jobData, content, colorTheme, isCarousel, brandName, handle, colorSystem, designPreset }: Props) {
  const [exportState, setExportState] = useState<Record<string, ExportState>>({});
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

    try {
      if (formatId === 'png') {
        await exportPNG();
      } else if (formatId === 'txt') {
        exportText();
      } else if (formatId === 'pdf') {
        await exportPDF();
      } else if (formatId === 'html') {
        exportHTML();
      }
      setExportState((s) => ({ ...s, [formatId]: 'done' }));
      posthog?.capture?.('export_downloaded', { format: formatId, platform });
      const timer = setTimeout(() => {
        pendingTimers.current.delete(timer);
        setExportState((s) => ({ ...s, [formatId]: 'idle' }));
      }, 3000);
      pendingTimers.current.add(timer);
    } catch (_err) {
      // NOTE: Export errors are displayed to user via error state; no need for console.error
      setExportState((s) => ({ ...s, [formatId]: 'error' }));
      const timer = setTimeout(() => {
        pendingTimers.current.delete(timer);
        setExportState((s) => ({ ...s, [formatId]: 'idle' }));
      }, 4000);
      pendingTimers.current.add(timer);
    }
  }

  async function exportPNG() {
    if (!Array.isArray(content)) throw new Error('No carousel content');
    const themeKey = THEME_KEYS[colorTheme] ?? 'minimal';
    const jobId = jobData?.id;
    // WHY generic <Blob>: api.post's response type defaults to `any`-shaped axios data;
    // the export route always returns a ZIP blob (responseType: 'blob' below), so pin it
    // explicitly instead of relying on axios's default inference.
    const response = await api.post<Blob>(
      `/jobs/${jobId}/export/carousel-png`,
      // WHY these extra fields: the server renders the same slide component the preview
      // uses, so it needs the exact palette, brand identity and design preset on screen.
      { theme: themeKey, slides: content, colors: colorSystem, brandName, handle, designPreset },
      { responseType: 'blob' },
    );
    triggerDownload(response.data, `${safeFileName()}_slides.zip`, 'application/zip');
  }

  function exportText() {
    if (!content) throw new Error('No content');
    const text = flattenContentToText(content);
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    triggerDownload(blob, `${safeFileName()}.txt`, 'text/plain');
  }

  async function exportPDF() {
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const topic = jobData?.topic || 'Content';
    const pageW = doc.internal.pageSize.getWidth();
    const margin = 50;
    const maxW = pageW - margin * 2;
    let y = 60;

    // Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.text(topic, margin, y);
    y += 30;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(100);
    const meta = [jobData?.platform, jobData?.tone, jobData?.targetAudience].filter(Boolean).join(' · ');
    doc.text(meta, margin, y);
    y += 24;
    doc.setTextColor(0);
    doc.setFontSize(11);

    function addText(label: string, body: string) {
      if (y > 720) { doc.addPage(); y = 50; }
      if (label) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(80);
        doc.text(label.toUpperCase(), margin, y);
        y += 14;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(11);
        doc.setTextColor(0);
      }
      const lines: string[] = doc.splitTextToSize(body || '', maxW);
      lines.forEach((line) => {
        if (y > 730) { doc.addPage(); y = 50; }
        doc.text(line, margin, y);
        y += 16;
      });
      y += 8;
    }

    if (content && Array.isArray(content)) {
      content.forEach((s, i) => {
        addText(`Slide ${i + 1}${s.type ? ` — ${s.type}` : ''}`, `${s.headline || ''}\n${s.body || ''}`);
      });
    } else if (content && 'segments' in content) {
      addText('Hook', content.hook?.text || '');
      (content.segments || []).forEach((s) => addText(`Segment ${s.number}`, s.script || ''));
      addText('CTA', content.cta?.text || '');
      if (content.hashtags?.length) addText('Hashtags', content.hashtags.join(' '));
    } else if (content?.tweets) {
      content.tweets.forEach((t, i) => addText(`Tweet ${i + 1}`, t.text));
    } else if (content) {
      if (content.hook) addText('Hook', content.hook);
      if (content.body) addText('Body', content.body);
      if (content.cta) addText('CTA', content.cta);
      if (content.caption) addText('Caption', content.caption);
      if (content.hashtags?.length) addText('Hashtags', content.hashtags.join(' '));
    }

    doc.save(`${safeFileName()}.pdf`);
  }

  function exportHTML() {
    if (!Array.isArray(content)) throw new Error('HTML export is only available for carousels');
    const slides = content;
    const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>${escHtml(jobData?.topic || 'Carousel')}</title>
<style>
  body { font-family: system-ui, sans-serif; background: #111; color: #fff; margin: 0; padding: 24px; }
  .slide { background: #1a1a2e; border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 24px; margin-bottom: 16px; max-width: 600px; }
  .slide-type { font-size: 10px; letter-spacing: 2px; text-transform: uppercase; color: #888; margin-bottom: 8px; }
  .slide-headline { font-size: 20px; font-weight: 700; margin-bottom: 12px; }
  .slide-body { font-size: 14px; line-height: 1.6; color: rgba(255,255,255,0.75); }
</style>
</head><body>
<h1 style="font-size:16px;color:#888;margin-bottom:24px;">${escHtml(jobData?.topic || '')}</h1>
${slides.map((s, i) => `<div class="slide">
  <div class="slide-type">Slide ${i + 1}${s.type ? ' — ' + escHtml(s.type) : ''}</div>
  <div class="slide-headline">${escHtml(s.headline || '')}</div>
  <div class="slide-body">${escHtml(s.body || '')}</div>
</div>`).join('\n')}
</body></html>`;
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    triggerDownload(blob, `${safeFileName()}.html`, 'text/html');
  }

  function safeFileName(): string {
    return (jobData?.topic || 'content').replace(/[^a-zA-Z0-9]/g, '_').slice(0, 40);
  }

  function triggerDownload(data: Blob, filename: string, mimeType: string) {
    const url = URL.createObjectURL(data instanceof Blob ? data : new Blob([data], { type: mimeType }));
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }

  function escHtml(str: string): string {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  const visibleFormats = FORMATS.filter((f) => {
    if (f.id === 'png' && !isCarousel) return false;
    if (f.id === 'html' && !isCarousel) return false;
    return true;
  });

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
          overflowY: 'auto',
          background: 'linear-gradient(135deg, var(--bg-raised) 0%, var(--bg-card) 100%)',
          border: '1px solid var(--rule)',
          borderRadius: 16, zIndex: 1201, boxShadow: '0 24px 60px rgba(0,0,0,0.6)',
          padding: '20px 20px 24px',
          animation: 'rp-fadeUpCentered .22s cubic-bezier(.16,1,.3,1) both',
        }}>
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
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2, lineHeight: 1.4 }}>{fmt.description}</div>
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
                    borderRadius: 8, padding: '7px 12px', cursor: state === 'exporting' ? 'wait' : 'pointer',
                    fontSize: 12, fontWeight: 600, transition: 'all .18s', minWidth: 80, justifyContent: 'center',
                  }}
                >
                  {state === 'exporting' && <><ExportSpinner /> Saving…</>}
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
      </div>
    </>
  );
}

function ExportSpinner() {
  return (
    <Loader size={11} style={{ animation: 'rp-spin .8s linear infinite' }} />
  );
}
