import axios from 'axios';
import type { ApiError } from '../types/api';

export interface SubmitError {
  message: string;
  retryable: boolean;
  retryAfterMs?: number;
}

function formatRetryAfter(ms: number): string {
  const minutes = Math.ceil(ms / 60000);
  if (minutes <= 1) return 'in about a minute';
  if (minutes < 60) return `in about ${minutes} minutes`;
  const hours = Math.ceil(minutes / 60);
  return `in about ${hours} hour${hours > 1 ? 's' : ''}`;
}

// WHY: this exists: the server already returns { error, code, retryable, retryAfterMs }
// per CLAUDE.md's error-shape convention, but callers used to read only `.error` (or a
// hardcoded generic string), so a rate limit and a validation failure rendered as the
// same generic banner with the same generic "try again" advice. This maps `code` to copy
// that tells the user what to actually do next, and `retryable` to whether the triggering
// action should stay usable. Originally lived in pages/Create/errorMessages.ts (still
// re-exported from there for Create's own call sites) — moved here so other generation-
// adjacent flows (Ideate, etc.) share the same mapping instead of hand-rolling their own.
export function getSubmitError(err: unknown, fallback = 'Something went wrong. Please try again.'): SubmitError {
  if (axios.isAxiosError<Partial<ApiError> & { retryAfterMs?: number }>(err)) {
    const data = err.response?.data;
    const code = data?.code;
    const retryable = data?.retryable ?? true;

    if (code === 'RATE_LIMITED') {
      const when = typeof data?.retryAfterMs === 'number' ? ` Try again ${formatRetryAfter(data.retryAfterMs)}.` : '';
      return { message: `${data?.error || 'Rate limit reached.'}${when}`, retryable: false, retryAfterMs: data?.retryAfterMs };
    }
    // WHY: distinct from RATE_LIMITED: imageGen concurrency gate (max 2) —
    // retryable immediately once a slot frees, not a timed quota.
    if (code === 'IMAGE_GEN_BUSY') {
      return {
        message: data?.error || 'Image generation is busy — please retry shortly.',
        retryable: true,
      };
    }
    // WHY: process-wide carousel ZIP export semaphore (max 2) — same class as
    // IMAGE_GEN_BUSY; not a timed rate limit.
    if (code === 'EXPORT_BUSY') {
      return {
        message: data?.error || 'Export is busy — please retry shortly.',
        retryable: true,
      };
    }
    // WHY: 409 when regenerate/multiply/edit hits an in-flight job — UI must
    // show this instead of swallowing the catch (Result regenerate used to).
    if (code === 'JOB_IN_PROGRESS') {
      return {
        message: data?.error || 'This job is still generating — wait for it to finish.',
        retryable: true,
      };
    }
    if (code === 'VALIDATION_ERROR') {
      return { message: data?.error || fallback, retryable: true };
    }
    if (data?.error) {
      return { message: data.error, retryable };
    }
  }
  return { message: fallback, retryable: true };
}
