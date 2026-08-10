import { getSubmitError as sharedGetSubmitError } from '../../lib/errorMessages';
import type { SubmitError } from '../../lib/errorMessages';

export type { SubmitError };

// WHY a thin wrapper, not a direct re-export: preserves this page's original fallback
// copy ("Failed to start generation…") without every other caller of the shared
// lib/errorMessages.ts helper needing to know about it — see that file's own WHY
// comment for the extraction history (this used to be the only implementation).
export function getSubmitError(err: unknown): SubmitError {
  return sharedGetSubmitError(err, 'Failed to start generation. Please try again.');
}
