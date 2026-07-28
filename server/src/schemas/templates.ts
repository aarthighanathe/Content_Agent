import { z } from 'zod';

export const createTemplateSchema = z.object({
  name: z.string().trim().min(1, 'name is required').max(100),
  platform: z.string().min(1, 'platform is required').max(50),
  topic: z.string().max(500).optional(),
  hookStyle: z.string().max(500).optional(),
  structure: z.string().max(1000).optional(),
  ctaPattern: z.string().max(500).optional(),
  contentSample: z.string().max(5000).nullable().optional(),
});

export const renameTemplateSchema = z.object({
  name: z.string().trim().min(1, 'name is required').max(100),
});
