import { pgEnum } from 'drizzle-orm/pg-core';

// WHY: extracted from schema.ts: that file exceeded the 400-line cap (CLAUDE.md).
// drizzle.config.ts still points at schema.ts, which re-exports these enums.

export const platformEnum = pgEnum('platform', [
  'instagram_carousel',
  'linkedin_post',
  'twitter_thread',
  'instagram_caption',
  'video_script',
]);

// WHY: these 9, matching schemas/jobs.ts's VALID_TONES exactly: this enum
// previously only had the original 5 values while VALID_TONES (the source of
// truth for createJobSchema, Create's ToneSelector, and Brand's VoiceCard) had
// grown to 9 — a job created with tone 'bold'/'playful'/'minimal'/'direct'
// passed request validation but then failed the Postgres insert with an
// enum-violation error, caught and logged by persistJobToDB's catch block
// with no user-facing surface (the job just never showed as done). Found
// while removing an `any` cast on jobResult in lib/persistJob.ts that had
// been masking the type mismatch between PipelineJob.tone (plain string) and
// this column's narrow literal union.
export const toneEnum = pgEnum('tone', [
  'professional',
  'casual',
  'witty',
  'educational',
  'inspirational',
  'bold',
  'playful',
  'minimal',
  'direct',
]);

export const jobStatusEnum = pgEnum('job_status', [
  'pending',
  'researching',
  'writing',
  'formatting',
  'critiquing',
  'done',
  'failed',
]);

// WHY: 'prediction' added 2026-08-04: PerformancePredictor's output was
// previously computed every job but discarded before the DB write (see
// persistJob.ts's old isDBOutputType guard) — the Dashboard "Surface
// PerformancePredictor output" feature needs it durably stored so stats can
// be aggregated across all of a user's jobs, not just the in-memory copy of
// whichever job is currently open. No real prod data exists yet, so this is
// a plain enum addition, not a backward-compatible migration concern.
export const outputTypeEnum = pgEnum('output_type', [
  'research',
  'draft',
  'critique',
  'final',
  'prediction',
]);

export const publishStatusEnum = pgEnum('publish_status', ['pending', 'publishing', 'posted', 'failed']);

