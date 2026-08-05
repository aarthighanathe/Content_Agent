import { useEffect, useRef, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { useFocusTrap } from '../hooks/useFocusTrap';

interface TypedConfirmation {
  /** The exact string the user must type to enable the confirm button (e.g. "DELETE"). */
  requiredText: string;
  /** Label shown above the confirmation input. Defaults to `Type "<requiredText>" to confirm`. */
  label?: string;
}

interface ConfirmDeleteModalProps {
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  /** Shown on the confirm button when not pending. Defaults to "Delete". */
  confirmLabel?: string;
  /** Shown on the confirm button while `isPending` is true. Defaults to "Deleting…". */
  pendingLabel?: string;
  isPending?: boolean;
  /** Inline error surfaced below the message (e.g. a failed delete). */
  error?: string;
  /** Opt-in exact-text confirmation gate (Brand's account-delete needs this; job/template deletes don't). */
  typedConfirmation?: TypedConfirmation;
}

// WHY this exists: Dashboard/DeleteJobModal.tsx and Library/DeleteJobModal.tsx were
// near-identical copies, both missing role="dialog"/aria-modal/focus-trap/Escape that
// Brand/DeleteAccountModal.tsx already gets right. This consolidates the correct
// behavior into one component instead of fixing (and maintaining) it twice.
export function ConfirmDeleteModal({
  title,
  message,
  onConfirm,
  onCancel,
  confirmLabel = 'Delete',
  pendingLabel = 'Deleting…',
  isPending = false,
  error = '',
  typedConfirmation,
}: ConfirmDeleteModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const titleId = 'confirm-delete-title';
  const messageId = 'confirm-delete-message';
  const errorId = 'confirm-delete-error';
  const [typedText, setTypedText] = useState('');

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && !isPending) onCancel();
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onCancel, isPending]);

  useFocusTrap(modalRef, true);

  const canConfirm = !isPending && (!typedConfirmation || typedText === typedConfirmation.requiredText);

  return (
    <div
      onClick={() => { if (!isPending) onCancel(); }}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.78)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, backdropFilter: 'blur(6px)', padding: '0 1rem' }}
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={messageId}
        onClick={(e) => e.stopPropagation()}
        className="card-glow animate-scale-in"
        style={{ maxWidth: 400, width: '100%' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <AlertTriangle size={18} color="var(--color-error)" />
          <h3 id={titleId} style={{ fontFamily: 'var(--font-heading)', fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            {title}
          </h3>
        </div>
        <p id={messageId} style={{ fontSize: 12.5, color: 'var(--text-secondary)', marginBottom: typedConfirmation ? 16 : '1.5rem', lineHeight: 1.6 }}>
          {message}
        </p>

        {typedConfirmation && (
          <>
            <label style={{ display: 'block', fontSize: 11.5, color: 'var(--text-secondary)', marginBottom: 7 }}>
              {typedConfirmation.label ?? (
                <>Type <strong style={{ color: 'var(--text-primary)' }}>{typedConfirmation.requiredText}</strong> to confirm</>
              )}
            </label>
            <input
              autoFocus
              type="text"
              className="input"
              value={typedText}
              onChange={(e) => setTypedText(e.target.value)}
              placeholder={typedConfirmation.requiredText}
              disabled={isPending}
              style={{ marginBottom: 14 }}
            />
          </>
        )}

        {error && <p id={errorId} role="alert" style={{ fontSize: 12.5, color: 'var(--color-error)', marginBottom: '1rem' }}>{error}</p>}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
          <button className="btn-secondary" onClick={onCancel} disabled={isPending}>Cancel</button>
          <button
            className="btn-primary"
            style={{ background: 'linear-gradient(135deg,var(--color-error),var(--color-error))', boxShadow: '0 4px 18px rgba(239,68,68,0.32)' }}
            onClick={onConfirm}
            disabled={!canConfirm}
          >
            {isPending ? pendingLabel : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
