import { useRef, useState } from 'react';
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
 * NOTE: the shell renders no platform-specific styles; colours/borders stay on the
 * parent wrapper in each *Content.tsx file.
 */
export function ContentEditShell({ label, onClose, onSave, children }: ContentEditShellProps) {
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState('');
  // WHY: sync gate — disabled={saving} only flips after re-render; a second click
  // could hit content_mutation_busy before the first await completed.
  const savingRef = useRef(false);

  // WHY: the try/catch lives here, not in the 3 callers: a rejected save must keep the
  // form open with an inline error and a pending state, and doing it once covers
  // every platform.
  async function handleSave() {
    if (savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    setError('');
    try {
      await onSave();
      onClose();
    } catch {
      setError('Failed to save — please try again.');
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  return (
    <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Header row: label + close button */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--rule)', paddingBottom: 12, marginBottom: 4 }}>
        <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 14 }}>{label}</span>
        <button
          onClick={onClose}
          disabled={saving}
          style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: saving ? 'default' : 'pointer', display: 'flex', alignItems: 'center' }}
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
