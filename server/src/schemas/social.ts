import { z } from 'zod';

export const postSocialSchema = z.object({
  platform: z.enum(['linkedin', 'twitter']),
  content: z.record(z.string(), z.unknown()).or(z.array(z.record(z.string(), z.unknown()))).or(z.string()),
  jobId: z.string().uuid().optional(),
});

export const scheduleSocialSchema = z.object({
  platform: z.enum(['linkedin', 'twitter']),
  content: z.record(z.string(), z.unknown()).or(z.array(z.record(z.string(), z.unknown()))).or(z.string()),
  jobId: z.string().uuid().optional(),
  scheduledAt: z.string().datetime({ message: 'scheduledAt must be an ISO 8601 datetime string' }),
});
