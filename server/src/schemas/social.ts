import { z } from 'zod';

export const postSocialSchema = z.object({
  platform: z.enum(['linkedin', 'twitter']),
  content: z.record(z.string(), z.unknown()).or(z.array(z.record(z.string(), z.unknown()))).or(z.string()),
  jobId: z.string().uuid().optional(),
});
