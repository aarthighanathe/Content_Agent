import { z } from 'zod';
import { jobIdSchema } from './scheduledPosts.js';

export const createCollectionSchema = z.object({
  name: z.string().min(1, 'Name cannot be empty').max(60, 'Name must be 60 characters or fewer').trim(),
});

export const addJobToCollectionSchema = z.object({
  jobId: jobIdSchema,
});
