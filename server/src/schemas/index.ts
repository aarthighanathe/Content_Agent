import { Response } from 'express';
import { z } from 'zod';

/**
 * Parse and validate req.body against a zod schema.
 * On failure, sends a 400 JSON response with flattened error details and
 * returns null — the caller must check for null and return immediately.
 */
export function parseBody<T extends z.ZodTypeAny>(
  schema: T,
  body: unknown,
  res: Response,
): z.infer<T> | null {
  const result = schema.safeParse(body);
  if (!result.success) {
    res.status(400).json({
      error: 'Invalid request body',
      code: 'VALIDATION_ERROR',
      retryable: false,
      details: result.error.flatten(),
    });
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
