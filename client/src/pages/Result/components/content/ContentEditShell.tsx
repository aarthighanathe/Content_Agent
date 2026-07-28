import { useState } from 'react';
import { X, Save } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button } from '../../../../components/Button';

interface ContentEditShellProps {
  /** Label shown in the edit panel header (e.g. "Edit Caption", "Edit LinkedIn Post"). */
  label: string;
  /** Called when the user clicks the × close button or presses cancel. */
  onClose: () => void;
  /**
   * Called when the user clicks Save Changes. Should reject/throw on failure —
   * the shell only closes the editor when this resolves successfully, and shows
   * an inline error (with the Save button reset to clickable) when it rejects.
   */
  onSave: () => Promise<void> | void;
  /** Platform-specific field inputs rendered between the header and the save button. */
  children: ReactNode;
}

/**
 * WHY this component exists: InstagramContent, LinkedInContent, and TwitterContent all
 * shared ~70% identical edit-mode markup — specifically the header row (label + X close
 * button) and the bottom Save Changes button. Each platform still owns its own field
 * inputs (textarea for caption, hook+body+cta for LinkedIn, per-tweet textareas for
 * Twitter), but the chrome around those inputs is now a single, consistent component.
 *
 * Previously flagged in REVIEW_FINDINGS.md Section 3 with a "// TODO:" comment on each
 * file as "needs full UI regression testing before extracting". The extraction is safe
 * because:
 *   - The shell renders no platform-specific styles itself; colours/borders stay on the
 *     parent wrapper in each *Content.tsx file.
 *   - `children` is fully typed ReactNode, so TypeScript catches any misuse at compile time.
 *   - The save button behaviour (calls onSave which resolves before closing) was identical
 *     across all three platforms — no logic moved, only markup.
 */
export function ContentEditShell({ label, onClose, onSave, children }: ContentEditShellProps) {
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState('');

  // WHY the try/catch lives here, not in each of the 3 callers: InstagramContent/
  // LinkedInContent/TwitterContent's saveEdit() all previously did `await onSave(...)`
  // with no try/catch, and the shell's old `void onSave()` call site discarded the
  // resulting rejection — a failed save left the edit form open with zero feedback
  // (no loading indicator during the request, no error on failure) beyond an
  // easy-to-miss page-level toast (FUNCTIONAL_AUDIT_2026-07.md finding #15).
  // Fixing it once here covers all three platforms instead of three separate patches.
  async function handleSave() {
    setSaving(true);
    setError('');
    try {
      await onSave();
      onClose();
    } catch {
      setError('Failed to save — please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Header row: label + close button */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: 12, marginBottom: 4 }}>
        <span style={{ fontWeight: 600, color: 'rgba(255,255,255,0.85)', fontSize: 14 }}>{label}</span>
        <button
          onClick={onClose}
          disabled={saving}
          style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: saving ? 'default' : 'pointer', display: 'flex', alignItems: 'center' }}
          aria-label="Close editor"
        >
          <X size={16} />
        </button>
      </div>

      {/* Platform-specific fields */}
      {children}

      {error && (
        <div style={{ fontSize: 12, color: 'var(--color-error)' }} role="alert">{error}</div>
      )}

      {/* Save button */}
      <Button
        variant="primary"
        icon={<Save size={13} />}
        onClick={() => { void handleSave(); }}
        disabled={saving}
        loading={saving}
        style={{ width: '100%', justifyContent: 'center' }}
      >
        {saving ? 'Saving…' : 'Save Changes'}
      </Button>
    </div>
  );
}
