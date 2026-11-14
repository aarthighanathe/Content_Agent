import { z } from 'zod';
import { jobIdSchema } from './scheduledPosts.js';
import { CONTENT_PAYLOAD_MAX_BYTES } from './jobs.js';

// SECURITY: same JSON size cap as patchContentSchema — social post content is
// forwarded to LinkedIn/Twitter APIs; unbounded payloads waste bandwidth and
// can OOM the request path before the provider rejects them.
export const postSocialSchema = z
  .object({
    platform: z.enum(['linkedin', 'twitter']),
    content: z
      .record(z.string(), z.unknown())
      .or(z.array(z.record(z.string(), z.unknown())))
      .or(z.string()),
    // WHY: jobIdSchema (loose UUID regex), not z.string().uuid(): matches
    // lib/uuid.ts / the rest of the app rather than zod's stricter RFC 4122 check.
    jobId: jobIdSchema.optional(),
  })
  .superRefine((data, ctx) => {
    let serialized: string;
    try {
      serialized = JSON.stringify(data.content);
    } catch {
      ctx.addIssue({
        code: 'custom',
        message: 'content could not be serialized for size check',
        path: ['content'],
      });
      return;
    }
    if (serialized.length > CONTENT_PAYLOAD_MAX_BYTES) {
      ctx.addIssue({
        code: 'custom',
        message:
          `content exceeds maximum size of ${CONTENT_PAYLOAD_MAX_BYTES} bytes ` +
          `(got ${serialized.length})`,
        path: ['content'],
      });
    }
  });
