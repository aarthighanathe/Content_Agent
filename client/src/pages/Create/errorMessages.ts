import axios from 'axios';
import type { ApiError } from '../../types/api';

export interface SubmitError {
  message: string;
  retryable: boolean;
}

function formatRetryAfter(ms: number): string {
  const minutes = Math.ceil(ms / 60000);
  if (minutes <= 1) return 'in about a minute';
  if (minutes < 60) return `in about ${minutes} minutes`;
  const hours = Math.ceil(minutes / 60);
  return `in about ${hours} hour${hours > 1 ? 's' : ''}`;
}

// WHY this exists: the server already returns { error, code, retryable, retryAfterMs }
// per CLAUDE.md's error-shape convention, but the client used to read only `.error`,
// so a rate limit and a validation failure rendered as the same generic banner with
// the same generic "try again" advice. This maps `code` to copy that tells the user
// what to actually do next, and `retryable` to whether Generate should stay usable.
export function getSubmitError(err: unknown): SubmitError {
  if (axios.isAxiosError<Partial<ApiError> & { retryAfterMs?: number }>(err)) {
    const data = err.response?.data;
    const code = data?.code;
    const retryable = data?.retryable ?? true;

    if (code === 'RATE_LIMITED') {
      const when = typeof data?.retryAfterMs === 'number' ? ` Try again ${formatRetryAfter(data.retryAfterMs)}.` : '';
      return { message: `${data?.error || 'Rate limit reached.'}${when}`, retryable: false };
    }
    if (code === 'VALIDATION_ERROR') {
      return { message: data?.error || 'Please check your topic and try again.', retryable: true };
    }
    if (data?.error) {
      return { message: data.error, retryable };
    }
  }
  return { message: 'Failed to start generation. Please try again.', retryable: true };
}
