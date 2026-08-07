import { useEffect, useRef } from 'react';
import { AlertTriangle } from 'lucide-react';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import { Button } from '../../components/Button';

interface DeleteAccountModalProps {
  confirmText: string;
  onConfirmTextChange: (v: string) => void;
  deleting: boolean;
  error: string;
  onConfirm: () => void;
  onClose: () => void;
}

export function DeleteAccountModal({
  confirmText,
  onConfirmTextChange,
  deleting,
  error,
  onConfirm,
  onClose,
}: DeleteAccountModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  // WHY: shared trap now backs this modal too — the input's existing autoFocus still
  // wins as the initial focus target since it's the first focusable element in the DOM.
  useFocusTrap(modalRef, true);

  const canConfirm = confirmText === 'DELETE' && !deleting;

  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200, padding: 16 }}
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-account-title"
        onClick={e => e.stopPropagation()}
        style={{ background: 'var(--bg-card)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 14, padding: 24, maxWidth: 420, width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <AlertTriangle size={18} color="var(--color-error)" />
          <h2 id="delete-account-title" style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            Delete your account?
          </h2>
        </div>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 16 }}>
          This permanently deletes all your content jobs, brand voice settings, and connected
          social accounts. This action cannot be undone.
        </p>
        <label style={{ display: 'block', fontSize: 11.5, color: 'var(--text-muted)', marginBottom: 7 }}>
          Type <strong style={{ color: 'var(--text-secondary)' }}>DELETE</strong> to confirm
        </label>
        <input
          autoFocus
          type="text"
          className="input"
          value={confirmText}
          onChange={e => onConfirmTextChange(e.target.value)}
          placeholder="DELETE"
          style={{ marginBottom: 14 }}
        />
        {error && <div style={{ fontSize: 11.5, color: 'var(--color-error)', marginBottom: 12 }}>{error}</div>}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button className="btn-secondary" onClick={onClose} disabled={deleting}>Cancel</button>
          <Button
            variant="danger"
            onClick={onConfirm}
            disabled={!canConfirm}
            loading={deleting}
          >
            Delete permanently
          </Button>
        </div>
      </div>
    </div>
  );
}
