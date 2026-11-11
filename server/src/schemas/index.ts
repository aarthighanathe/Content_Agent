import { Response } from 'express';
import { z } from 'zod';
import { env } from '../config.js';

/**
 * Parse and validate req.body against a zod schema.
 * On failure, sends a 400 JSON response and returns null — the caller must
 * check for null and return immediately.
 */
export function parseBody<T extends z.ZodTypeAny>(
  schema: T,
  body: unknown,
  res: Response,
): z.infer<T> | null {
  const result = schema.safeParse(body);
  if (!result.success) {
    // WHY first issue.message as `error`: zod messages on our schemas are
    // deliberately user-facing ("Topic must be at least 3 characters") — surfacing
    // them beats a opaque "Invalid request body" (QA-A3-003). Still gate flatten()
    // details in production so field paths / received values don't leak.
    const firstIssue = result.error.issues[0];
    const userMessage =
      typeof firstIssue?.message === 'string' && firstIssue.message.length > 0
        ? firstIssue.message
        : 'Invalid request body';
    const payload: {
      error: string;
      code: string;
      retryable: boolean;
      details?: unknown;
    } = {
      error: userMessage,
      code: 'VALIDATION_ERROR',
      retryable: false,
    };
    if (env.NODE_ENV !== 'production') {
      payload.details = result.error.flatten();
    }
    res.status(400).json(payload);
    return null;
  }
  return result.data;
}

export * from './jobs.js';
export * from './content.js';
export * from './users.js';
export * from './social.js';
export * from './imageGen.js';
export * from './agentResponses.js';
export * from './contentResponses.js';
export * from './scheduledPosts.js';
export * from './collections.js';
