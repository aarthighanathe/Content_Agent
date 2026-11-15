import type { ReactElement } from 'react';
import { RefreshCw, Sparkles } from 'lucide-react';

interface Props {
  resetConfirming: boolean;
  onCancelReset: () => void;
  onReset: () => void;
  onSave: () => void;
  savePending: boolean;
  saveDisabled: boolean;
  saveTitle: string | undefined;
  saveError: string;
}

export function BrandSaveBar({
  resetConfirming,
  onCancelReset,
  onReset,
  onSave,
  savePending,
  saveDisabled,
  saveTitle,
  saveError,
}: Props): ReactElement {
  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 11, flexWrap: 'wrap' }}>
        {resetConfirming ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Discard unsaved edits?</span>
            <button
              type="button"
              className="btn-secondary"
              onClick={onCancelReset}
              disabled={savePending}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onReset}
              disabled={savePending}
              style={{
                background: 'color-mix(in srgb, var(--color-error) 10%, transparent)',
                border: '1px solid color-mix(in srgb, var(--color-error) 30%, transparent)',
                color: 'var(--color-error)', borderRadius: 8, padding: '9px 16px',
                // WHY: disabled while savePending — Reset mid-save raced and
                // overwrote in-flight edits with a refetch of the old profile.
                cursor: savePending ? 'not-allowed' : 'pointer',
                fontSize: 12.5, fontWeight: 600,
                opacity: savePending ? 0.55 : 1,
              }}
            >
              Yes, reset
            </button>
          </div>
        ) : (
          <button
            type="button"
            className="btn-secondary"
            onClick={onReset}
            disabled={savePending}
            title={savePending ? 'Wait for save to finish' : undefined}
            style={{ display: 'flex', alignItems: 'center', gap: 7 }}
          >
            <RefreshCw size={13} /> Reset
          </button>
        )}
        <button
          className="btn-primary"
          onClick={onSave}
          // WHY: also gate on hydration: Save used to be enabled while the
          // profile was still loading, so a click wrote the blank default form
          // over the real brand. Disable until the first successful hydrate.
          disabled={saveDisabled}
          title={saveTitle}
        >
          {savePending ? (
            <>
              <div style={{
                width: 16, height: 16,
                border: '2px solid color-mix(in srgb, var(--on-accent) 20%, transparent)',
                borderTopColor: 'var(--on-accent)', borderRadius: '50%',
                animation: 'spin 1s linear infinite',
              }}
              />
              Saving...
            </>
          ) : (
            <><Sparkles size={14} /> Save brand settings</>
          )}
        </button>
      </div>

      {saveError && (
        <div role="alert" style={{ fontSize: 11.5, color: 'var(--color-error)', textAlign: 'right' }}>
          {saveError}
        </div>
      )}
    </>
  );
}
