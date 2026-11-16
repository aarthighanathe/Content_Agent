import type { ReactElement } from 'react';
import { AlertTriangle, PenLine } from 'lucide-react';
import { revisionAttemptLabel } from '../lib/resultDerived';

interface Props {
  retryCount: number;
  // WHY: opens Rewrite drawer — "with feedback" means steer, not blind regen.
  onRewrite: () => void;
}

export function PartialDraftBanner({ retryCount, onRewrite }: Props): ReactElement {
  const { used, max } = revisionAttemptLabel(retryCount);

  return (
    <div
      className="rp-partial-banner"
      role="status"
      data-testid="partial-draft-banner"
    >
      <div className="rp-partial-banner-icon" aria-hidden="true">
        <AlertTriangle size={16} />
      </div>
      <div className="rp-partial-banner-body">
        <div className="rp-partial-banner-title-row">
          <strong className="rp-partial-banner-title">Partial draft</strong>
          <span className="rp-partial-banner-chip">
            {used} of {max} revision attempts
          </span>
        </div>
        <p className="rp-partial-banner-text">
          Quality stayed below the 70 approval threshold — this is the best draft
          from the revision loop.
        </p>
      </div>
      <button
        type="button"
        className="rp-partial-banner-cta"
        onClick={onRewrite}
      >
        <PenLine size={13} />
        Regenerate with feedback
      </button>
    </div>
  );
}
