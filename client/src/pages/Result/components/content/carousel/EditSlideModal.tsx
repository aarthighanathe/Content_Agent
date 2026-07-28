import { useState, useEffect, useRef } from 'react';
import type { SlideData } from './IGSlide';
import { useFocusTrap } from '../../../../../hooks/useFocusTrap';
import { Button } from '../../../../../components/Button';

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

export function EditSlideModal({ slide, index, onSave, onClose }: Props) {
  const [form,   setForm]   = useState({ headline: slide.headline || '', body: slide.body || '' });
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState('');
  const modalRef = useRef<HTMLDivElement>(null);

  // WHY try/catch/finally: onSave (→ Result.tsx's handleContentSave) rethrows on
  // failure so callers can react — previously nothing here caught it, so a failed
  // save left `saving` stuck true forever (the Save button showed a permanent
  // spinner) with the modal never closing and no error shown
  // (FUNCTIONAL_AUDIT_2026-07.md finding #12).
  async function handleSave() {
    setSaving(true);
    setError('');
    try {
      await onSave({ ...slide, ...form });
      onClose();
    } catch {
      setError('Failed to save — please try again.');
    } finally {
      setSaving(false);
    }
  }

  // SECURITY/ACCESSIBILITY: Escape-to-close, cleaned up on unmount.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent): void {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  useFocusTrap(modalRef, true);

  return (
    <>
      <div
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 200, backdropFilter: 'blur(4px)' }}
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
          width: 440, maxWidth: '92vw', zIndex: 201,
          background: '#131320',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 14, padding: '22px 24px',
          display: 'flex', flexDirection: 'column', gap: 14,
          boxShadow: '0 24px 64px rgba(0,0,0,0.75)',
        }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span id="edit-slide-modal-title" style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.85)' }}>
            Edit Slide {index + 1}
          </span>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', fontSize: 17, lineHeight: 1, padding: '2px 4px' }}
          >
            &#10005;
          </button>
        </div>

        {(['headline', 'body'] as const).map(key => {
          const max = key === 'headline' ? HEADLINE_MAX : BODY_MAX;
          const nearLimit = form[key].length >= max * 0.9;
          return (
            <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <label style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', fontFamily: "var(--font-mono)", letterSpacing: 1, textTransform: 'uppercase' }}>
                  {key === 'headline' ? 'Headline' : 'Body'}
                </label>
                <span style={{ fontSize: 9.5, fontFamily: "var(--font-mono)", color: nearLimit ? 'var(--color-error)' : 'rgba(255,255,255,0.2)' }}>
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

        {error && (
          <div style={{ fontSize: 11.5, color: 'var(--color-error)' }} role="alert">{error}</div>
        )}

        <div style={{ display: 'flex', gap: 8 }}>
          <Button variant="primary" onClick={handleSave} disabled={saving} loading={saving} style={{ flex: 1, justifyContent: 'center' }}>
            Save
          </Button>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
        </div>
      </div>
    </>
  );
}
