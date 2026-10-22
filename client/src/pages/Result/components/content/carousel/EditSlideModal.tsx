import { useState, useEffect, useRef } from 'react';
import { ImagePlus, Loader2 } from 'lucide-react';
import type { SlideData } from './IGSlide';
import { useFocusTrap } from '../../../../../hooks/useFocusTrap';
import { Button } from '../../../../../components/Button';
import { generateSlideImage } from '../../../../../api';

interface Props {
  slide:    SlideData;
  index:    number;
  onSave:   (updated: SlideData) => Promise<void>;
  onClose:  () => void;
}

// WHY these exact numbers: must match server/src/schemas/jobs.ts's slideDataSchema
// (headline: max 300, body: max 1000) — the PNG export route validates against that
// schema, but the inline-edit save path (patchContentSchema) has no length cap at
// all. Before this fix, a slide could be edited past the export limits, save
// successfully, then fail PNG export later with a generic "Export failed" toast
// that never explained why (FUNCTIONAL_AUDIT_2026-07.md finding #17). Enforcing
// the same caps here means a save can never produce something export will reject.
const HEADLINE_MAX = 300;
const BODY_MAX = 1000;
const PROMPT_MAX = 500;

export function EditSlideModal({ slide, index, onSave, onClose }: Props) {
  const [form, setForm] = useState({
    headline: slide.headline || '',
    body: slide.body || '',
    imagePrompt: slide.imagePrompt || '',
  });
  const [imageDataUrl, setImageDataUrl] = useState<string | undefined>(slide.imageDataUrl);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const modalRef = useRef<HTMLDivElement>(null);

  async function handleSave() {
    setSaving(true);
    setError('');
    try {
      await onSave({
        ...slide,
        headline: form.headline,
        body: form.body,
        imagePrompt: form.imagePrompt.trim() || undefined,
        imageDataUrl,
      });
      onClose();
    } catch {
      setError('Failed to save — please try again.');
    } finally {
      setSaving(false);
    }
  }

  async function handleGenerateImage(): Promise<void> {
    const prompt = form.imagePrompt.trim()
      || [form.headline, form.body].filter(Boolean).join('. ').slice(0, PROMPT_MAX);
    if (!prompt) {
      setError('Add a headline or image prompt before generating.');
      return;
    }
    setGenerating(true);
    setError('');
    try {
      if (!form.imagePrompt.trim()) {
        setForm((prev) => ({ ...prev, imagePrompt: prompt.slice(0, PROMPT_MAX) }));
      }
      const result = await generateSlideImage(prompt, 'background');
      if (typeof result.image !== 'string' || !result.image.startsWith('data:image/')) {
        setError('Image generation returned an unexpected response.');
        return;
      }
      setImageDataUrl(result.image);
    } catch {
      setError('Image generation failed — please try again.');
    } finally {
      setGenerating(false);
    }
  }

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent): void {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  useFocusTrap(modalRef, true);

  return (
    <>
      <div
        style={{ position: 'fixed', inset: 0, background: 'color-mix(in srgb, var(--bg-base) 70%, transparent)', zIndex: 200, backdropFilter: 'blur(4px)' }}
        onClick={onClose}
      />
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-slide-modal-title"
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
          width: 440, maxWidth: '92vw', maxHeight: '90vh', zIndex: 201,
          background: 'var(--bg-card)',
          border: '1px solid var(--rule)',
          borderRadius: 14,
          display: 'flex', flexDirection: 'column',
          boxShadow: '0 24px 64px rgba(0,0,0,0.75)',
        }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '22px 24px 0', flexShrink: 0 }}>
          <span id="edit-slide-modal-title" style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
            Edit Slide {index + 1}
          </span>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', fontSize: 17, lineHeight: 1, padding: 12, minWidth: 44, minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            &#10005;
          </button>
        </div>

        <div style={{ overflowY: 'auto', padding: '14px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {(['headline', 'body'] as const).map(key => {
            const max = key === 'headline' ? HEADLINE_MAX : BODY_MAX;
            const nearLimit = form[key].length >= max * 0.9;
            return (
              <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <label style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', letterSpacing: 1, textTransform: 'uppercase' }}>
                    {key === 'headline' ? 'Headline' : 'Body'}
                  </label>
                  <span style={{ fontSize: 9.5, fontFamily: 'var(--font-mono)', color: nearLimit ? 'var(--color-error)' : 'var(--text-muted)' }}>
                    {form[key].length}/{max}
                  </span>
                </div>
                {key === 'body'
                  ? <textarea
                      className="input"
                      value={form[key]}
                      onChange={e => setForm({ ...form, [key]: e.target.value })}
                      maxLength={max}
                      style={{ minHeight: 90, resize: 'vertical' }}
                    />
                  : <input
                      className="input"
                      value={form[key]}
                      onChange={e => setForm({ ...form, [key]: e.target.value })}
                      maxLength={max}
                    />
                }
              </div>
            );
          })}

          {/* F2: AI slide image — prompt + generate, stored as data URL on the slide */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <label style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', letterSpacing: 1, textTransform: 'uppercase' }}>
                Image prompt
              </label>
              <span style={{ fontSize: 9.5, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                {form.imagePrompt.length}/{PROMPT_MAX}
              </span>
            </div>
            <textarea
              className="input"
              value={form.imagePrompt}
              onChange={(e) => setForm({ ...form, imagePrompt: e.target.value })}
              maxLength={PROMPT_MAX}
              placeholder="Describe a background image for this slide…"
              style={{ minHeight: 64, resize: 'vertical' }}
            />
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <Button
                variant="secondary"
                size="sm"
                icon={generating ? <Loader2 size={12} style={{ animation: 'spin 0.8s linear infinite' }} /> : <ImagePlus size={12} />}
                onClick={() => { void handleGenerateImage(); }}
                disabled={generating || saving}
              >
                {generating ? 'Generating…' : 'Generate image'}
              </Button>
              {imageDataUrl && (
                <button
                  type="button"
                  onClick={() => setImageDataUrl(undefined)}
                  style={{
                    background: 'none', border: 'none', color: 'var(--text-muted)',
                    fontSize: 11, cursor: 'pointer', textDecoration: 'underline',
                  }}
                >
                  Remove image
                </button>
              )}
            </div>
            {imageDataUrl && (
              <img
                src={imageDataUrl}
                alt="Generated slide background preview"
                style={{
                  width: '100%', maxHeight: 160, objectFit: 'cover',
                  borderRadius: 8, border: '1px solid var(--rule)',
                }}
              />
            )}
          </div>

          {error && (
            <div style={{ fontSize: 11.5, color: 'var(--color-error)' }} role="alert">{error}</div>
          )}
        </div>

        <div style={{ display: 'flex', gap: 8, padding: '14px 24px 22px', flexShrink: 0 }}>
          <Button variant="primary" onClick={handleSave} disabled={saving || generating} loading={saving} style={{ flex: 1, justifyContent: 'center' }}>
            Save
          </Button>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
        </div>
      </div>
    </>
  );
}
