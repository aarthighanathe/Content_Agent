import { z } from 'zod';

export const imageGenSchema = z.object({
  prompt: z.string().trim().min(1, 'prompt is required').max(2000),
  mode: z.enum(['full_slide', 'background']).optional(),
});
