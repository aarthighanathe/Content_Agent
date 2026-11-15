// WHY: shared Calendar conflict helpers — keep scheduledPosts.ts under the
// 400-line cap and reuse the same 409 shape from DELETE and POST upsert.
import { Response } from 'express';
import {
  PARTIAL_THREAD_ERROR_PREFIX,
  POSTED_UNVERIFIED_ERROR_PREFIX,
} from './clientErrors.js';

export function sendPublishConflict(res: Response, error: string, code: string): void {
  res.status(409).json({ error, code, retryable: false });
}

export function isPartialThreadPosted(
  publishStatus: string | null | undefined,
  publishError: string | null | undefined,
): boolean {
  return publishStatus === 'posted'
    && Boolean(publishError?.startsWith(PARTIAL_THREAD_ERROR_PREFIX));
}

export function isPostedUnverified(publishError: string | null | undefined): boolean {
  return Boolean(publishError?.startsWith(POSTED_UNVERIFIED_ERROR_PREFIX));
}

// WHY: exclusive next-month bound for YYYY-MM list queries (see scheduledPosts GET).
export function firstDayOfNextMonth(month: string): string {
  const [year, mon] = month.split('-').map(Number);
  const next = new Date(Date.UTC(year, mon, 1));
  const yyyy = next.getUTCFullYear();
  const mm = String(next.getUTCMonth() + 1).padStart(2, '0');
  return `${yyyy}-${mm}-01`;
}

export function currentUtcMonth(): string {
  const now = new Date();
  const yyyy = now.getUTCFullYear();
  const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
  return `${yyyy}-${mm}`;
}
