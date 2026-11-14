import { AlertTriangle } from 'lucide-react';

interface ErrorStateProps {
  /** Optional heading above the message (e.g. "Generation failed"). Omitted by default. */
  title?: string;
  message?: string;
  /** Label for the retry button. Defaults to "Retry". Omitted with onRetry when no retry. */
  retryLabel?: string;
  onRetry?: () => void;
}

/**
 * Shared fetch/generation failure card (Dashboard, Library, Calendar, Result).
 * WHY: without a visible error + retry, failed queries left users on a blank/loading screen.
 */
export function ErrorState({ title, message = 'Something went wrong while loading this data.', retryLabel = 'Retry', onRetry }: ErrorStateProps) {
  return (
    <div
      className="card"
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: 'clamp(2rem,6vw,3rem) 1.5rem', textAlign: 'center', gap: 10,
        border: '1px solid rgba(239,68,68,0.22)', background: 'rgba(239,68,68,0.03)',
      }}
    >
      <div
        style={{
          width: 44, height: 44, borderRadius: 12, background: 'rgba(239,68,68,0.1)',
          border: '1px solid rgba(239,68,68,0.25)', display: 'flex', alignItems: 'center',
          justifyContent: 'center', color: 'var(--color-error)',
        }}
      >
        <AlertTriangle size={20} />
      </div>
      {title && (
        <h3 style={{ fontFamily: "var(--font-heading)", fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-text-primary)', margin: 0 }}>
          {title}
        </h3>
      )}
      <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0, maxWidth: 340, lineHeight: 1.6 }}>
        {message}
      </p>
      {onRetry && (
        <button className="btn-secondary" onClick={onRetry} style={{ marginTop: 4 }}>
          {retryLabel}
        </button>
      )}
    </div>
  );
}
